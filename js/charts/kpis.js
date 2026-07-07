/* ============================================================
   charts/kpis.js — Cards de KPI
   Atualiza os 4 indicadores no topo do dashboard:
   Total Previsto, Total Logado, Faltas e % Presença.
   Depende de: state.js
   ============================================================ */

/**
 * Calcula métricas agregadas a partir dos dados do gráfico.
 * @param {Array} dados - Array de [horario, prev, real, compareceu]
 */
function calcularMetricas(dados) {
    let totalPrev = 0;
    let totalReal = 0;

    dados.forEach(row => {
        if (row[0] === '-') return; // gap visual — ignora
        totalPrev += row[1];
        totalReal += row[2];
    });

    const presenca = totalPrev > 0 ? ((totalReal / totalPrev) * 100).toFixed(1) : '0.0';

    return { totalPrev, totalReal, presenca };
}

/**
 * Atualiza os valores e cores dos 4 cards de KPI.
 * As cores base são controladas pelo CSS via classes (.kpi-prev, .kpi-logado, etc.)
 * Apenas o % Presença tem cor dinâmica (verde/amarelo/vermelho) via JS.
 * @param {Array} data - Dados do gráfico (entrada ou saída)
 */
function updateKPIs(data) {
    const m = calcularMetricas(data);

    // Faltas reais: apenas registros com Tipo = 'FALTA'
    const faltasReais = filteredData.filter(r => r['Tipo'] === 'FALTA').length;

    document.getElementById('kpi-total-prev').textContent = m.totalPrev;
    document.getElementById('kpi-total-logado').textContent = m.totalReal;
    document.getElementById('kpi-faltas').textContent = faltasReais;
    document.getElementById('kpi-presenca').textContent = m.presenca + '%';

    // Cor dinâmica da % de presença — também atualiza a variável CSS do card
    const pct = parseFloat(m.presenca);
    const card = document.querySelector('.kpi-card.kpi-presenca');
    const el = document.getElementById('kpi-presenca');

    if (pct >= 90) {
        el.style.color = 'var(--success)';
        if (card) { card.style.setProperty('--kpi-color', 'var(--success)'); card.style.setProperty('--kpi-color-light', 'var(--success-light)'); }
    } else if (pct >= 70) {
        el.style.color = 'var(--warning)';
        if (card) { card.style.setProperty('--kpi-color', 'var(--warning)'); card.style.setProperty('--kpi-color-light', 'var(--warning-light)'); }
    } else {
        el.style.color = 'var(--danger)';
        if (card) { card.style.setProperty('--kpi-color', 'var(--danger)'); card.style.setProperty('--kpi-color-light', 'var(--danger-light)'); }
    }
}

