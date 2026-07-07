// ============================================================
//  CONFIGURAÇÕES DO DASHBOARD
//  Altere apenas os valores abaixo conforme necessário
// ============================================================

const CONFIG = {
    // ID do cliente OAuth criado no Google Cloud Console
    clientId: '39900859751-d8ikke2njrnij8grr8airinmpe47tr01.apps.googleusercontent.com',

    // Lista de planilhas Google Sheets (uma por mês)
    // Para adicionar um novo mês, basta inserir { id, nome } neste array
    spreadsheets: [
        { id: '1EkNJQKm01WtDLxQGvjI4HhYfQ0aFn2uEDBEMEGSb1dI', nome: 'Julho' },
        { id: '1lQV5xzLwuJxvwjzPdX8tFxpfzzH61hT4whjox5jV_Og', nome: 'Junho' },
    ],

    // Nome da aba dentro de cada planilha (igual em todas)
    sheetName: 'Base',

    // Escopo de permissão (não alterar)
    scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',

    // Título do dashboard (aparece no cabeçalho)
    titulo: 'ABS WFM',

    // Subtítulo do dashboard
    subtitulo: 'Dashboard Operacional',
};
