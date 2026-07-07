/* ============================================================
   core/utils.js — Funções Utilitárias Puras
   Sem dependências de DOM. Reutilizáveis por qualquer módulo.
   ============================================================ */

/**
 * Normaliza uma string de horário para o formato "HH:MM".
 * Retorna string vazia se inválido.
 */
function normalizeTime(timeStr) {
    if (!timeStr || timeStr === '-' || timeStr.trim() === '') return '';
    const parts = String(timeStr).trim().split(':');
    if (parts.length < 2) return '';
    return parts[0].padStart(2, '0') + ':' + parts[1].padStart(2, '0');
}

/**
 * Arredonda um horário "HH:MM" para o intervalo de 5 minutos mais próximo.
 */
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
 * Converte uma data no formato "DD/MM/YYYY" para objeto Date.
 * Retorna null se inválido.
 */
function parseDateBR(str) {
    if (!str) return null;
    const parts = str.split('/');
    if (parts.length !== 3) return null;
    return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
}

/**
 * Retorna a diferença em dias absolutos entre dois objetos Date.
 */
function diffDias(a, b) {
    const ms = Math.abs(b - a);
    return Math.round(ms / (1000 * 60 * 60 * 24));
}

/**
 * Escapa HTML para evitar XSS ao inserir textos em innerHTML.
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Bloqueia o scroll do body (quando um modal é aberto).
 */
function blockBodyScroll() {
    document.body.style.overflow = 'hidden';
}

/**
 * Libera o scroll do body (quando um modal é fechado).
 */
function allowBodyScroll() {
    document.body.style.overflow = '';
}

