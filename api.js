// Cliente API — envía siempre appKey (clave de app, no secreto de usuario) y token de sesión.
async function api(action, payload) {
  const body = {
    action,
    appKey: APP_KEY, // definida en config.js — identifica al frontend, no autentica usuarios
    payload: Object.assign({}, payload, { token: sessionStorage.getItem('pu_token') })
  };
  const res = await fetch(WEB_APP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // evita preflight CORS con Apps Script
    body: JSON.stringify(body)
  });
  return res.json();
}

function requireSession(redirectTo) {
  const token = sessionStorage.getItem('pu_token');
  if (!token) { window.location.href = redirectTo || 'index.html'; return null; }
  return JSON.parse(sessionStorage.getItem('pu_usuario') || '{}');
}

async function logout() {
  try { await api('logout', {}); } catch (e) {}
  sessionStorage.clear();
  window.location.href = 'index.html';
}
