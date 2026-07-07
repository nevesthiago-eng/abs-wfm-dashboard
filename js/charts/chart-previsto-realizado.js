/* ============================================================
   charts/chart-previsto-realizado.js — Gráfico Previsto × Realizado
   Gera os dados de entrada/saída por faixa de 5 minutos,
   renderiza o gráfico de barras e exibe o modal de agentes
   ao clicar numa barra.

   Para alterar:
     - visual das barras       → função renderChart()
     - lógica de agrupamento   → função generatePrevistoRealizado()
     - modal de detalhes       → funções showAgentModal() / closeModal()

   Depende de: state.js, utils.js (normalizeTime, roundTo5Minutes, escapeHtml)
   ============================================================ */

// ─── PLUGIN: BORDA TRACEJADA NO PREVISTO ───

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

// ─── GERAÇÃO DOS DADOS ───

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
 * Gera os dados de Previsto × Realizado para um modo (entrada ou saida).
 * Agrupa por faixas de 5 minutos entre 07:00 e 21:55.
 * @param {'entrada'|'saida'} mode
 * @returns {Array} Array de [horario, prev, real, compareceu]
 */
function generatePrevistoRealizado(mode) {
    const prevField = mode === 'entrada' ? 'Horário Escalado' : 'Horário Saída Escalado';
    const realField = mode === 'entrada' ? 'Horário Real' : 'Horário Saída Real';

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

// ─── RENDER DO GRÁFICO ───

/**
 * Destrói as instâncias de gráfico existentes para evitar conflito de canvas.
 */
function destroyCharts() {
    if (charts.entrada) { charts.entrada.destroy(); charts.entrada = null; }
    if (charts.saida) { charts.saida.destroy(); charts.saida = null; }
}

/**
 * Renderiza o gráfico de barras Previsto × Realizado.
 * @param {'entrada'|'saida'} mode
 * @param {Array} data - Saída de generatePrevistoRealizado()
 */
function renderChart(mode, data) {
    const canvasId = mode === 'entrada' ? 'chartEntrada' : 'chartSaida';
    const ctx = document.getElementById(canvasId).getContext('2d');

    // Exibe apenas horários com movimentação real
    const dadosFiltrados = data.filter(row => row[0] !== '-' && (row[1] > 0 || row[2] > 0));
    const labels = dadosFiltrados.map(row => row[0]);
    const prevData = dadosFiltrados.map(row => row[1]);
    const realData = dadosFiltrados.map(row => row[2]);
    const compareceuData = dadosFiltrados.map(row => row[3] !== undefined ? row[3] : row[2]);

    const titulo = mode === 'entrada'
        ? 'Entrada — Previsto × Realizado'
        : 'Saída — Previsto × Realizado';

    charts[mode] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    // ── Previsto: barra azul clara com borda tracejada azul ──
                    label: 'Previsto',
                    data: prevData,
                    backgroundColor: '#C8DEFA',
                    borderColor: '#0070E0',
                    borderWidth: 0,
                    borderDash: [5, 3],
                    borderRadius: 4,
                    barPercentage: 0.85,
                    categoryPercentage: 0.85,
                    datalabels: {
                        formatter: function (value, ctx) {
                            if (value === null || value === 0) return '';
                            const comp = compareceuData[ctx.dataIndex] || 0;
                            return value + '/' + comp;
                        },
                        color: '#0058B4',
                        font: { weight: '700', size: 10, family: 'Inter' },
                        anchor: 'end',
                        align: 'end',
                        offset: 3
                    }
                },
                {
                    // ── Realizado: barra azul sólida (cor primária) ──
                    label: 'Realizado',
                    data: realData,
                    backgroundColor: '#0070E0',
                    borderColor: '#0070E0',
                    borderWidth: 0,
                    borderRadius: 4,
                    barPercentage: 0.85,
                    categoryPercentage: 0.85,
                    datalabels: {
                        formatter: function (value) {
                            if (value === null || value === 0) return '';
                            return value;
                        },
                        color: '#ffffff',
                        font: { weight: '700', size: 10, family: 'Inter' },
                        anchor: 'center',
                        align: 'center',
                        offset: 0
                    }
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            onClick: function (e, elements) {
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
                    font: { size: 14, weight: '700', family: 'Inter' },
                    padding: { bottom: 14 },
                    color: '#0F1923'
                },
                legend: {
                    position: 'top',
                    align: 'end',
                    labels: {
                        usePointStyle: true,
                        pointStyle: 'rectRounded',
                        padding: 20,
                        font: { size: 12, family: 'Inter', weight: '500' },
                        color: '#5A6A7A'
                    }
                },
                tooltip: {
                    backgroundColor: '#0F1923',
                    titleColor: '#ffffff',
                    bodyColor: '#C8DEFA',
                    cornerRadius: 8,
                    padding: 10,
                    titleFont: { family: 'Inter', weight: '700', size: 13 },
                    bodyFont: { family: 'Inter', size: 12 },
                    callbacks: {
                        label: function (ctx) {
                            if (ctx.parsed.y === null) return null;
                            return '  ' + ctx.dataset.label + ': ' + ctx.parsed.y + ' agente(s)';
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    border: { display: false },
                    ticks: {
                        font: { size: 9, family: 'Inter', weight: '500' },
                        color: '#5A6A7A',
                        maxRotation: 60,
                        minRotation: 0,
                        autoSkip: true,
                        maxTicksLimit: 30
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: { display: false },
                    border: { display: false },
                    ticks: { display: false }
                }
            }
        },
        plugins: [dashedBorderPlugin]
    });
}

// ─── MODAL DE DETALHES (CLIQUE NA BARRA) ───

/**
 * Exibe o modal com a lista de agentes do horário clicado.
 * @param {string} timeSlot - Horário no formato "HH:MM"
 * @param {'entrada'|'saida'} mode
 */
function showAgentModal(timeSlot, mode) {
    const prevField = mode === 'entrada' ? 'Horário Escalado' : 'Horário Saída Escalado';
    const realField = mode === 'entrada' ? 'Horário Real' : 'Horário Saída Real';

    const agents = filteredData.filter(row => {
        const prevBucket = roundTo5Minutes(normalizeTime(row[prevField]));
        const realBucket = roundTo5Minutes(normalizeTime(row[realField]));
        return prevBucket === timeSlot || realBucket === timeSlot;
    });

    if (agents.length === 0) return;

    document.getElementById('modal-titulo-horario').textContent =
        timeSlot + ' (' + (mode === 'entrada' ? 'Entrada' : 'Saída') + ')';

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

    document.getElementById('modal-total').textContent = agents.length + ' agente(s)';
    document.getElementById('modal-detalhes').style.display = 'flex';
    blockBodyScroll();
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
    allowBodyScroll();
    document.removeEventListener('keydown', modalEscHandler);
}

