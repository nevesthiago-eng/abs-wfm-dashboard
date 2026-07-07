/* ============================================================
   tabs/tab-sequencia-faltas.js — Tab: Sequência de Faltas
   Encontra a maior sequência consecutiva de faltas por agente,
   renderiza a tabela e exibe o modal de detalhes.

   Para alterar:
     - algoritmo de sequência  → calcularSequenciaFaltas()
     - visual da tabela        → renderTabSeqFaltas()
     - conteúdo do modal       → showModalSeq()

   Depende de: state.js, utils.js (parseDateBR, diffDias, escapeHtml)
   ============================================================ */

// ─── CÁLCULO ───

/**
 * Encontra a maior sequência consecutiva de faltas para cada agente.
 * Usa rawData completo (todos os meses, sem filtros).
 * @returns {Array<{agente, dias, inicio, fim, supervisor}>} ordenado decrescente por dias
 */
function calcularSequenciaFaltas() {
    const faltas = rawData.filter(r => r['Tipo'] === 'FALTA');

    // Agrupa datas únicas por agente
    const agenteDatas = {};
    const agenteSupervisor = {};
    faltas.forEach(r => {
        const nome = r['Nome do agente'];
        const data = r['Data Relatório'];
        if (!agenteDatas[nome]) agenteDatas[nome] = new Set();
        agenteDatas[nome].add(data);
        agenteSupervisor[nome] = r['Nome Supervisor'] || 'Sem supervisor';
    });

    const resultados = [];
    Object.entries(agenteDatas).forEach(([agente, datasSet]) => {
        const datas = Array.from(datasSet)
            .map(d => parseDateBR(d))
            .filter(Boolean)
            .sort((a, b) => a - b);

        if (datas.length === 0) return;

        let melhorSeq = 1;
        let melhorInicio = datas[0];
        let melhorFim = datas[0];
        let seqAtual = 1;
        let inicioAtual = datas[0];

        for (let i = 1; i < datas.length; i++) {
            const diff = diffDias(datas[i], datas[i - 1]);
            if (diff === 1) {
                seqAtual++;
                if (seqAtual > melhorSeq) {
                    melhorSeq = seqAtual;
                    melhorInicio = inicioAtual;
                    melhorFim = datas[i];
                }
            } else {
                seqAtual = 1;
                inicioAtual = datas[i];
            }
        }

        resultados.push({
            agente,
            dias: melhorSeq,
            inicio: melhorInicio,
            fim: melhorFim,
            supervisor: agenteSupervisor[agente]
        });
    });

    return resultados.sort((a, b) => b.dias - a.dias);
}

// ─── RENDER DA TABELA ───

/**
 * Preenche o tbody da tab "Sequência de Faltas".
 */
function renderTabSeqFaltas() {
    const data = calcularSequenciaFaltas();
    const tbody = document.getElementById('tbody-seq-faltas');
    tbody.innerHTML = '';
    data.forEach(item => {
        const tr = document.createElement('tr');
        tr.dataset.agente = item.agente;
        tr.addEventListener('click', () => showModalSeq(item.agente));
        tr.innerHTML = `
            <td><strong>${escapeHtml(item.agente)}</strong></td>
            <td class="num-col">${item.dias}</td>
        `;
        tbody.appendChild(tr);
    });
}

// ─── MODAL ───

/**
 * Exibe o modal com o detalhe da maior sequência do agente.
 * @param {string} agente
 */
function showModalSeq(agente) {
    const faltas = rawData.filter(r => r['Tipo'] === 'FALTA' && r['Nome do agente'] === agente);
    const datasUnicas = [...new Set(faltas.map(r => r['Data Relatório']))]
        .map(d => parseDateBR(d))
        .filter(Boolean)
        .sort((a, b) => a - b);

    if (datasUnicas.length === 0) return;

    // Re-calcula a maior sequência para o modal
    let melhorSeq = 1;
    let melhorInicio = datasUnicas[0];
    let melhorFim = datasUnicas[0];
    let seqAtual = 1;
    let inicioAtual = datasUnicas[0];

    for (let i = 1; i < datasUnicas.length; i++) {
        const diff = diffDias(datasUnicas[i], datasUnicas[i - 1]);
        if (diff === 1) {
            seqAtual++;
            if (seqAtual > melhorSeq) {
                melhorSeq = seqAtual;
                melhorInicio = inicioAtual;
                melhorFim = datasUnicas[i];
            }
        } else {
            seqAtual = 1;
            inicioAtual = datasUnicas[i];
        }
    }

    const fmt = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    const supervisor = faltas[0]?.['Nome Supervisor'] || 'Sem supervisor';

    document.getElementById('modal-seq-agente').textContent = agente;
    document.getElementById('modal-seq-inicio').textContent = fmt(melhorInicio);
    document.getElementById('modal-seq-fim').textContent = fmt(melhorFim);
    document.getElementById('modal-seq-total').textContent = melhorSeq + ' dias';
    document.getElementById('modal-seq-supervisor').textContent = supervisor;
    document.getElementById('modal-seq-detalhes').style.display = 'flex';
    blockBodyScroll();
    document.addEventListener('keydown', modalEscHandlerSeq);
}

function closeModalSeq(e) {
    if (e && e.target !== e.currentTarget) return;
    document.getElementById('modal-seq-detalhes').style.display = 'none';
    allowBodyScroll();
    document.removeEventListener('keydown', modalEscHandlerSeq);
}


function modalEscHandlerSeq(e) {
    if (e.key === 'Escape') { closeModalSeq(); }
}
