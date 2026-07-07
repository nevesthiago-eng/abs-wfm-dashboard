/* ============================================================
   core/auth.js — Autenticação Google OAuth 2.0
   Gerencia login, logout e informações do usuário.
   Depende de: state.js, data.js (showDashboard via app.js)
   ============================================================ */

// Referência ao cliente OAuth do Google Identity Services
let tokenClient = null;

// ─── FALLBACK SE A BIBLIOTECA GOOGLE NÃO CARREGAR ───
function gsiLoadError() {
    document.getElementById('login-status').innerHTML =
        '<span style="color:#d93025;"><i class="fas fa-exclamation-circle"></i> ' +
        'A biblioteca de login do Google não pôde ser carregada. ' +
        'Verifique sua conexão com a internet.</span>';
}

// ─── INICIALIZA O CLIENTE OAUTH ───
function initAuth() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CONFIG.clientId,
        scope: CONFIG.scope,
        callback: handleTokenResponse,
        error_callback: (err) => {
            showError('Erro na autenticação: ' + (err.message || err.type || 'desconhecido'));
        },
    });

    document.getElementById('google-btn-wrapper').innerHTML = `
        <button id="login-btn-google" onclick="handleLogin()">
            <svg width="20" height="20" viewBox="0 0 48 48">
                <path fill="#4285F4" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#34A853" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.54 28.59A14.5 14.5 0 0 1 9.5 24c0-1.59.28-3.14.76-4.59l-7.98-6.19A23.99 23.99 0 0 0 0 24c0 3.77.87 7.35 2.56 10.78l7.98-6.19z"/>
                <path fill="#EA4335" d="M24 48c6.48 0 11.91-2.14 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.48 48 24 48z"/>
            </svg>
            Entrar com Google
        </button>
    `;
}

// ─── LOGIN ───
function handleLogin() {
    document.getElementById('login-status').textContent = '⏳ Abrindo janela de autenticação...';
    tokenClient.requestAccessToken();
}

function handleTokenResponse(response) {
    if (response.error) {
        showLoginError('Erro: ' + response.error + '. ' + (response.error_description || ''));
        return;
    }
    accessToken = response.access_token;

    fetchUserInfo().then(() => {
        showDashboard();
    }).catch(() => {
        showDashboard();
    });
}

// ─── BUSCA INFORMAÇÕES DO USUÁRIO ───
async function fetchUserInfo() {
    try {
        const resp = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: 'Bearer ' + accessToken }
        });
        if (resp.ok) {
            const info = await resp.json();
            currentUser = info;
            document.getElementById('user-avatar').src = info.picture;
            document.getElementById('user-name').textContent = info.name || info.email;
            document.getElementById('user-info').style.display = 'flex';
            document.getElementById('logout-btn').style.display = 'inline-block';
        }
    } catch (e) { /* não crítico */ }
}

// ─── LOGOUT ───
function handleLogout() {
    if (accessToken) {
        google.accounts.oauth2.revoke(accessToken, () => {});
    }
    accessToken = null;
    currentUser = null;
    rawData = [];
    filteredData = [];

    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('dashboard-screen').style.display = 'none';
    document.getElementById('user-info').style.display = 'none';
    document.getElementById('logout-btn').style.display = 'none';
    document.getElementById('login-status').textContent = '';

    destroyCharts();
}

// ─── UI HELPERS DE AUTH ───
function showLoginError(msg) {
    document.getElementById('login-status').innerHTML =
        '<span style="color:#d93025;"><i class="fas fa-exclamation-circle"></i> ' + msg + '</span>';
}
