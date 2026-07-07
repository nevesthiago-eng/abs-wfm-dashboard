/* ============================================================
   core/filters.js — Filtros Inteligentes do Dashboard
   Os filtros de UG e Data são interdependentes:
   - Ao mudar UG   → Data exibe apenas datas com dados naquela UG
   - Ao mudar Data → UG exibe apenas UGs com dados naquela data
   Depende de: state.js, data.js (renderDashboard via app.js)
   ============================================================ */

// ─── HELPERS: CÁLCULO DINÂMICO DAS OPÇÕES ───

/**
 * Retorna as UGs que possuem dados, opcionalmente filtradas por data.
 * @param {string} selectedDate - valor do select de data ('todas' ou 'DD/MM/YYYY')
 */
function getAvailableUGs(selectedDate) {
    const base = (selectedDate && selectedDate !== 'todas')
        ? rawData.filter(r => r['Data Relatório'] === selectedDate)
        : rawData;
    return [...new Set(base.map(r => r['UG']).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

/**
 * Retorna as datas que possuem dados, opcionalmente filtradas por UG.
 * Resultado sempre em ordem cronológica crescente.
 * @param {string} selectedUG - valor do select de UG ('todas' ou nome da UG)
 */
function getAvailableDates(selectedUG) {
    const base = (selectedUG && selectedUG !== 'todas')
        ? rawData.filter(r => r['UG'] === selectedUG)
        : rawData;
    const dateSet = [...new Set(base.map(r => r['Data Relatório']).filter(Boolean))];
    dateSet.sort((a, b) => {
        const [da, ma, aa] = a.split('/');
        const [db, mb, ab] = b.split('/');
        return new Date(aa, ma - 1, da) - new Date(ab, mb - 1, db);
    });
    return dateSet;
}

// ─── POPULADORES INDIVIDUAIS ───

/**
 * Repopula o select de UG com base na data selecionada.
 * Tenta preservar a seleção atual; cai para 'Magalu' ou 'todas'.
 * @param {string} currentSelectedDate
 */
function repopulateUGSelect(currentSelectedDate) {
    const selUg = document.getElementById('filter-ug');
    const previousUg = selUg.value;

    const ugSet = getAvailableUGs(currentSelectedDate);

    selUg.innerHTML = '<option value="todas">Todas as UGs</option>';
    ugSet.forEach(ug => {
        const opt = document.createElement('option');
        opt.value = ug;
        opt.textContent = ug;
        selUg.appendChild(opt);
    });

    // Preserva seleção anterior se ainda disponível
    if (previousUg && previousUg !== 'todas' && ugSet.includes(previousUg)) {
        selUg.value = previousUg;
    } else if (ugSet.includes('Magalu')) {
        selUg.value = 'Magalu';
    }
    // Se nenhum dos acima, fica em 'todas'
}

/**
 * Repopula o select de Data com base na UG selecionada.
 * Tenta preservar a seleção atual; cai para a data mais recente.
 * @param {string} currentSelectedUG
 */
function repopulateDateSelect(currentSelectedUG) {
    const selData = document.getElementById('filter-data');
    const previousDate = selData.value;

    const dateSet = getAvailableDates(currentSelectedUG);

    selData.innerHTML = '<option value="todas">Todas as datas</option>';
    dateSet.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d;
        opt.textContent = d;
        selData.appendChild(opt);
    });

    // Preserva seleção anterior se ainda disponível
    if (previousDate && previousDate !== 'todas' && dateSet.includes(previousDate)) {
        selData.value = previousDate;
    } else if (dateSet.length > 0) {
        // Seleciona a data mais recente
        selData.value = dateSet[dateSet.length - 1];
    }
    // Se nenhum dos acima, fica em 'todas'
}

// ─── POPULAÇÃO INICIAL ───

/**
 * População inicial chamada logo após o carregamento dos dados.
 * Define os defaults: Magalu (se existir) + data mais recente para essa UG.
 */
function populateFilters() {
    // 1ª passagem: popula UG sem filtro de data para descobrir se Magalu existe
    repopulateUGSelect('todas');

    const selUg = document.getElementById('filter-ug');

    // Aplica default de UG (Magalu ou primeira)
    const ugSet = getAvailableUGs('todas');
    if (ugSet.includes('Magalu')) {
        selUg.value = 'Magalu';
    }

    // 2ª passagem: popula datas já filtradas pela UG selecionada
    repopulateDateSelect(selUg.value);
}

// ─── APLICA FILTROS E DISPARA RENDER ───

function applyFilters() {
    const ug   = document.getElementById('filter-ug').value;
    const data = document.getElementById('filter-data').value;
    const modo = document.getElementById('filter-modo').value;

    filteredData = rawData.filter(r => {
        if (ug   !== 'todas' && r['UG']              !== ug)   return false;
        if (data !== 'todas' && r['Data Relatório']  !== data) return false;
        return true;
    });

    if (filteredData.length === 0) {
        showWarning('Nenhum dado encontrado para os filtros selecionados.');
        document.getElementById('kpi-row').style.display = 'none';
        document.getElementById('chart-entrada-container').style.display = 'none';
        document.getElementById('chart-saida-container').style.display = 'none';
        document.getElementById('analytics-section').style.display = 'none';
        return;
    }

    renderDashboard(modo);
}

// ─── LISTENERS DOS FILTROS ───

function setupFilterListeners() {
    // Ao mudar UG → repopula datas disponíveis para aquela UG → aplica
    document.getElementById('filter-ug').addEventListener('change', function () {
        repopulateDateSelect(this.value);
        applyFilters();
    });

    // Ao mudar Data → repopula UGs disponíveis naquela data → aplica
    document.getElementById('filter-data').addEventListener('change', function () {
        repopulateUGSelect(this.value);
        applyFilters();
    });

    // Modo (entrada/saida/ambos) não afeta filtros, apenas re-renderiza
    document.getElementById('filter-modo').addEventListener('change', applyFilters);

    // Troca de mês: zera tudo e recarrega planilha
    document.getElementById('filter-mes').addEventListener('change', function () {
        const newId = this.value;
        if (!newId || newId === currentSpreadsheetId) return;
        currentSpreadsheetId = newId;
        rawData = [];
        filteredData = [];
        destroyCharts();
        document.getElementById('kpi-row').style.display = 'none';
        document.getElementById('chart-entrada-container').style.display = 'none';
        document.getElementById('chart-saida-container').style.display = 'none';
        document.getElementById('analytics-section').style.display = 'none';
        showLoading(true);
        fetchSheetData();
    });
}
