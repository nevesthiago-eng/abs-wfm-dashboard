/* ============================================================
   app.js — Orquestrador Principal
   Responsabilidade única: inicializar módulos, coordenar o
   fluxo de render e registrar os event listeners globais.

   NÃO contém lógica de negócio — cada módulo cuida do seu domínio:
     • Autenticação  → core/auth.js
     • Dados         → core/data.js
     • Filtros       → core/filters.js
     • Gráfico       → charts/chart-previsto-realizado.js
     • KPIs          → charts/kpis.js
     • Tab Sup       → tabs/tab-falta-supervisor.js
     • Tab Seq       → tabs/tab-sequencia-faltas.js
     • Tab Top       → tabs/tab-top-agentes.js
   ============================================================ */

// ─── INICIALIZAÇÃO ───

function init() {
    // Inicializa autenticação Google
    initAuth();

    // Registra o plugin de data labels do Chart.js
    if (typeof ChartDataLabels !== 'undefined') {
        Chart.register(ChartDataLabels);
    }

    // Configura os event listeners dos filtros
    setupFilterListeners();

    // Configura a navegação das abas analíticas
    setupAnalyticsTabs();
}

// ─── RENDER PRINCIPAL DO DASHBOARD ───

/**
 * Coordena a exibição dos gráficos e KPIs conforme o modo selecionado.
 * Chamado por applyFilters() toda vez que os dados ou filtros mudam.
 * @param {'entrada'|'saida'|'ambos'} modo
 */
function renderDashboard(modo) {
    destroyCharts();
    showLoading(false);
    document.getElementById('kpi-row').style.display = 'flex';

    const modoSelecionado = modo || document.getElementById('filter-modo').value;

    const mostraEntrada = modoSelecionado === 'entrada' || modoSelecionado === 'ambos';
    const mostraSaida   = modoSelecionado === 'saida'   || modoSelecionado === 'ambos';

    document.getElementById('chart-entrada-container').style.display = mostraEntrada ? 'block' : 'none';
    document.getElementById('chart-saida-container').style.display   = mostraSaida   ? 'block' : 'none';

    let dataEntrada = null;
    let dataSaida   = null;

    if (mostraEntrada) {
        dataEntrada = generatePrevistoRealizado('entrada');
        renderChart('entrada', dataEntrada);
    }

    if (mostraSaida) {
        dataSaida = generatePrevistoRealizado('saida');
        renderChart('saida', dataSaida);
    }

    // KPIs usam o primeiro conjunto de dados disponível
    const dataKPI = dataEntrada || dataSaida;
    if (dataKPI) {
        updateKPIs(dataKPI);
    }
}

// ─── RENDER DAS TABELAS ANALÍTICAS ───

/**
 * Renderiza as três tabs analíticas após carga dos dados.
 * Chamado por processRawData() em data.js.
 */
function renderAnalyticsTables() {
    if (!rawData || rawData.length === 0) {
        document.getElementById('analytics-section').style.display = 'none';
        return;
    }

    document.getElementById('analytics-section').style.display = 'block';

    renderTabFaltaSup();     // tabs/tab-falta-supervisor.js
    renderTabSeqFaltas();    // tabs/tab-sequencia-faltas.js
    renderTabTopAgentes();   // tabs/tab-top-agentes.js
}

// ─── NAVEGAÇÃO DAS ABAS ANALÍTICAS ───

function setupAnalyticsTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
            this.classList.add('active');
            const target = document.getElementById(this.dataset.tab);
            if (target) target.classList.add('active');
        });
    });
}

// ─── INICIALIZA AO CARREGAR A PÁGINA ───
window.onload = init;
