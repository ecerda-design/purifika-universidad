const usuario = requireSession();
document.getElementById('nombreUsuario').textContent = usuario ? usuario.Nombre : '';
if (usuario && usuario.Rol === 'admin') document.getElementById('linkAdmin').style.display = '';

function formatoDuracion(segundos) {
  const horas = segundos / 3600;
  if (horas < 1) return Math.round(segundos / 60) + ' min';
  return horas.toFixed(1).replace(/\.0$/, '') + ' h';
}

function circulo(pct, size, grosor) {
  const r = (size - grosor) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct / 100);
  const clase = pct >= 100 ? 'progreso-circular completo' : 'progreso-circular';
  return `
    <div class="${clase}" style="width:${size}px;height:${size}px;">
      <svg width="${size}" height="${size}">
        <circle class="pista" cx="${size/2}" cy="${size/2}" r="${r}" stroke-width="${grosor}"></circle>
        <circle class="relleno" cx="${size/2}" cy="${size/2}" r="${r}" stroke-width="${grosor}"
          stroke-dasharray="${c}" stroke-dashoffset="${offset}"></circle>
      </svg>
      <div class="valor" style="font-size:${size/4.2}px;">${Math.round(pct)}%</div>
    </div>`;
}

function slug(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-');
}

let todosLosVideos = []; // [{video, curso}]
let categorias = [];

async function cargar() {
  const res = await api('getDashboardV2', {});
  const cont = document.getElementById('cursos');
  if (res.error) { cont.innerHTML = '<div class="panel">' + res.error + '</div>'; return; }

  todosLosVideos = [];
  (res.cursos || []).forEach(curso => {
    curso.Videos.forEach(v => todosLosVideos.push({ video: v, curso }));
  });

  const mapaCategorias = {};
  todosLosVideos.forEach(item => {
    const cat = item.video.Categoria || 'Tronco Común';
    if (!mapaCategorias[cat]) mapaCategorias[cat] = [];
    mapaCategorias[cat].push(item);
  });
  categorias = Object.keys(mapaCategorias);

  // Resumen general
  const totalVideos = todosLosVideos.length;
  const completados = todosLosVideos.filter(i => i.video.Estatus === 'completado').length;
  const pctGeneral = totalVideos ? (completados / totalVideos) * 100 : 0;
  if (totalVideos > 0) {
    document.getElementById('panelResumen').style.display = '';
    document.getElementById('anilloGeneral').outerHTML = circulo(pctGeneral, 86, 9);
    document.getElementById('resumenTexto').textContent = `${completados} de ${totalVideos} videos completados`;
  }

  // Navegación por categoría
  document.getElementById('categoriasNav').innerHTML = categorias.map(cat =>
    `<button data-cat="${slug(cat)}" onclick="irACategoria('${slug(cat)}')">${cat}</button>`
  ).join('');

  renderCategorias(mapaCategorias);
}

function renderCategorias(mapaCategorias, filtroTexto) {
  const cont = document.getElementById('cursos');
  const texto = (filtroTexto || '').trim().toLowerCase();

  const html = categorias.map(cat => {
    let items = mapaCategorias[cat];
    if (texto) items = items.filter(i => i.video.Titulo.toLowerCase().includes(texto));
    if (texto && items.length === 0) return '';

    const total = items.length;
    const completados = items.filter(i => i.video.Estatus === 'completado').length;
    const pct = total ? (completados / total) * 100 : 0;
    const abierto = !!texto; // si hay búsqueda, mostrar abierto

    return `
    <div class="categoria-bloque${abierto ? ' abierto' : ''}" id="cat-${slug(cat)}">
      <div class="categoria-header" onclick="toggleCategoria('${slug(cat)}')">
        ${circulo(pct, 44, 5)}
        <div class="info">
          <div class="nombre">${cat}</div>
          <div class="sub">${completados}/${total} completados</div>
        </div>
        <div class="flecha">▾</div>
      </div>
      <div class="categoria-body">
        <div class="categoria-body-inner">
          ${items.map(({video: v}) => `
            <div class="video-row ${v.Estatus === 'completado' ? 'completado' : ''} ${v.Bloqueado ? 'bloqueado' : ''}">
              <div class="num">${v.Estatus === 'completado' ? '✓' : '•'}</div>
              <div class="info">
                <div class="titulo">${v.Titulo} <span class="meta">· ${formatoDuracion(v.Duracion_Seg)}</span>${v.TieneExamen ? ' <span class="meta">· con examen</span>' : ''}</div>
                <div class="meta">${v.Bloqueado ? 'Completa el video anterior para desbloquear' : (v.Estatus === 'completado' ? 'Completado' : 'Pendiente')}</div>
              </div>
              <a class="btn-ver" href="player.html?id=${v.ID_Video}">${v.Estatus === 'completado' ? 'Repasar' : 'Ver'} →</a>
            </div>
          ).join('')}
        </div>
      </div>
    </div>`;
  }).join('');

  cont.innerHTML = html || '<div class="panel">No se encontraron videos.</div>';
}

function toggleCategoria(catSlug) {
  const el = document.getElementById('cat-' + catSlug);
  if (el) el.classList.toggle('abierto');
}

function irACategoria(catSlug) {
  const el = document.getElementById('cat-' + catSlug);
  if (!el) return;
  el.classList.add('abierto');
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  document.querySelectorAll('.categorias-nav button').forEach(b => b.classList.toggle('activo', b.dataset.cat === catSlug));
}

document.getElementById('buscador').addEventListener('input', (e) => {
  const mapaCategorias = {};
  todosLosVideos.forEach(item => {
    const cat = item.video.Categoria || 'Tronco Común';
    if (!mapaCategorias[cat]) mapaCategorias[cat] = [];
    mapaCategorias[cat].push(item);
  });
  renderCategorias(mapaCategorias, e.target.value);
});

cargar();
