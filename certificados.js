const usuario = requireSession();
document.getElementById('nombreUsuario').textContent = usuario ? usuario.Nombre : '';

async function cargar() {
  const res = await api('getCertificado', {});
  const cont = document.getElementById('lista');
  if (res.error) { cont.innerHTML = '<div class="panel">' + res.error + '</div>'; return; }
  if (!res.certificados.length) { cont.innerHTML = '<div class="panel">Todavía no tienes certificados. Completa un curso para obtener el tuyo.</div>'; return; }
  cont.innerHTML = res.certificados.map(c => `
    <div class="panel" style="display:flex; align-items:center; justify-content:space-between;">
      <div>
        <div style="font-weight:600;">${c.ID_Curso}</div>
        <div class="meta" style="font-size:12px; color:var(--charcoal);">Folio ${c.Folio} · ${new Date(c.Fecha_Emision).toLocaleDateString('es-MX')}</div>
      </div>
      ${c.URL_PDF ? `<a class="btn" href="${c.URL_PDF}" target="_blank" rel="noopener">Descargar</a>` : ''}
    </div>
  `).join('');
}
cargar();
