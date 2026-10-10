// Ajustes: tema, cuenta y sincronización, privacidad.
// (En la Fase 3 se añadirán umbrales, "Justificado", copia de seguridad y borrado de datos.)
import { h } from '../utils/dom.js';
import { aplicarTema, temaGuardado } from '../theme.js';
import { info, eventos, entrar, registrar, recuperar, salir, sincronizar } from '../sync.js';
import { t } from '../i18n.js';

export async function vista(main) {
  const opciones = [['sistema', 'Según el sistema'], ['claro', 'Claro'], ['oscuro', 'Oscuro']];
  const tema = h('div', { class: 'card' },
    h('label', { class: 'campo' }, h('span', {}, t('Tema')),
      h('select', { onchange: e => aplicarTema(e.target.value) },
        ...opciones.map(([v, x]) => h('option', { value: v, selected: temaGuardado() === v }, t(x))))));
  const cuenta = h('div', { class: 'card' }), privacidad = h('div', { class: 'card' });

  const estadoTexto = () => {
    const hora = info.ultima ? info.ultima.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }) : '';
    const base = { sincronizando: t('Sincronizando…'), ok: `${t('Sincronizado')} ✓ ${hora}`, 'sin-conexion': t('Sin conexión: los cambios se subirán al volver.'), error: `${t('Error')}: ${info.error}`, local: '' }[info.fase];
    return base + (info.pendientes ? ` · ${info.pendientes} ${t('cambios pendientes')}` : '');
  };

  const formulario = () => {
    const email = h('input', { type: 'email', required: true, autocomplete: 'email', placeholder: 'correo@ejemplo.com' });
    const clave = h('input', { type: 'password', required: true, minlength: 6, autocomplete: 'current-password', placeholder: t('Contraseña') });
    const msg = h('p', { class: 'msg', role: 'status' });
    const hacer = async fn => {
      msg.className = 'msg'; msg.textContent = t('Un momento…');
      try { const ok = await fn(); msg.className = ok ? 'msg ok' : 'msg'; msg.textContent = ok || ''; }
      catch (e) { msg.className = 'msg err'; msg.textContent = e.message; }
    };
    return h('form', { onsubmit: e => { e.preventDefault(); hacer(() => entrar(email.value.trim(), clave.value)); } },
      h('label', { class: 'campo' }, h('span', {}, t('Correo electrónico')), email),
      h('label', { class: 'campo' }, h('span', {}, t('Contraseña')), clave),
      msg,
      h('div', { class: 'cuenta-botones' },
        h('button', { class: 'btn primario' }, t('Entrar')),
        h('button', { type: 'button', class: 'btn', onclick: () => { if (email.reportValidity() && clave.reportValidity()) hacer(() => registrar(email.value.trim(), clave.value)); } }, t('Crear cuenta')),
        h('button', { type: 'button', class: 'btn', onclick: () => { if (email.reportValidity()) hacer(() => recuperar(email.value.trim())); } }, t('He olvidado la contraseña'))));
  };

  const pintar = () => {
    if (!info.configurado) {
      cuenta.replaceChildren(h('h3', {}, t('Cuenta y sincronización')),
        h('p', {}, t('La sincronización aún no está configurada. Sigue la guía SINCRONIZACION.md del proyecto.')));
    } else if (!info.usuario) {
      cuenta.replaceChildren(h('h3', {}, t('Cuenta y sincronización')),
        h('p', { class: 'sec' }, t('Inicia sesión para ver tus datos en el móvil y en el ordenador a la vez.')), formulario());
    } else {
      cuenta.replaceChildren(h('h3', {}, t('Cuenta y sincronización')),
        h('p', {}, h('strong', {}, info.usuario)), h('p', { class: 'sec' }, estadoTexto()),
        h('div', { class: 'cuenta-botones' },
          h('button', { class: 'btn primario', onclick: () => sincronizar() }, t('Sincronizar ahora')),
          h('button', { class: 'btn', onclick: () => salir(false) }, t('Cerrar sesión')),
          h('button', { class: 'btn peligro', onclick: () => { if (confirm(t('Se cerrará la sesión y se borrarán los datos de ESTE dispositivo (en la nube se conservan). ¿Continuar?'))) salir(true); } }, t('Cerrar sesión y borrar datos de este dispositivo'))));
    }
    privacidad.replaceChildren(h('h3', {}, t('Privacidad y datos')),
      h('p', {}, info.usuario
        ? t('Tus datos se guardan en este dispositivo y en tu cuenta (servidor de Supabase en la UE) para que los veas en tus otros dispositivos. No se usan analíticas ni publicidad.')
        : t('Sin iniciar sesión, todo se guarda solo en este dispositivo y no se envía a ningún servidor.')),
      h('p', { class: 'sec' }, t('Consejo: guarda solo el nombre y la inicial del apellido de los menores, y pide el consentimiento de las familias (RGPD).')));
  };
  const alEstado = () => { if (!cuenta.isConnected) return eventos.removeEventListener('estado', alEstado); pintar(); };
  eventos.addEventListener('estado', alEstado);
  pintar();

  main.replaceChildren(h('h2', { style: 'margin-bottom:14px' }, t('Ajustes')), tema, cuenta, privacidad);
}
