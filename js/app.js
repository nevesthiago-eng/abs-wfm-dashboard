/* ============================================================
   ABS WFM Dashboard — Previsto × Realizado
   ============================================================ */

// ─── ESTADO GLOBAL ───
let tokenClient = null;
let accessToken = null;
let rawData = [];
let filteredData = [];
const charts = { entrada: null, saida: null };
let currentUser = null;

// ─── FALLBACK SE BIBLIOTECA GOOGLE NÃO CARREGAR ───
function gsiLoadError() {
    document.getElementById('login-status').innerHTML =
        '<span style="color:#d93025;"><i class="fas fa-exclamation-circle"></i> ' +
        'A biblioteca de login do Google n\u00e3o p\u00f4de ser carregada. ' +
        'Verifique sua conex\u00e3o com a internet.</span>';
}

// ─── INICIALIZAÇÃO ───
function init() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CONFIG.clientId,
        scope: CONFIG.scope,
        callback: handleTokenResponse,
        error_callback: (err) => {
            showError('Erro na autentica\u00e7\u00e3o: ' + (err.message || err.type || 'desconhecido'));
        },
    });

    document.getElementById('google-btn-wrapper').innerHTML = `
        <button id="login-btn-google" onclick="handleLogin()">
            <svg width="20" height="20" viewBox="0 0 48 48">
                <path fill="#4285F4" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#34A853" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.54 28.59A14.5 14.5 0 0 1 9.5 24c0-1.59.28-3.14.76-4.59l-7.98-6.19A23.99 23.99 0 0 0 0 24c0 3.77.87 7.35 2.56 10.78l7.98-6.19z"/>
                <path fill="#EA4335" d="M24 48c6.48 0 11.91-2.14 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.48 48 24 48z"/>
            </svg>
            Entrar com Google
        </button>
    `;

    // Registra plugin de r\u00f3tulos nos gr\u00e1ficos
    if (typeof ChartDataLabels !== 'undefined') {
        Chart.register(ChartDataLabels);
    }

    document.getElementById('filter-modo').addEventListener('change', applyFilters);
}

// ─── LOGIN ───
function handleLogin() {
    document.getElementById('login-status').textContent = '\u23f3 Abrindo janela de autentica\u00e7\u00e3o...';
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
    } catch (e) { /* n\u00e3o cr\u00edtico */ }
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
}

function showWarning(msg) {
    document.getElementById('error-container').innerHTML =
        '<div class="error-box" style="background:#fef7e0;color:#e37400;"><i class="fas fa-info-circle"></i> ' + msg + '</div>';
    showLoading(false);
    document.getElementById('kpi-row').style.display = 'none';
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
            throw new Error(err.error?.message || 'Erro na requisi\u00e7\u00e3o (' + response.status + ')');
        }

        const data = await response.json();
        if (!data.values || data.values.length < 2) {
            showWarning('Planilha vazia ou sem dados.');
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

    console.log('\ud83d\udccb Headers:', headers);
    console.log('\ud83d\udcca Total linhas:', dataRows.length);

    const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

    const colMap = {};
    const colBusca = [
        'Nome do agente', 'UG', 'Data Relat\u00f3rio', 'Tipo',
        'Hor\u00e1rio Escalado', 'Hor\u00e1rio Real',
        'Hor\u00e1rio Sa\u00edda Escalado', 'Hor\u00e1rio Sa\u00edda Real',
        'Nome Supervisor'
    ];

    colBusca.forEach(col => {
        const idx = headers.findIndex(h => norm(h) === norm(col));
        if (idx !== -1) colMap[col] = idx;
    });

    console.log('\ud83d\udd0e Colunas encontradas:', Object.keys(colMap));

    if (!colMap['Nome do agente']) {
        showError('Coluna "Nome do agente" n\u00e3o encontrada.');
        return;
    }

    rawData = dataRows.map(row => {
        const obj = {};
        Object.keys(colMap).forEach(key => {
            obj[key] = (row[colMap[key]] || '').toString().trim();
        });
        return obj;
    }).filter(r => r['Nome do agente'] && r['Nome do agente'].length > 0);

    console.log('\u2705 rawData:', rawData.length, 'registros');

    if (rawData.length === 0) {
        showWarning('Nenhum agente encontrado na planilha.');
        return;
    }

    populateFilters();
    applyFilters();

}

// ─── FILTROS ───
function populateFilters() {
    const ugSet = [...new Set(rawData.map(r => r['UG']).filter(Boolean))];
    ugSet.sort((a, b) => a.localeCompare(b, 'pt-BR'));

    const selUg = document.getElementById('filter-ug');
    const currentUg = selUg.value;
    selUg.innerHTML = '<option value="todas">Todas as UGs</option>';
    ugSet.forEach(ug => {
        selUg.innerHTML += `<option value="${ug.replace(/"/g, '&quot;')}">${ug}</option>`;
    });
    // Default: Magalu se dispon\u00edvel
    if (ugSet.includes('Magalu')) {
        selUg.value = 'Magalu';
    } else if (currentUg && currentUg !== 'todas' && ugSet.includes(currentUg)) {
        selUg.value = currentUg;
    }

    const dataSet = [...new Set(rawData.map(r => r['Data Relat\u00f3rio']).filter(Boolean))];
    dataSet.sort((a, b) => {
        const [da, ma, aa] = a.split('/');
        const [db, mb, ab] = b.split('/');
        return new Date(aa, ma - 1, da) - new Date(ab, mb - 1, db);
    });

    const selData = document.getElementById('filter-data');
    const currentData = selData.value;
    selData.innerHTML = '<option value="todas">Todas as datas</option>';
    dataSet.forEach(d => {
        selData.innerHTML += `<option value="${d}">${d}</option>`;
    });
    // Default: data mais recente
    if (dataSet.length > 0) {
        selData.value = dataSet[dataSet.length - 1];
    } else if (currentData && currentData !== 'todas' && dataSet.includes(currentData)) {
        selData.value = currentData;
    }
}

function applyFilters() {
    const ug = document.getElementById('filter-ug').value;
    const data = document.getElementById('filter-data').value;
    const modo = document.getElementById('filter-modo').value;

    filteredData = rawData.filter(r => {
        if (ug !== 'todas' && r['UG'] !== ug) return false;
        if (data !== 'todas' && r['Data Relat\u00f3rio'] !== data) return false;
        return true;
    });

    if (filteredData.length === 0) {
        showWarning('Nenhum dado encontrado para os filtros selecionados.');
        document.getElementById('kpi-row').style.display = 'none';
        document.getElementById('chart-entrada-container').style.display = 'none';
        document.getElementById('chart-saida-container').style.display = 'none';
        return;
    }

    renderDashboard(modo);
}

document.getElementById('filter-ug').addEventListener('change', applyFilters);
document.getElementById('filter-data').addEventListener('change', applyFilters);

function refreshData() {
    if (!accessToken) {
        handleLogout();
        return;
    }
    document.getElementById('refresh-btn').disabled = true;
    document.getElementById('refresh-btn').innerHTML = '<i class="fas fa-spinner fa-spin"></i> Atualizando...';
    fetchSheetData();
}

// ═══════════════════════════════════════════════════════════
//  LÓGICA PREVISTO × REALIZADO
// ═══════════════════════════════════════════════════════════

function normalizeTime(timeStr) {
    if (!timeStr || timeStr === '-' || timeStr.trim() === '') return '';
    const parts = String(timeStr).trim().split(':');
    if (parts.length < 2) return '';
    return parts[0].padStart(2, '0') + ':' + parts[1].padStart(2, '0');
}

function roundTo5Minutes(timeStr) {
    if (!timeStr) return '';
    const parts = timeStr.split(':');
    let h = parseInt(parts[0]);
    const m = parseInt(parts[1]);
    if (isNaN(h)) return '';
    let rounded = Math.round(m / 5) * 5;
    if (rounded >= 60) { rounded = 0; h++; }
    return `${String(h).padStart(2, '0')}:${String(rounded).padStart(2, '0')}`;
}

/**
 * Remove faixas sem movimentação e colapsa gaps consecutivos.
 * Versão JS do GERAR_VISAO_INTELIGENTE do App Script.
 */
function gerarVisaoInteligente(dados) {
    if (!dados || dados.length === 0) return [];

    const keep = dados.map(row => {
        const prev = parseFloat(row[1]) || 0;
        const real = parseFloat(row[2]) || 0;
        return prev > 0 || real > 0;
    });

    const resultado = [];
    let gapStart = null;

    for (let i = 0; i < dados.length; i++) {
        if (keep[i]) {
            if (gapStart !== null) {
                resultado.push(['-', 0, 0, 0]);
                gapStart = null;
            }
            resultado.push([dados[i][0], dados[i][1], dados[i][2], dados[i][3]]);
        } else {
            if (gapStart === null) gapStart = dados[i][0];
        }
    }

    if (gapStart !== null) {
        resultado.push(['-', 0, 0, 0]);
    }

    return resultado;
}

/**
 * Gera os dados de Previsto × Realizado para o modo selecionado.
 */
function generatePrevistoRealizado(mode) {
    const prevField = mode === 'entrada' ? 'Hor\u00e1rio Escalado' : 'Hor\u00e1rio Sa\u00edda Escalado';
    const realField = mode === 'entrada' ? 'Hor\u00e1rio Real' : 'Hor\u00e1rio Sa\u00edda Real';

    const buckets = {};
    for (let h = 7; h <= 21; h++) {
        const hh = String(h).padStart(2, '0');
        for (let m = 0; m < 60; m += 5) {
            const mm = String(m).padStart(2, '0');
            buckets[`${hh}:${mm}`] = { prev: 0, real: 0, compareceu: 0 };
        }
    }

    filteredData.forEach(row => {
        const t = roundTo5Minutes(normalizeTime(row[prevField]));
        if (t && buckets[t]) buckets[t].prev++;
    });

    filteredData.forEach(row => {
        const t = roundTo5Minutes(normalizeTime(row[realField]));
        if (t && buckets[t]) buckets[t].real++;
    });

    // Conta agentes escalados que realmente compareceram (independente de atraso/adiantamento)
    filteredData.forEach(row => {
        const t = roundTo5Minutes(normalizeTime(row[prevField]));
        if (t && buckets[t] && row['Tipo'] !== 'FALTA') buckets[t].compareceu++;
    });

    const times = Object.keys(buckets).sort();
    const chartData = times.map(t => [t, buckets[t].prev, buckets[t].real, buckets[t].compareceu]);

    return gerarVisaoInteligente(chartData);
}

// ─── CALCULA MÉTRICAS DOS KPIs ───

function calcularMetricas(dados) {
    let totalPrev = 0;
    let totalReal = 0;

    dados.forEach(row => {
        if (row[0] === '-') return;
        totalPrev += row[1];
        totalReal += row[2];
    });

    const presenca = totalPrev > 0 ? ((totalReal / totalPrev) * 100).toFixed(1) : '0.0';

    return { totalPrev, totalReal, presenca };
}

// ─── RENDERIZA O DASHBOARD ───

function renderDashboard(modo) {
    destroyCharts();
    showLoading(false);
    document.getElementById('kpi-row').style.display = 'flex';

    const modoSelecionado = modo || document.getElementById('filter-modo').value;

    const mostraEntrada = modoSelecionado === 'entrada' || modoSelecionado === 'ambos';
    const mostraSaida = modoSelecionado === 'saida' || modoSelecionado === 'ambos';

    document.getElementById('chart-entrada-container').style.display = mostraEntrada ? 'block' : 'none';
    document.getElementById('chart-saida-container').style.display = mostraSaida ? 'block' : 'none';

    let dataEntrada = null;
    let dataSaida = null;

    if (mostraEntrada) {
        dataEntrada = generatePrevistoRealizado('entrada');
        renderChart('entrada', dataEntrada);
    }

    if (mostraSaida) {
        dataSaida = generatePrevistoRealizado('saida');
        renderChart('saida', dataSaida);
    }

    const dataKPI = dataEntrada || dataSaida;
    if (dataKPI) {
        updateKPIs(dataKPI);
    }
}

// ─── RENDERIZA GRÁFICO ───

function destroyCharts() {
    if (charts.entrada) { charts.entrada.destroy(); charts.entrada = null; }
    if (charts.saida) { charts.saida.destroy(); charts.saida = null; }
}

// ─── PLUGIN: BARRA TRACEJADA NO PREVISTO ───

const dashedBorderPlugin = {
    id: 'dashedBorder',
    afterDraw(chart) {
        const ctx = chart.ctx;
        chart.data.datasets.forEach((dataset, dsIdx) => {
            if (!dataset.borderDash) return;
            const meta = chart.getDatasetMeta(dsIdx);
            meta.data.forEach((bar) => {
                const x = bar.x - bar.width / 2;
                const y = Math.min(bar.y, bar.base);
                const w = bar.width;
                const h = Math.abs(bar.base - bar.y);
                if (h === 0) return;
                ctx.save();
                    ctx.strokeStyle = dataset.borderColor;
                    ctx.lineWidth = 2;
                    ctx.setLineDash(dataset.borderDash);
                ctx.strokeRect(x, y, w, h);
                ctx.restore();
            });
        });
    }
};

function renderChart(mode, data) {
    const canvasId = mode === 'entrada' ? 'chartEntrada' : 'chartSaida';
    const ctx = document.getElementById(canvasId).getContext('2d');

    // Filtra gaps: s\u00f3 exibe hor\u00e1rios com movimenta\u00e7\u00e3o
    const dadosFiltrados = data.filter(row => row[0] !== '-' && (row[1] > 0 || row[2] > 0));
    const labels = dadosFiltrados.map(row => row[0]);
    const prevData = dadosFiltrados.map(row => row[1]);
    const realData = dadosFiltrados.map(row => row[2]);
    const compareceuData = dadosFiltrados.map(row => row[3] !== undefined ? row[3] : row[2]);

    const titulo = mode === 'entrada'
        ? 'Entrada \u2014 Previsto \u00d7 Realizado'
        : 'Sa\u00edda \u2014 Previsto \u00d7 Realizado';

    charts[mode] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Previsto',
                    data: prevData,
                    backgroundColor: '#e0e0e0',
                    borderColor: '#2f4050',
                    borderWidth: 0,
                    borderDash: [5, 3],
                    borderRadius: 2,
                    barPercentage: 0.9,
                    categoryPercentage: 0.9,
                    datalabels: {
                        formatter: function(value, ctx) {
                            if (value === null || value === 0) return '';
                            const comp = compareceuData[ctx.dataIndex] || 0;
                            return value + '/' + comp;
                        },
                        color: '#1E293B',
                        font: { weight: 'bold', size: 10 },
                        anchor: 'end',
                        align: 'end',
                        offset: 2
                    }
                },
                {
                    label: 'Realizado',
                    data: realData,
                    backgroundColor: '#2f4050',
                    borderColor: '#2f4050',
                    borderWidth: 1,
                    borderRadius: 2,
                    barPercentage: 0.9,
                    categoryPercentage: 0.9,
                    datalabels: {
                        formatter: function(value) {
                            if (value === null || value === 0) return '';
                            return value;
                        },
                        color: '#1E293B',
                        font: { weight: 'bold', size: 10 },
                        anchor: 'end',
                        align: 'end',
                        offset: 2
                    }
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            onClick: function(e, elements) {
                if (elements.length === 0) return;
                const idx = elements[0].index;
                const timeSlot = labels[idx];
                if (!timeSlot) return;
                showAgentModal(timeSlot, mode);
            },
            layout: {
                padding: { top: 24 }
            },
            plugins: {
                title: {
                    display: true,
                    text: titulo,
                    font: { size: 14, weight: '600' },
                    padding: { bottom: 12 },
                    color: '#202124'
                },
                legend: {
                    position: 'top',
                    align: 'end',
                    labels: {
                        usePointStyle: true,
                        padding: 16,
                        font: { size: 12 }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(ctx) {
                            if (ctx.parsed.y === null) return null;
                            return ctx.dataset.label + ': ' + ctx.parsed.y + ' agente(s)';
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        font: { size: 9 },
                        maxRotation: 60,
                        minRotation: 0,
                        autoSkip: true,
                        maxTicksLimit: 30
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: { display: false },
                    ticks: {
                        display: false
                    }
                }
            }
        },
    plugins: [dashedBorderPlugin]
});
}

// ─── ATUALIZA KPIs ───

function updateKPIs(data) {
    const m = calcularMetricas(data);
    // Faltas reais: s\u00f3 quem tem Tipo = 'FALTA' (status vazio n\u00e3o conta)
    const faltasReais = filteredData.filter(r => r['Tipo'] === 'FALTA').length;

    document.getElementById('kpi-total-prev').textContent = m.totalPrev;
    document.getElementById('kpi-total-logado').textContent = m.totalReal;
    document.getElementById('kpi-faltas').textContent = faltasReais;
    document.getElementById('kpi-presenca').textContent = m.presenca + '%';

    // Cor da presença
    const pct = parseFloat(m.presenca);
    const el = document.getElementById('kpi-presenca');
    if (pct >= 90) {
        el.style.color = 'var(--success)';
    } else if (pct >= 70) {
        el.style.color = 'var(--warning)';
    } else {
        el.style.color = 'var(--danger)';
    }
}

// ─── UTILITÁRIOS ───

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ─── MODAL DE DETALHES ───

function showAgentModal(timeSlot, mode) {
    const prevField = mode === 'entrada' ? 'Hor\u00e1rio Escalado' : 'Hor\u00e1rio Sa\u00edda Escalado';
    const realField = mode === 'entrada' ? 'Hor\u00e1rio Real' : 'Hor\u00e1rio Sa\u00edda Real';

    // Busca agentes cujo bucket de 5 min bate com o hor\u00e1rio clicado
    const agents = filteredData.filter(row => {
        const prevBucket = roundTo5Minutes(normalizeTime(row[prevField]));
        const realBucket = roundTo5Minutes(normalizeTime(row[realField]));
        return prevBucket === timeSlot || realBucket === timeSlot;
    });

    if (agents.length === 0) return;

    // T\u00edtulo
    document.getElementById('modal-titulo-horario').textContent =
        timeSlot + ' (' + (mode === 'entrada' ? 'Entrada' : 'Sa\u00edda') + ')';

    // Tabela
    const tbody = document.getElementById('modal-tabela-corpo');
    tbody.innerHTML = '';

    agents.forEach(agent => {
        const statusClass = agent['Tipo'] === 'FALTA' ? 'badge-falta' :
                            agent['Tipo'] === 'ATRASO' ? 'badge-atraso' :
                            agent['Tipo'] === 'Adiantado' ? 'badge-adiantado' : 'badge-regular';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${escapeHtml(agent['Nome do agente'])}</strong></td>
            <td>${agent[prevField] || '-'}</td>
            <td>${agent[realField] || '-'}</td>
            <td><span class="badge-status ${statusClass}">${agent['Tipo'] || '-'}</span></td>
        `;
        tbody.appendChild(tr);
    });

    // Total
    document.getElementById('modal-total').textContent = agents.length + ' agente(s)';

    // Exibe modal
    document.getElementById('modal-detalhes').style.display = 'flex';

    // Fecha com ESC
    document.addEventListener('keydown', modalEscHandler);
}

function modalEscHandler(e) {
    if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', modalEscHandler);
    }
}

function closeModal(e) {
    if (e && e.target !== e.currentTarget) return;
    document.getElementById('modal-detalhes').style.display = 'none';
    document.removeEventListener('keydown', modalEscHandler);
}

// ─── INICIALIZA ───
window.onload = init;
