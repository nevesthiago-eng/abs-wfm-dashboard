/* ============================================================
   ABS WFM Dashboard — Lógica Principal
   ============================================================ */

// ─── ESTADO GLOBAL ───
let tokenClient = null;
let accessToken = null;
let rawData = [];
let filteredData = [];
let chartPizza = null;
let chartBarras = null;
let dataTable = null;
let currentUser = null;

// ─── FALLBACK SE BIBLIOTECA GOOGLE NÃO CARREGAR ───
function gsiLoadError() {
    document.getElementById('login-status').innerHTML =
        '<span style="color:#d93025;"><i class="fas fa-exclamation-circle"></i> ' +
        'A biblioteca de login do Google não pôde ser carregada. ' +
        'Verifique sua conexão com a internet.</span>';
}

// ─── INICIALIZAÇÃO ───
function init() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CONFIG.clientId,
        scope: CONFIG.scope,
        callback: handleTokenResponse,
        error_callback: (err) => {
            showError('Erro na autenticação: ' + (err.message || err.type || 'desconhecido'));
        },
    });

    // Renderiza botão do Google
    document.getElementById('google-btn-wrapper').innerHTML = `
        <button id="login-btn-google" onclick="handleLogin()">
            <svg width="20" height="20" viewBox="0 0 48 48">
                <path fill="#4285F4" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#34A853" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.54 28.59A14.5 14.5 0 0 1 9.5 24c0-1.59.28-3.14.76-4.59l-7.98-6.19A23.99 23.99 0 0 0 0 24c0 3.77.87 7.35 2.56 10.78l7.98-6.19z"/>
                <path fill="#EA4335" d="M24 48c6.48 0 11.91-2.14 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Entrar com Google
        </button>
    `;
}

// ─── LOGIN ───
function handleLogin() {
    document.getElementById('login-status').textContent = '⏳ Abrindo janela de autenticação...';
    tokenClient.requestAccessToken();
}

function handleTokenResponse(response) {
    if (response.error) {
        showLoginError('Erro: ' + response.error + '. ' + (response.error_description || ''));
        return;
    }
    accessToken = response.access_token;

    fetchUserInfo().then(() => {
        showDashboard();
        fetchSheetData();
    }).catch(() => {
        showDashboard();
        fetchSheetData();
    });
}

async function fetchUserInfo() {
    try {
        const resp = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: 'Bearer ' + accessToken }
        });
        if (resp.ok) {
            const info = await resp.json();
            currentUser = info;
            document.getElementById('user-avatar').src = info.picture;
            document.getElementById('user-name').textContent = info.name || info.email;
            document.getElementById('user-info').style.display = 'flex';
            document.getElementById('logout-btn').style.display = 'inline-block';
        }
    } catch (e) {
        // não crítico
    }
}

function handleLogout() {
    if (accessToken) {
        google.accounts.oauth2.revoke(accessToken, () => {});
    }
    accessToken = null;
    currentUser = null;
    rawData = [];
    filteredData = [];

    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('dashboard-screen').style.display = 'none';
    document.getElementById('user-info').style.display = 'none';
    document.getElementById('logout-btn').style.display = 'none';
    document.getElementById('login-status').textContent = '';

    destroyCharts();
    if (dataTable) {
        dataTable.destroy();
        dataTable = null;
    }
}

// ─── UI HELPERS ───
function showLoginError(msg) {
    document.getElementById('login-status').innerHTML =
        '<span style="color:#d93025;"><i class="fas fa-exclamation-circle"></i> ' + msg + '</span>';
}

function showDashboard() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('dashboard-screen').style.display = 'block';
    document.getElementById('status-text').textContent = 'Conectado';
    document.getElementById('status-dot').className = 'dot connected';
}

function showLoading(show) {
    document.getElementById('loading-indicator').style.display = show ? 'block' : 'none';
    document.getElementById('kpi-row').style.display = show ? 'none' : '';
    document.getElementById('charts-row').style.display = show ? 'none' : '';
    document.getElementById('table-card').style.display = show ? 'none' : '';
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
    document.getElementById('charts-row').style.display = 'none';
    document.getElementById('table-card').style.display = 'none';
}

function showWarning(msg) {
    document.getElementById('error-container').innerHTML =
        '<div class="error-box" style="background:#fef7e0;color:#e37400;"><i class="fas fa-info-circle"></i> ' + msg + '</div>';
    showLoading(false);
}

function showDebugInfo(headers, totalLinhas, extra) {
    const container = document.getElementById('error-container');
    container.innerHTML = `
        <div class="error-box" style="background:#e8f0fe;color:#1a73e8;text-align:left;">
            <strong><i class="fas fa-bug"></i> Diagnóstico:</strong><br>
            <small>
                🔹 Colunas encontradas: <strong>${headers.length}</strong><br>
                🔹 Nomes: <code>${headers.join(' | ')}</code><br>
                🔹 Total de linhas: <strong>${totalLinhas}</strong><br>
                ${extra ? '🔹 <strong>' + extra + '</strong><br>' : ''}
                🔹 Abra o console (F12) para mais detalhes
            </small>
        </div>
    `;
}

// ─── BUSCA DADOS DO GOOGLE SHEETS ───
async function fetchSheetData() {
    showLoading(true);
    try {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.spreadsheetId}/values/${CONFIG.sheetName}`;
        const response = await fetch(url, {
            headers: { Authorization: 'Bearer ' + accessToken }
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || 'Erro na requisição (' + response.status + ')');
        }

        const data = await response.json();
        if (!data.values || data.values.length < 2) {
            showWarning('Planilha vazia ou sem dados. Verifique se a aba "' + CONFIG.sheetName + '" tem dados.');
            return;
        }

        processRawData(data.values);
    } catch (err) {
        showError('Erro ao buscar dados: ' + err.message);
        console.error('Erro completo:', err);
    }
}

// ─── PROCESSAMENTO DOS DADOS ───
function processRawData(rows) {
    const headers = rows[0].map(h => String(h).trim());
    const dataRows = rows.slice(1);

    // Diagnóstico no console
    console.log('📋 Headers da planilha:', headers);
    console.log('📊 Total de linhas:', dataRows.length);
    if (dataRows.length > 0) console.log('🔍 Primeira linha:', dataRows[0]);

    // Normalização: minúsculo + remove acentos
    const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

    const colIndex = {};

    // Lista de colunas esperadas
    const colBusca = [
        'Nome do agente', 'UG', 'Data Relatório', 'Tipo', 'Tipo Saída',
        'Horário Escalado', 'Horário Real', 'Diferença',
        'Horário Saída Escalado', 'Horário Saída Real', 'Diferença Saída',
        'Nome Supervisor', 'Cobertura', 'Cobertura Saída',
        'ID de agente', 'Hora da Conferência',
        'Faixa Escalado', 'Faixa Real', 'Faixa Saída Escalado', 'Faixa Saída Real'
    ];

    colBusca.forEach(col => {
        const idx = headers.findIndex(h => norm(h) === norm(col));
        if (idx !== -1) colIndex[col] = idx;
    });

    console.log('🔎 Colunas encontradas:', Object.keys(colIndex));

    // Verifica se achou a coluna mínima necessária
    if (!colIndex['Nome do agente']) {
        showDebugInfo(headers, dataRows.length);
        showError('Coluna "Nome do agente" não encontrada. Colunas disponíveis: ' + headers.join(' | '));
        return;
    }

    // Converte linhas em objetos
    rawData = dataRows.map(row => {
        const obj = {};
        Object.keys(colIndex).forEach(key => {
            obj[key] = (row[colIndex[key]] || '').toString().trim();
        });
        if (!obj['Tipo']) obj['Tipo'] = 'Regular';
        return obj;
    }).filter(r => r['Nome do agente'] && r['Nome do agente'].length > 0);

    console.log('✅ rawData populado:', rawData.length, 'registros');
    if (rawData.length > 0) {
        console.log('📌 Primeiro:', rawData[0]);
        console.log('📌 Último:', rawData[rawData.length - 1]);
    }

    if (rawData.length === 0) {
        showDebugInfo(headers, dataRows.length, 'Nenhum registro com nome de agente válido');
        showWarning('Nenhum agente encontrado na planilha.');
        return;
    }

    // Popula filtros e renderiza
    populateFilters();
    applyFilters();

    // Data info
    const datas = [...new Set(rawData.map(r => r['Data Relatório']).filter(Boolean))];
    document.getElementById('data-info').textContent =
        datas.length ? '📅 ' + datas.sort().reverse().join(' | ') : '';
    document.getElementById('kpi-linha').textContent = rawData.length + ' linhas';
}

// ─── FILTROS ───
function populateFilters() {
    const ugSet = [...new Set(rawData.map(r => r['UG']).filter(Boolean))];
    ugSet.sort((a, b) => a.localeCompare(b, 'pt-BR'));

    const selUg = document.getElementById('filter-ug');
    const currentUg = selUg.value;
    selUg.innerHTML = '<option value="todas">Todas as UGs</option>';
    ugSet.forEach(ug => {
        selUg.innerHTML += `<option value="${ug}">${ug}</option>`;
    });
    if (currentUg && currentUg !== 'todas' && ugSet.includes(currentUg)) {
        selUg.value = currentUg;
    }
}

function applyFilters() {
    const ug = document.getElementById('filter-ug').value;
    const tipo = document.getElementById('filter-tipo').value;

    filteredData = rawData.filter(r => {
        if (ug !== 'todas' && r['UG'] !== ug) return false;
        if (tipo !== 'todos' && r['Tipo'] !== tipo) return false;
        return true;
    });

    renderDashboard();
}

document.getElementById('filter-ug').addEventListener('change', applyFilters);
document.getElementById('filter-tipo').addEventListener('change', applyFilters);

// ─── CHAMADA DE REFRESH ───
function refreshData() {
    if (!accessToken) {
        handleLogout();
        return;
    }
    document.getElementById('refresh-btn').disabled = true;
    document.getElementById('refresh-btn').innerHTML = '<i class="fas fa-spinner fa-spin"></i> Atualizando...';
    fetchSheetData();
}

// ─── RENDERIZA DASHBOARD ───
function renderDashboard() {
    showLoading(false);

    const total = filteredData.length;
    const faltas = filteredData.filter(r => r['Tipo'] === 'FALTA').length;
    const atrasos = filteredData.filter(r => r['Tipo'] === 'ATRASO').length;
    const adiantados = filteredData.filter(r => r['Tipo'] === 'Adiantado').length;
    const regulares = filteredData.filter(r => r['Tipo'] === 'Regular').length;

    const pct = (v) => total > 0 ? ((v / total) * 100).toFixed(1) + '%' : '0%';
    const okPct = total > 0 ? (((regulares + adiantados) / total) * 100).toFixed(1) : '0';

    document.getElementById('kpi-total').textContent = total;
    document.getElementById('kpi-ok').textContent = okPct + '%';
    document.getElementById('kpi-faltas').textContent = faltas;
    document.getElementById('kpi-faltas-pct').textContent = pct(faltas);
    document.getElementById('kpi-atrasos').textContent = atrasos;
    document.getElementById('kpi-atrasos-pct').textContent = pct(atrasos);
    document.getElementById('kpi-adiantado').textContent = adiantados;
    document.getElementById('kpi-adiantado-pct').textContent = pct(adiantados);

    const datas = [...new Set(filteredData.map(r => r['Data Relatório']).filter(Boolean))];
    document.getElementById('kpi-data').textContent = datas.length ? datas.sort().reverse()[0] : '--';

    renderCharts(faltas, atrasos, regulares, adiantados);
    renderTable();
}

// ─── GRÁFICOS ───
function destroyCharts() {
    if (chartPizza) { chartPizza.destroy(); chartPizza = null; }
    if (chartBarras) { chartBarras.destroy(); chartBarras = null; }
}

function renderCharts(faltas, atrasos, regulares, adiantados) {
    destroyCharts();

    const ctxPizza = document.getElementById('chartPizza').getContext('2d');
    chartPizza = new Chart(ctxPizza, {
        type: 'pie',
        data: {
            labels: ['Regular', 'Falta', 'Atraso', 'Adiantado'],
            datasets: [{
                data: [regulares, faltas, atrasos, adiantados],
                backgroundColor: ['#34a853', '#ea4335', '#fbbc04', '#4285f4'],
                borderWidth: 2,
                borderColor: '#fff',
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { padding: 16, usePointStyle: true, font: { size: 12 } }
                },
                tooltip: {
                    callbacks: {
                        label: function(ctx) {
                            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                            const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : 0;
                            return ctx.label + ': ' + ctx.parsed + ' (' + pct + '%)';
                        }
                    }
                }
            }
        }
    });

    // Barras: agrupa por UG
    const ctxBarras = document.getElementById('chartBarras').getContext('2d');
    const ugGroups = {};
    filteredData.forEach(r => {
        const ug = r['UG'] || 'Sem UG';
        if (!ugGroups[ug]) ugGroups[ug] = { FALTA: 0, ATRASO: 0, Regular: 0, Adiantado: 0 };
        if (ugGroups[ug][r['Tipo']] !== undefined) ugGroups[ug][r['Tipo']]++;
    });

    const ugs = Object.keys(ugGroups).sort();
    chartBarras = new Chart(ctxBarras, {
        type: 'bar',
        data: {
            labels: ugs,
            datasets: [
                { label: 'Falta', data: ugs.map(ug => ugGroups[ug].FALTA), backgroundColor: '#ea4335', borderRadius: 3 },
                { label: 'Atraso', data: ugs.map(ug => ugGroups[ug].ATRASO), backgroundColor: '#fbbc04', borderRadius: 3 },
                { label: 'Regular', data: ugs.map(ug => ugGroups[ug].Regular), backgroundColor: '#34a853', borderRadius: 3 },
                { label: 'Adiantado', data: ugs.map(ug => ugGroups[ug].Adiantado), backgroundColor: '#4285f4', borderRadius: 3 },
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                x: { stacked: true, grid: { display: false } },
                y: { stacked: true, beginAtZero: true, grid: { color: '#f0f0f0' } }
            },
            plugins: {
                legend: { position: 'bottom', labels: { usePointStyle: true, font: { size: 11 } } },
                tooltip: {
                    callbacks: {
                        title: (items) => items[0].label,
                        label: (ctx) => ctx.dataset.label + ': ' + ctx.parsed.y
                    }
                }
            }
        }
    });
}

// ─── TABELA ───
function renderTable() {
    if (dataTable) {
        dataTable.destroy();
        dataTable = null;
    }

    const tbody = document.querySelector('#tabela-agentes tbody');
    tbody.innerHTML = '';

    filteredData.forEach(r => {
        const statusClass = r['Tipo'] === 'FALTA' ? 'badge-falta' :
                            r['Tipo'] === 'ATRASO' ? 'badge-atraso' :
                            r['Tipo'] === 'Adiantado' ? 'badge-adiantado' : 'badge-regular';

        const tipoSaidaClass = r['Tipo Saída'] === 'FALTA' ? 'badge-falta' :
                                r['Tipo Saída'] === 'ATRASO' ? 'badge-atraso' :
                                r['Tipo Saída'] === 'Adiantado' ? 'badge-adiantado' : 'badge-regular';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${escapeHtml(r['Nome do agente'])}</strong></td>
            <td>${escapeHtml(r['UG'] || '-')}</td>
            <td><span class="badge-status ${statusClass}">${escapeHtml(r['Tipo'])}</span></td>
            <td>${escapeHtml(r['Horário Escalado'] || '-')}</td>
            <td>${escapeHtml(r['Horário Real'] || '-')}</td>
            <td>${escapeHtml(r['Diferença'] || '-')}</td>
            <td>${escapeHtml(r['Horário Saída Escalado'] || '-')}</td>
            <td>${escapeHtml(r['Horário Saída Real'] || '-')}</td>
            <td>${r['Tipo Saída'] ? `<span class="badge-status ${tipoSaidaClass}">${escapeHtml(r['Tipo Saída'])}</span>` : '-'}</td>
        `;
        tbody.appendChild(tr);
    });

    dataTable = $('#tabela-agentes').DataTable({
        language: { url: 'https://cdn.datatables.net/plug-ins/1.13.6/i18n/pt-BR.json' },
        pageLength: 25,
        lengthMenu: [[10, 25, 50, 100, -1], [10, 25, 50, 100, 'Todos']],
        order: [[0, 'asc']],
        dom: '<"d-flex justify-content-between align-items-center mb-2"lf>t<"d-flex justify-content-between"ip>',
    });
}

// ─── UTILITÁRIOS ───
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ─── INICIALIZA ───
window.onload = init;
