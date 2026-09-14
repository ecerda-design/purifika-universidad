const usuario = requireSession();
document.getElementById('nombreUsuario').textContent = usuario ? usuario.Nombre : '';

function formatoHoras(segundos) {
  const horas = segundos / 3600;
  if (horas < 1) return Math.round(segundos / 60) + ' min';
  return horas.toFixed(1).replace(/\.0$/, '') + ' h';
}

function rangoDe(periodo) {
  const ahora = new Date();
  if (periodo === 'mes_actual') {
    return {
      desde: new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString(),
      hasta: new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0).toISOString()
    };
  }
  if (periodo === 'mes_pasado') {
    return {
      desde: new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1).toISOString(),
      hasta: new Date(ahora.getFullYear(), ahora.getMonth(), 0).toISOString()
    };
  }
  if (periodo === 'todo') {
    return { desde: new Date(2020, 0, 1).toISOString(), hasta: ahora.toISOString() };
  }
  return null; // personalizado: se arma con los inputs de fecha
}

async function cargar(payloadExtra) {
  const res = await api('getResumenHoras', payloadExtra || {});
  if (res.error) {
    document.getElementById('modulosResumen').innerHTML = '<p>' + res.error + '</p>';
    return;
  }

  document.getElementById('statGrid').innerHTML = `
    <div class="stat-card"><div class="num">${formatoHoras(res.totalSegundos)}</div><div class="label">Horas totales</div></div>
    <div class="stat-card"><div class="num">${formatoHoras(res.segundosPeriodo)}</div><div class="label">Horas en el periodo seleccionado</div></div>
  `;

  const desde = new Date(res.periodo.desde);
  const hasta = new Date(res.periodo.hasta);
  document.getElementById('periodoTexto').textContent =
    `Del ${desde.toLocaleDateString('es-MX')} al ${hasta.toLocaleDateString('es-MX')}`;

  document.getElementById('modulosResumen').innerHTML = res.porModulo.map(m => `
    <div class="modulo-resumen-row">
      <div class="modulo-resumen-info">
        <div class="modulo-resumen-nombre">${m.Nombre}</div>
        <div class="meta">${formatoHoras(m.SegundosVistos)} de ${formatoHoras(m.SegundosTotales)} · ${m.Porcentaje}%</div>
      </div>
      <div class="barra-progreso"><div class="barra-progreso-relleno" style="width:${m.Porcentaje}%"></div></div>
    </div>
  `).join('') || '<p>Todavía no tienes módulos asignados.</p>';
}

document.getElementById('filtroPeriodo').addEventListener('change', (e) => {
  const val = e.target.value;
  document.getElementById('rangoPersonalizado').style.display = val === 'personalizado' ? 'inline-flex' : 'none';
  if (val === 'personalizado') return; // esperar a que el usuario aplique el rango
  const rango = rangoDe(val);
  cargar(rango || {});
});

document.getElementById('btnAplicarRango').addEventListener('click', () => {
  const desde = document.getElementById('fechaDesde').value;
  const hasta = document.getElementById('fechaHasta').value;
  if (!desde || !hasta) return;
  cargar({ desde, hasta });
});

cargar();
