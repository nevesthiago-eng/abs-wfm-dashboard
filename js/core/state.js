/* ============================================================
   core/state.js — Estado Global do Dashboard
   Único ponto de verdade compartilhado entre todos os módulos.
   ============================================================ */

// Token de acesso OAuth do Google
let accessToken = null;

// Usuário autenticado (objeto retornado pela API Google)
let currentUser = null;

// ID da planilha atualmente selecionada
let currentSpreadsheetId = null;

// Dados brutos vindos do Google Sheets (todas as linhas processadas)
let rawData = [];

// Dados após aplicação dos filtros de UG, data e modo
let filteredData = [];

// Instâncias ativas dos gráficos Chart.js
const charts = { entrada: null, saida: null };
