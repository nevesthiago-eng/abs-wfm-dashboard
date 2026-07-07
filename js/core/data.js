/* ============================================================
   core/data.js — Busca e Processamento de Dados
   Responsável por buscar dados do Google Sheets e transformar
   as linhas brutas em objetos estruturados (rawData).
   Depende de: state.js, utils.js, filters.js
   ============================================================ */

// ─── UI HELPERS DE LOADING / ERRO ───

function showLoading(show) {
    document.getElementById('loading-indicator').style.display = show ? 'block' : 'none';
    document.getElementById('error-container').innerHTML = '';
    if (!show) {
        document.getElementById('refresh-btn').disabled = false;
        document.getElementById('refresh-btn').innerHTML = '<i class="fas fa-sync-alt"></i> Atualizar';
    }
}

function showError(msg) {
    document.getElementById('error-container').innerHTML =
        '<div class="error-box"><i class="fas fa-exclamation-triangle"></i> ' + msg +
        '<br><button class="btn btn-sm btn-outline-danger mt-2" onclick="handleLogout()">Tentar novamente</button></div>';
    showLoading(false);
    document.getElementById('kpi-row').style.display = 'none';
    document.getElementById('analytics-section').style.display = 'none';
}

function showWarning(msg) {
    document.getElementById('error-container').innerHTML =
        '<div class="error-box" style="background:var(--warning-light);color:var(--warning);border-left-color:var(--warning);"><i class="fas fa-info-circle"></i> ' + msg + '</div>';
    showLoading(false);
    document.getElementById('kpi-row').style.display = 'none';
    document.getElementById('analytics-section').style.display = 'none';
}

function showDashboard() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('dashboard-screen').style.display = 'block';
    document.getElementById('status-text').textContent = 'Conectado';
    document.getElementById('status-dot').className = 'dot connected';
    populateSpreadsheets();
}

// ─── SELETOR DE PLANILHAS (MÊS) ───

function populateSpreadsheets() {
    const list = CONFIG.spreadsheets;
    if (!list || !Array.isArray(list) || list.length === 0) {
        showWarning('Nenhuma planilha configurada em CONFIG.spreadsheets.');
        return;
    }

    const sel = document.getElementById('filter-mes');
    if (sel) {
        sel.innerHTML = '';
        list.forEach((sp) => {
            const opt = document.createElement('option');
            opt.value = sp.id;
            opt.textContent = sp.nome;
            sel.appendChild(opt);
        });
        sel.selectedIndex = 0;
    }

    currentSpreadsheetId = list[0].id;
    fetchSheetData();
}

// ─── BOTÃO ATUALIZAR ───

function refreshData() {
    if (!accessToken) {
        handleLogout();
        return;
    }
    document.getElementById('refresh-btn').disabled = true;
    document.getElementById('refresh-btn').innerHTML = '<i class="fas fa-spinner fa-spin"></i> Atualizando...';
    fetchSheetData();
}

// ─── BUSCA DADOS DO GOOGLE SHEETS ───

async function fetchSheetData() {
    showLoading(true);
    try {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${currentSpreadsheetId}/values/${CONFIG.sheetName}`;
        const response = await fetch(url, {
            headers: { Authorization: 'Bearer ' + accessToken }
        });

        if (!response.ok) {
            // Descobre o nome amigável da planilha para a mensagem de erro
            const sheetConfig = (CONFIG.spreadsheets || []).find(s => s.id === currentSpreadsheetId);
            const sheetNome = sheetConfig ? `"${sheetConfig.nome}"` : 'selecionada';

            if (response.status === 403) {
                // Sem permissão — mensagem estruturada com orientações passo a passo
                document.getElementById('error-container').innerHTML = `
                    <div class="error-box error-box--permission">
                        <div class="error-permission-title">
                            <i class="fas fa-lock"></i>
                            Sem acesso à planilha ${sheetNome}
                        </div>
                        <div class="error-permission-steps">
                            Seu e-mail não tem permissão de leitura nesta planilha.
                            Peça ao administrador para:
                            <ol>
                                <li>Abrir a planilha <strong>${sheetNome}</strong> no Google Sheets</li>
                                <li>Clicar em <strong>Compartilhar</strong> (botão verde no canto superior direito)</li>
                                <li>Adicionar o seu e-mail com a função <strong>Leitor</strong></li>
                            </ol>
                        </div>
                        <button class="btn btn-sm btn-warning mt-1" onclick="handleLogout()" style="background:#F59E0B;border:none;color:#fff;font-weight:600;">
                            <i class="fas fa-sign-out-alt"></i> Voltar ao login
                        </button>
                    </div>`;
                showLoading(false);
                document.getElementById('kpi-row').style.display = 'none';
                document.getElementById('analytics-section').style.display = 'none';
                return;
            }

            if (response.status === 401) {
                // Token expirado — força re-login silencioso
                console.warn('Token expirado. Redirecionando para re-autenticação.');
                handleLogout();
                return;
            }

            const err = await response.json().catch(() => ({}));
            throw new Error(err.error?.message || `Erro na requisição (HTTP ${response.status})`);
        }

        const data = await response.json();
        if (!data.values || data.values.length < 2) {
            showWarning('Planilha vazia ou sem dados suficientes para exibir.');
            return;
        }

        processRawData(data.values);
    } catch (err) {
        showError('Erro inesperado ao buscar dados: ' + err.message);
        console.error('[data.js] fetchSheetData error:', err);
    }
}

// ─── PROCESSAMENTO DOS DADOS ───

function processRawData(rows) {
    const headers = rows[0].map(h => String(h).trim());
    const dataRows = rows.slice(1);

    const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

    const colMap = {};
    const colBusca = [
        'Nome do agente', 'UG', 'Data Relatório', 'Tipo',
        'Horário Escalado', 'Horário Real',
        'Horário Saída Escalado', 'Horário Saída Real',
        'Nome Supervisor'
    ];

    colBusca.forEach(col => {
        const idx = headers.findIndex(h => norm(h) === norm(col));
        if (idx !== -1) colMap[col] = idx;
    });

    if (!colMap['Nome do agente']) {
        showError('Estrutura da planilha inválida: coluna "Nome do agente" não encontrada. Verifique se a aba correta está configurada em CONFIG.sheetName.');
        return;
    }

    rawData = dataRows.map(row => {
        const obj = {};
        Object.keys(colMap).forEach(key => {
            obj[key] = (row[colMap[key]] || '').toString().trim();
        });
        return obj;
    }).filter(r => r['Nome do agente'] && r['Nome do agente'].length > 0);

    if (rawData.length === 0) {
        showWarning('Nenhum agente encontrado na planilha.');
        return;
    }

    populateFilters();
    applyFilters();
    renderAnalyticsTables();
}
