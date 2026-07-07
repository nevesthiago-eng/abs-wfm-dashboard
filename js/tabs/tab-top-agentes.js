/* ============================================================
   tabs/tab-top-agentes.js — Tab: Top Faltas por Agente
   Calcula o total de faltas por agente, renderiza a tabela
   e exibe o modal com o histórico de faltas ao clicar.

   Para alterar:
     - cálculo do ranking      → calcularTopFaltasAgente()
     - visual da tabela        → renderTabTopAgentes()
     - conteúdo do modal       → showModalAgente()

   Depende de: state.js, utils.js (escapeHtml)
   ============================================================ */

// ─── CÁLCULO ───

/**
 * Conta o total de faltas por agente a partir de rawData completo.
 * @returns {Array<{agente, qtd}>} ordenado decrescente por qtd
 */
function calcularTopFaltasAgente() {
    const faltas = rawData.filter(r => r['Tipo'] === 'FALTA');
    const map = {};
    faltas.forEach(r => {
        const nome = r['Nome do agente'];
        if (!map[nome]) map[nome] = 0;
        map[nome]++;
    });
    return Object.entries(map)
        .map(([agente, qtd]) => ({ agente, qtd }))
        .sort((a, b) => b.qtd - a.qtd);
}

// ─── RENDER DA TABELA ───

/**
 * Preenche o tbody da tab "Top Faltas por Agente".
 */
function renderTabTopAgentes() {
    const data = calcularTopFaltasAgente();
    const tbody = document.getElementById('tbody-top-agentes');
    tbody.innerHTML = '';
    data.forEach(item => {
        const tr = document.createElement('tr');
        tr.dataset.agente = item.agente;
        tr.addEventListener('click', () => showModalAgente(item.agente));
        tr.innerHTML = `
            <td><strong>${escapeHtml(item.agente)}</strong></td>
            <td class="num-col">${item.qtd}</td>
        `;
        tbody.appendChild(tr);
    });
}

// ─── MODAL ───

/**
 * Exibe o modal com o histórico de faltas do agente selecionado.
 * @param {string} agente
 */
function showModalAgente(agente) {
    const faltas = rawData.filter(r => r['Tipo'] === 'FALTA' && r['Nome do agente'] === agente);
    document.getElementById('modal-agente-nome').textContent = agente;

    const tbody = document.getElementById('modal-agente-tabela');
    tbody.innerHTML = '';
    faltas.forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${r['Data Relatório']}</td>
            <td>${escapeHtml(r['Nome Supervisor'] || '-')}</td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById('modal-agente-total').textContent = faltas.length + ' registro(s)';
    document.getElementById('modal-agente-detalhes').style.display = 'flex';
    blockBodyScroll();
    document.addEventListener('keydown', modalEscHandlerAgente);
}

function closeModalAgente(e) {
    if (e && e.target !== e.currentTarget) return;
    document.getElementById('modal-agente-detalhes').style.display = 'none';
    allowBodyScroll();
    document.removeEventListener('keydown', modalEscHandlerAgente);
}


function modalEscHandlerAgente(e) {
    if (e.key === 'Escape') { closeModalAgente(); }
}
