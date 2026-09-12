const usuario = requireSession();
if (usuario && usuario.Rol !== 'admin') window.location.href = 'dashboard.html';
document.getElementById('nombreUsuario').textContent = usuario ? usuario.Nombre : '';

document.querySelectorAll('.accordion-header').forEach(h => {
  h.addEventListener('click', () => h.parentElement.classList.toggle('open'));
});

async function cargarStats() {
  const res = await api('adminStats', {});
  if (res.error) return;
  const s = res.stats;
  document.getElementById('statGrid').innerHTML = `
    <div class="stat-card"><div class="num">${s.totalUsuarios}</div><div class="label">Usuarios activos</div></div>
    <div class="stat-card"><div class="num">${s.videosCompletados}</div><div class="label">Videos completados</div></div>
    <div class="stat-card"><div class="num">${s.videosEnProgreso}</div><div class="label">En progreso</div></div>
    <div class="stat-card"><div class="num">${s.certificadosEmitidos}</div><div class="label">Certificados emitidos</div></div>
  `;
}

let todosUsuarios = [];
async function cargarUsuarios() {
  const res = await api('adminListaUsuarios', {});
  if (res.error) return;
  todosUsuarios = res.usuarios;

  const franquicias = [...new Set(todosUsuarios.map(u => u.Franquicia).filter(Boolean))].sort();
  document.getElementById('f-franquicia').innerHTML = '<label><input type="checkbox" class="filtro-franquicia" value="__todas" checked> Todas</label>' +
    franquicias.map(f => `<br><label><input type="checkbox" class="filtro-franquicia" value="${f}" checked> ${f}</label>`).join('');

  const perfiles = [...new Set(todosUsuarios.flatMap(u => (u.Filtros_Perfil || '').split(',').map(s => s.trim()).filter(Boolean)))].sort();
  document.getElementById('f-perfil').innerHTML = '<label><input type="checkbox" class="filtro-perfil" value="__todos" checked> Todos</label>' +
    perfiles.map(p => `<br><label><input type="checkbox" class="filtro-perfil" value="${p}" checked> ${p}</label>`).join('');

  document.querySelectorAll('#acordeon input').forEach(inp => inp.addEventListener('change', renderTabla));
  renderTabla();
}

function renderTabla() {
  const franquiciasSel = [...document.querySelectorAll('.filtro-franquicia:checked')].map(i => i.value);
  const incluyeTodasFranquicias = franquiciasSel.includes('__todas');
  const perfilesSel = [...document.querySelectorAll('.filtro-perfil:checked')].map(i => i.value);
  const incluyeTodosPerfiles = perfilesSel.includes('__todos');

  const filtrados = todosUsuarios.filter(u =>
    (incluyeTodasFranquicias || franquiciasSel.includes(u.Franquicia)) &&
    (incluyeTodosPerfiles || (u.Filtros_Perfil || '').split(',').some(p => perfilesSel.includes(p.trim())))
  );

  document.querySelector('#tablaUsuarios tbody').innerHTML = filtrados.map(u => `
    <tr>
      <td>${u.Nombre}</td>
      <td>${u.Correo}</td>
      <td>${u.Franquicia || '—'}</td>
      <td>${u.Filtros_Perfil || '—'}</td>
      <td><span class="badge ${u.Activo ? 'ok' : 'pend'}">${u.Activo ? 'Activo' : 'Inactivo'}</span></td>
    </tr>
  `).join('') || '<tr><td colspan="5">Sin resultados</td></tr>';
}

cargarStats();
cargarUsuarios();
