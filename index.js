document.getElementById('loginForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  const errEl = document.getElementById('loginError');
  errEl.textContent = '';
  const correo = document.getElementById('correo').value.trim();
  const password = document.getElementById('password').value;
  try {
    const res = await api('login', { correo, password });
    if (res.error) { errEl.textContent = res.error; return; }
    // Token en sessionStorage, nunca localStorage (checklist de seguridad)
    sessionStorage.setItem('pu_token', res.token);
    sessionStorage.setItem('pu_usuario', JSON.stringify(res.usuario));
    window.location.href = (res.usuario.Rol === 'admin') ? 'admin.html' : 'dashboard.html';
  } catch (err) {
    errEl.textContent = 'No se pudo conectar. Intenta de nuevo.';
  }
});
