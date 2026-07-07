/* ============================================================
   tabs/tab-falta-supervisor.js — Tab: Falta por Supervisor
   Calcula faltas agrupadas por supervisor, renderiza a tabela
   e exibe o modal de detalhes ao clicar numa linha.

   Para alterar:
     - cálculo do agrupamento  → calcularFaltaPorSupervisor()
     - visual da tabela        → renderTabFaltaSup()
     - conteúdo do modal       → showModalSup()

   Depende de: state.js, utils.js (escapeHtml)
   ============================================================ */

// ─── CÁLCULO ───

/**
 * Agrupa todas as faltas (rawData completo) por supervisor.
 * @returns {Array<{supervisor, qtd}>} ordenado decrescente por qtd
 */
function calcularFaltaPorSupervisor() {
    const faltas = rawData.filter(r => r['Tipo'] === 'FALTA');
    const map = {};
    faltas.forEach(r => {
        const sup = r['Nome Supervisor'] || 'Sem supervisor';
        if (!map[sup]) map[sup] = 0;
        map[sup]++;
    });
    return Object.entries(map)
        .map(([supervisor, qtd]) => ({ supervisor, qtd }))
        .sort((a, b) => b.qtd - a.qtd);
}

// ─── RENDER DA TABELA ───

/**
 * Preenche o tbody da tab "Falta por Supervisor".
 */
function renderTabFaltaSup() {
    const data = calcularFaltaPorSupervisor();
    const tbody = document.getElementById('tbody-falta-sup');
    tbody.innerHTML = '';
    data.forEach(item => {
        const tr = document.createElement('tr');
        tr.dataset.supervisor = item.supervisor;
        tr.addEventListener('click', () => showModalSup(item.supervisor));
        tr.innerHTML = `
            <td><strong>${escapeHtml(item.supervisor)}</strong></td>
            <td class="num-col">${item.qtd}</td>
        `;
        tbody.appendChild(tr);
    });
}

// ─── MODAL ───

/**
 * Exibe o modal com os agentes que faltaram sob o supervisor selecionado.
 * @param {string} supervisor
 */
function showModalSup(supervisor) {
    const faltas = rawData.filter(r => r['Tipo'] === 'FALTA' && r['Nome Supervisor'] === supervisor);
    document.getElementById('modal-sup-nome').textContent = supervisor;

    const tbody = document.getElementById('modal-sup-tabela');
    tbody.innerHTML = '';
    faltas.forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${escapeHtml(r['Nome do agente'])}</strong></td>
            <td>${r['Data Relatório']}</td>
            <td>${escapeHtml(r['Nome Supervisor'] || '-')}</td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById('modal-sup-total').textContent = faltas.length + ' registro(s)';
    document.getElementById('modal-sup-detalhes').style.display = 'flex';
    blockBodyScroll();
    document.addEventListener('keydown', modalEscHandlerSup);
}

function closeModalSup(e) {
    if (e && e.target !== e.currentTarget) return;
    document.getElementById('modal-sup-detalhes').style.display = 'none';
    allowBodyScroll();
    document.removeEventListener('keydown', modalEscHandlerSup);
}


function modalEscHandlerSup(e) {
    if (e.key === 'Escape') { closeModalSup(); }
}
