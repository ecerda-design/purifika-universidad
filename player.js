const usuario = requireSession();
document.getElementById('nombreUsuario').textContent = usuario ? usuario.Nombre : '';
const params = new URLSearchParams(window.location.search);
const idVideo = params.get('id');
let videoActual = null;
let checkpointsMostrados = new Set();
let seguimientoIniciado = false;
let inicioReal = null; // timestamp real (Date.now()) de cuando se abrió el video

async function cargar() {
  const res = await api('getVideo', { idVideo });
  if (res.error) { document.getElementById('tituloVideo').textContent = res.error; return; }
  videoActual = res.video;
  document.getElementById('tituloVideo').textContent = videoActual.Titulo;

  // Nota: el video vive en Vimeo pero el embed en iframe está restringido por dominio
  // a nivel de cuenta de Vimeo (fuera de nuestro control), así que no hay forma de
  // recibir eventos reales de reproducción (play/pause/ended). En vez de simular con
  // un contador automático, se mide tiempo REAL transcurrido (Date.now()) desde que
  // el usuario abre el video, y al llegar a la duración del video se le pide una
  // confirmación explícita — no se auto-marca como visto.
  document.getElementById('videoLaunch').addEventListener('click', abrirVideo);
}

function abrirVideo() {
  window.open(videoActual.URL_Vimeo, '_blank', 'noopener');
  if (!seguimientoIniciado) {
    seguimientoIniciado = true;
    inicioReal = Date.now();
    const launch = document.getElementById('videoLaunch');
    launch.classList.add('reproduciendo');
    launch.querySelector('.video-launch-text').textContent = 'Video abierto en Vimeo';
    launch.querySelector('.video-launch-hint').textContent = 'Puedes volver a abrirlo si lo necesitas.';
    iniciarEspera();
  }
}

function iniciarEspera() {
  const duracion = videoActual.Duracion_Seg || 300;
  document.getElementById('videoHint').textContent = `Viendo el video… (${formatoTiempo(duracion)})`;

  const intervalo = setInterval(async () => {
    const transcurridoReal = Math.floor((Date.now() - inicioReal) / 1000);
    const segundo = Math.min(transcurridoReal, duracion);

    (videoActual.Checkpoints || []).forEach(cp => {
      if (segundo >= cp.segundo && !checkpointsMostrados.has(cp.segundo)) {
        checkpointsMostrados.add(cp.segundo);
        mostrarCheckpoint(cp.mensaje);
      }
    });

    // Se reporta progreso parcial (tope en 90% de la duración) para que el estatus
    // quede "en_progreso" sin cruzar el umbral de 95% que el backend usa para marcar
    // "completado" — esa marca final solo debe ocurrir en la confirmación explícita.
    const topeIntermedio = Math.floor(duracion * 0.9);
    await api('updateProgreso', { idVideo, segundoActual: Math.min(segundo, topeIntermedio) });

    if (transcurridoReal >= duracion) {
      clearInterval(intervalo);
      mostrarConfirmacionManual();
    } else {
      document.getElementById('videoHint').textContent = `Viendo el video… (${formatoTiempo(duracion - transcurridoReal)} restantes)`;
    }
  }, 5000);
}

function formatoTiempo(segundos) {
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function mostrarConfirmacionManual() {
  document.getElementById('videoHint').textContent = 'Ya pasó el tiempo de duración del video.';
  document.getElementById('confirmarWrap').innerHTML = `
    <div class="panel" style="background:#F1FCFC; border:1px solid var(--cyan); margin-top:12px;">
      <p style="margin:0 0 12px; font-size:14px;">Confirma que viste el video completo en Vimeo para continuar.</p>
      <button class="btn" id="btnConfirmarVisto">Ya vi el video completo</button>
    </div>`;
  document.getElementById('btnConfirmarVisto').addEventListener('click', confirmarVisto);
}

async function confirmarVisto() {
  const btn = document.getElementById('btnConfirmarVisto');
  btn.disabled = true;
  btn.textContent = 'Guardando…';
  const duracion = videoActual.Duracion_Seg || 300;
  const res = await api('updateProgreso', { idVideo, segundoActual: duracion });
  document.getElementById('confirmarWrap').innerHTML = '';
  if (res.completadoSinExamen) {
    document.getElementById('videoHint').textContent = 'Video completado. ¡Buen trabajo!';
    document.getElementById('examenWrap').innerHTML = '<a class="btn" href="dashboard.html">Continuar →</a>';
  } else {
    habilitarExamen();
  }
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
