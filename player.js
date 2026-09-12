const usuario = requireSession();
document.getElementById('nombreUsuario').textContent = usuario ? usuario.Nombre : '';
const params = new URLSearchParams(window.location.search);
const idVideo = params.get('id');
let videoActual = null;
let checkpointsMostrados = new Set();

async function cargar() {
  const res = await api('getVideo', { idVideo });
  if (res.error) { document.getElementById('tituloVideo').textContent = res.error; return; }
  videoActual = res.video;
  document.getElementById('tituloVideo').textContent = videoActual.Titulo;

  // Vimeo: convertir vimeo.com/ID(/hash) al embed de player.vimeo.com/video/ID(?h=hash)
  const m = (videoActual.URL_Vimeo || '').match(/vimeo\.com\/(\d+)(?:\/([a-zA-Z0-9]+))?/);
  const embedUrl = m ? `https://player.vimeo.com/video/${m[1]}${m[2] ? '?h=' + m[2] : ''}` : videoActual.URL_Vimeo;
  document.getElementById('videoFrame').src = embedUrl;

  // Nota: Vimeo permite eventos de tiempo reales vía su Player SDK (@vimeo/player),
  // pero para mantener el frontend sin dependencias de build se simula el avance con
  // un temporizador basado en Duracion_Seg y se guarda progreso periódicamente;
  // los checkpoints se muestran en los segundos definidos en Checkpoints_JSON.
  // (Mejora futura: cargar player.js de Vimeo y usar player.on('timeupdate') para precisión real.)
  simularSeguimiento();
}

function simularSeguimiento() {
  let segundo = 0;
  const duracion = videoActual.Duracion_Seg || 300;
  const intervalo = setInterval(async () => {
    segundo += 5;
    (videoActual.Checkpoints || []).forEach(cp => {
      if (segundo >= cp.segundo && !checkpointsMostrados.has(cp.segundo)) {
        checkpointsMostrados.add(cp.segundo);
        mostrarCheckpoint(cp.mensaje);
      }
    });
    const res = await api('updateProgreso', { idVideo, segundoActual: Math.min(segundo, duracion) });
    if (segundo >= duracion) {
      clearInterval(intervalo);
      if (res.completadoSinExamen) {
        document.getElementById('videoHint').textContent = 'Video completado. ¡Buen trabajo!';
        document.getElementById('examenWrap').innerHTML = '<a class="btn" href="dashboard.html">Continuar →</a>';
      } else {
        habilitarExamen();
      }
    }
  }, 5000);
}

function mostrarCheckpoint(mensaje) {
  const el = document.getElementById('checkpointMsg');
  el.textContent = mensaje;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 6000);
}

function habilitarExamen() {
  document.getElementById('videoHint').textContent = 'Video completado. Responde el examen para continuar.';
  const wrap = document.getElementById('examenWrap');
  const preguntas = videoActual.Preguntas || [];
  wrap.innerHTML = `
    <div class="examen" id="examen">
      <h2>Examen</h2>
      <div id="preguntas">
        ${preguntas.map((p, i) => `
          <div class="pregunta" data-pregunta="${p.ID_Pregunta}">
            <p>${i + 1}. ${p.Pregunta}</p>
            ${['A','B','C','D'].filter(op => p['Opcion_' + op]).map(op => `
              <label class="opcion">
                <input type="radio" name="p_${p.ID_Pregunta}" value="${op}"> ${p['Opcion_' + op]}
              </label>
            `).join('')}
          </div>
        `).join('') || '<p>Este video no tiene preguntas registradas todavía.</p>'}
      </div>
      <button class="btn" id="btnEnviar">Enviar respuestas</button>
    </div>`;
  document.getElementById('btnEnviar').addEventListener('click', enviarExamen);
}

async function enviarExamen() {
  const respuestas = {}; // recolectar de inputs renderizados por pregunta
  document.querySelectorAll('#preguntas [data-pregunta]').forEach(p => {
    const seleccionado = p.querySelector('input:checked');
    if (seleccionado) respuestas[p.dataset.pregunta] = seleccionado.value;
  });
  const res = await api('submitExamen', { idVideo, respuestas });
  if (res.error) { alert(res.error); return; }
  if (res.aprobado) {
    alert('¡Aprobado! Calificación: ' + res.calificacion + '%');
    window.location.href = 'dashboard.html';
  } else {
    alert('No alcanzaste el mínimo (' + res.minimo + '%). Tu calificación: ' + res.calificacion + '%. Vuelve a intentarlo.');
  }
}

cargar();
