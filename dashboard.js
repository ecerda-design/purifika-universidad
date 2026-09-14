const usuario = requireSession();
document.getElementById('nombreUsuario').textContent = usuario ? usuario.Nombre : '';

function formatoDuracion(segundos) {
  const horas = segundos / 3600;
  if (horas < 1) return Math.round(segundos / 60) + ' min';
  return horas.toFixed(1).replace(/\.0$/, '') + ' h';
}

async function cargar() {
  const res = await api('getDashboard', {});
  const cont = document.getElementById('cursos');
  if (res.error) { cont.innerHTML = '<div class="panel">' + res.error + '</div>'; return; }

  cont.innerHTML = res.cursos.map(curso => {
    const total = curso.Videos.length;
    const completados = curso.Videos.filter(v => v.Estatus === 'completado').length;
    return `
    <div class="panel curso-block">
      <div class="curso-header">
        <h2>${curso.Nombre}</h2>
        <span class="tag">${completados}/${total} completados</span>
      </div>
      ${curso.Videos.map((v, i) => `
        <div class="video-row ${v.Estatus === 'completado' ? 'completado' : ''} ${v.Bloqueado ? 'bloqueado' : ''}">
          <div class="num">${v.Estatus === 'completado' ? '✓' : (i + 1)}</div>
          <div class="info">
            <div class="titulo">${v.Titulo} <span class="meta">· ${formatoDuracion(v.Duracion_Seg)}</span>${v.TieneExamen ? ' <span class="meta">· con examen</span>' : ''}</div>
            <div class="meta">${v.Bloqueado ? 'Completa el video anterior para desbloquear' : (v.Estatus === 'completado' ? 'Completado' : 'Pendiente')}</div>
          </div>
          <a class="btn-ver" href="player.html?id=${v.ID_Video}">${v.Estatus === 'completado' ? 'Repasar' : 'Ver'} →</a>
        </div>
      `).join('')}
    </div>`;
  }).join('') || '<div class="panel">No tienes cursos asignados todavía.</div>';
}
cargar();
