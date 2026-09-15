const usuario = requireSession();
if (usuario && usuario.Rol !== 'admin') window.location.href = 'dashboard.html';
document.getElementById('nombreUsuario').textContent = usuario ? usuario.Nombre : '';

document.querySelectorAll('.accordion-header').forEach(h => {
  h.addEventListener('click', () => h.parentElement.classList.toggle('open'));
});

// ============================================================
// Tabs
// ============================================================
function cambiarTab(tab) {
  document.querySelectorAll('.admin-tabs button').forEach(b => b.classList.toggle('activo', b.dataset.tab === tab));
  document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('activo'));
  document.getElementById('panel-' + tab).classList.add('activo');
  if (tab === 'matriz' && !matrizCargada) cargarMatriz();
  if (tab === 'contenido' && !contenidoCargado) cargarContenido();
}

// ============================================================
// Resumen (stats)
// ============================================================
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

// ============================================================
// Usuarios
// ============================================================
let todosUsuarios = [];
let catalogoPuestos = [];

async function cargarCatalogoPuestos() {
  const res = await api('adminCatalogoPuestos', {});
  if (res.error) return;
  catalogoPuestos = res.puestos || [];
  const selectModal = document.getElementById('f_Puesto');
  selectModal.innerHTML = '<option value="">Selecciona…</option>' +
    catalogoPuestos.map(p => `<option value="${p.Puesto}">${p.Puesto} (${p.Area})</option>`).join('');
  const selectVerComo = document.getElementById('selectVerComo');
  selectVerComo.innerHTML = '<option value="">— Vista completa (admin) —</option>' +
    catalogoPuestos.map(p => `<option value="${p.Puesto}">${p.Puesto}</option>`).join('');
}

async function cargarUsuarios() {
  const res = await api('adminListaUsuariosV2', {});
  if (res.error) return;
  todosUsuarios = res.usuarios;

  const franquicias = [...new Set(todosUsuarios.map(u => u.Franquicia).filter(Boolean))].sort();
  document.getElementById('f-franquicia').innerHTML = '<label><input type="checkbox" class="filtro-franquicia" value="__todas" checked> Todas</label>' +
    franquicias.map(f => `<br><label><input type="checkbox" class="filtro-franquicia" value="${f}" checked> ${f}</label>`).join('');

  const puestos = [...new Set(todosUsuarios.map(u => u.Puesto).filter(Boolean))].sort();
  document.getElementById('f-puesto').innerHTML = '<label><input type="checkbox" class="filtro-puesto" value="__todos" checked> Todos</label>' +
    puestos.map(p => `<br><label><input type="checkbox" class="filtro-puesto" value="${p}" checked> ${p}</label>`).join('');

  document.querySelectorAll('#acordeon input').forEach(inp => inp.addEventListener('change', renderTabla));
  renderTabla();
}

function renderTabla() {
  const franquiciasSel = [...document.querySelectorAll('.filtro-franquicia:checked')].map(i => i.value);
  const incluyeTodasFranquicias = franquiciasSel.includes('__todas');
  const puestosSel = [...document.querySelectorAll('.filtro-puesto:checked')].map(i => i.value);
  const incluyeTodosPuestos = puestosSel.includes('__todos');
  const estatus = (document.querySelector('input[name="estatus"]:checked') || {}).value || '__todos';

  const filtrados = todosUsuarios.filter(u =>
    (incluyeTodasFranquicias || franquiciasSel.includes(u.Franquicia)) &&
    (incluyeTodosPuestos || puestosSel.includes(u.Puesto)) &&
    (estatus === '__todos' || (estatus === 'activo') === !!u.Activo)
  );

  document.querySelector('#tablaUsuarios tbody').innerHTML = filtrados.map(u => `
    <tr>
      <td>${u.Nombre} ${u.Apellido_Paterno || ''}</td>
      <td>${u.Correo}</td>
      <td>${u.Puesto || '—'}</td>
      <td>${u.Rol === 'admin' ? 'Administrador' : 'Usuario'}</td>
      <td><span class="badge ${u.Activo ? 'ok' : 'pend'}">${u.Activo ? 'Activo' : 'Inactivo'}</span></td>
      <td style="white-space:nowrap;">
                <button class="btn-mini" onclick="abrirModalUsuarioPorId('${u.ID_Usuario}')">Editar</button>
        <button class="btn-mini ${u.Activo ? 'peligro' : ''}" onclick="cambiarEstatus('${u.ID_Usuario}')">${u.Activo ? 'Desactivar' : 'Activar'}</button>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="6">Sin resultados</td></tr>';
}

async function cambiarEstatus(idUsuario) {
  const res = await api('adminCambiarEstatusUsuario', { idUsuario });
  if (res.error) { alert(res.error); return; }
  await cargarUsuarios();
}

function abrirModalUsuarioPorId(idUsuario) {
    abrirModalUsuario(todosUsuarios.find(u => u.ID_Usuario === idUsuario));
}

function abrirModalUsuario(u) {
  document.getElementById('formUsuario').reset();
  document.getElementById('errorUsuario').textContent = '';
  const esEdicion = !!(u && u.ID_Usuario);
  document.getElementById('modalTitulo').textContent = esEdicion ? 'Editar usuario' : 'Nuevo usuario';
  document.getElementById('labelPassword').textContent = esEdicion ? 'Nueva contraseña (dejar en blanco para no cambiar)' : 'Contraseña *';
  document.getElementById('f_Password').required = !esEdicion;
  document.getElementById('f_ID_Usuario').value = esEdicion ? u.ID_Usuario : '';
  document.getElementById('f_Correo').disabled = esEdicion;
  ['Nombre','Apellido_Paterno','Apellido_Materno','Correo','Telefono','Departamento','Genero',
   'Fecha_Nacimiento','Puesto','Franquicia','Rol','Foto_URL'].forEach(campo => {
    const el = document.getElementById('f_' + campo);
    if (el) el.value = (u && u[campo]) || (campo === 'Rol' ? 'usuario' : '');
  });
  document.getElementById('modalUsuario').classList.add('show');
}

function cerrarModalUsuario() {
  document.getElementById('modalUsuario').classList.remove('show');
}

async function guardarUsuario(evt) {
  evt.preventDefault();
  const errEl = document.getElementById('errorUsuario');
  errEl.textContent = '';
  const idEditar = document.getElementById('f_ID_Usuario').value;

  const datos = {
    Nombre: document.getElementById('f_Nombre').value.trim(),
    Apellido_Paterno: document.getElementById('f_Apellido_Paterno').value.trim(),
    Apellido_Materno: document.getElementById('f_Apellido_Materno').value.trim(),
    Correo: document.getElementById('f_Correo').value.trim(),
    Telefono: document.getElementById('f_Telefono').value.trim(),
    Departamento: document.getElementById('f_Departamento').value.trim(),
    Genero: document.getElementById('f_Genero').value,
    Fecha_Nacimiento: document.getElementById('f_Fecha_Nacimiento').value,
    Puesto: document.getElementById('f_Puesto').value,
    Franquicia: document.getElementById('f_Franquicia').value.trim(),
    Rol: document.getElementById('f_Rol').value,
    Foto_URL: document.getElementById('f_Foto_URL').value.trim()
  };
  const password = document.getElementById('f_Password').value;
  if (password) datos.Password = password;

  let res;
  if (idEditar) {
    datos.ID_Usuario = idEditar;
    res = await api('adminEditarUsuario', { usuario: datos });
  } else {
    res = await api('adminCrearUsuario', { usuario: datos });
  }
  if (res.error) { errEl.textContent = res.error; return false; }
  cerrarModalUsuario();
  await cargarUsuarios();
  return false;
}

// ============================================================
// Matriz de acceso
// ============================================================
let matrizCargada = false;
let matrizOriginal = {}; // Puesto -> Set(categorias)
let matrizCategorias = [];

async function cargarMatriz() {
  const res = await api('adminObtenerMatrizAcceso', {});
  if (res.error) return;
  matrizCargada = true;
  matrizCategorias = res.categorias;
  matrizOriginal = {};
  res.matriz.forEach(fila => {
    matrizOriginal[fila.Puesto] = new Set((fila.Categorias_Visibles || '').split(',').map(s => s.trim()).filter(Boolean));
  });

  const thead = '<thead><tr><th>Puesto</th><th>Área</th>' +
    matrizCategorias.map(c => `<th class="col-cat">${c}</th>`).join('') + '</tr></thead>';
  const tbody = '<tbody>' + res.matriz.map(fila => `
    <tr data-puesto="${fila.Puesto}">
      <td>${fila.Puesto}</td>
      <td>${fila.Area}</td>
      ${matrizCategorias.map(c => `
        <td class="col-cat"><input type="checkbox" data-cat="${c}" ${matrizOriginal[fila.Puesto].has(c) ? 'checked' : ''} onchange="marcarCambio('${fila.Puesto}')"></td>
      `).join('')}
    </tr>`).join('') + '</tbody>';

  document.getElementById('tablaMatriz').innerHTML = thead + tbody;
}

function marcarCambio(puesto) {
  const fila = document.querySelector(`#tablaMatriz tr[data-puesto="${CSS.escape(puesto)}"]`);
  if (!fila) return;
  const actuales = new Set([...fila.querySelectorAll('input:checked')].map(i => i.dataset.cat));
  const original = matrizOriginal[puesto] || new Set();
  const cambio = actuales.size !== original.size || [...actuales].some(c => !original.has(c));
  fila.classList.toggle('fila-cambiada', cambio);
}

async function guardarMatriz() {
  const filasCambiadas = document.querySelectorAll('#tablaMatriz tr.fila-cambiada');
  if (!filasCambiadas.length) { alert('No hay cambios para guardar.'); return; }
  const cambios = [...filasCambiadas].map(fila => ({
    Puesto: fila.dataset.puesto,
    Categorias_Visibles: [...fila.querySelectorAll('input:checked')].map(i => i.dataset.cat)
  }));
  const res = await api('adminGuardarMatrizAcceso', { cambios });
  if (res.error) { alert(res.error); return; }
  await cargarMatriz();
  alert('Matriz de acceso actualizada.');
}

// ============================================================
// Contenido (solo admin)
// ============================================================
let contenidoCargado = false;
let todoElContenido = [];

async function cargarContenido() {
  const res = await api('adminListaVideos', {});
  if (res.error) return;
  contenidoCargado = true;
  todoElContenido = res.videos.sort((a, b) => (a.ID_Curso + a.Orden) > (b.ID_Curso + b.Orden) ? 1 : -1);
  renderContenido(todoElContenido);
}

function renderContenido(videos) {
  document.querySelector('#tablaContenido tbody').innerHTML = videos.map(v => `
    <tr>
      <td>${v.ID_Curso.replace('MODULO_', 'Módulo ')}</td>
      <td>${v.Titulo}</td>
      <td>${v.Categoria || '—'}</td>
      <td>${v.Dirigido || '—'}</td>
    </tr>
  `).join('') || '<tr><td colspan="4">Sin videos</td></tr>';
}

function filtrarContenidoPorPuesto() {
  const puesto = document.getElementById('selectVerComo').value;
  if (!puesto) { renderContenido(todoElContenido); return; }
  const catsPuesto = matrizOriginal[puesto];
  if (!catsPuesto) {
    // matriz aún no cargada en esta sesión: cargarla silenciosamente
    api('adminObtenerMatrizAcceso', {}).then(res => {
      if (res.error) return;
      res.matriz.forEach(fila => {
        matrizOriginal[fila.Puesto] = new Set((fila.Categorias_Visibles || '').split(',').map(s => s.trim()).filter(Boolean));
      });
      filtrarContenidoPorPuesto();
    });
    return;
  }
  renderContenido(todoElContenido.filter(v => catsPuesto.has(v.Categoria)));
}

cargarStats();
cargarCatalogoPuestos();
cargarUsuarios();
