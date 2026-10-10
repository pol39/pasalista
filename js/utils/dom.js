// Ayudas para crear HTML sin plantillas de texto (así no hay problemas con comillas ni nombres raros).
import { t } from '../i18n.js';

// h('div', { class: 'card' }, 'texto', otroElemento)  →  <div class="card">texto…</div>
export const h = (etiqueta, attrs = {}, ...hijos) => {
  const e = document.createElement(etiqueta);
  for (const [k, v] of Object.entries(attrs)) {
    if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'class') e.className = v;
    else if (v === true) e.setAttribute(k, '');
    else if (v !== false && v != null) e.setAttribute(k, v);
  }
  e.append(...hijos.flat().filter(x => x != null && x !== false));
  return e;
};

const DIAS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do']; // 1 = lunes … 7 = domingo

// Ventana con formulario. Devuelve un objeto con los valores, o null si se cancela.
// campos: [{ n: nombre, et: etiqueta, tipo: text|number|date|month|textarea|select|dias|check, req, ph, opciones, cambia }]
// acciones: botones extra, p. ej. [{ id: 'baja', t: 'Dar de baja' }] → devuelve { __accion: 'baja' }
export function pedir({ titulo, campos, valores = {}, acciones = [], ayuda }) {
  return new Promise(resolve => {
    const leer = {}, poner = {};
    const filas = campos.map(c => {
      let el;
      if (c.tipo === 'select') {
        el = h('select', {}, ...c.opciones.map(o => h('option', { value: o.v }, o.t)));
        el.value = valores[c.n] ?? '';
        el.addEventListener('change', () => c.cambia?.(el.value, poner));
        leer[c.n] = () => el.value;
        poner[c.n] = v => { el.value = v; };
      } else if (c.tipo === 'check') {
        el = h('input', { type: 'checkbox' });
        el.checked = !!valores[c.n];
        leer[c.n] = () => el.checked;
      } else if (c.tipo === 'dias') {
        const cajas = DIAS.map((_, k) => h('input', { type: 'checkbox', value: k + 1 }));
        el = h('div', { class: 'dias' }, ...cajas.map((cb, k) => h('label', {}, cb, DIAS[k])));
        poner[c.n] = v => cajas.forEach(cb => { cb.checked = v.includes(+cb.value); });
        poner[c.n](valores[c.n] || []);
        leer[c.n] = () => cajas.filter(cb => cb.checked).map(cb => +cb.value);
      } else {
        const area = c.tipo === 'textarea';
        el = h(area ? 'textarea' : 'input', {
          type: area ? null : c.tipo || 'text', required: !!c.req, placeholder: c.ph,
          pattern: c.req && !area ? '.*\\S.*' : null // impide nombres vacíos con solo espacios
        });
        el.value = valores[c.n] ?? '';
        leer[c.n] = () => c.tipo === 'number' ? (el.value === '' ? null : +el.value) : el.value.trim();
      }
      return c.tipo === 'check'
        ? h('label', { class: 'campo chk' }, el, t(c.et))
        : h(c.tipo === 'dias' ? 'div' : 'label', { class: 'campo' }, h('span', {}, t(c.et)), el);
    });

    const cierre = v => { dlg.close(); dlg.remove(); resolve(v); };
    const barra = h('div', { class: 'acciones' },
      ...acciones.map(a => h('button', { type: 'button', class: 'btn peligro', onclick: () => cierre({ __accion: a.id }) }, t(a.t))),
      h('button', { type: 'button', class: 'btn', onclick: () => cierre(null) }, t('Cancelar')),
      h('button', { class: 'btn primario' }, t('Guardar')));
    const form = h('form', {
      onsubmit: e => { e.preventDefault(); cierre(Object.fromEntries(Object.entries(leer).map(([k, f]) => [k, f()]))); }
    }, h('h2', {}, t(titulo)), ayuda ? h('p', { class: 'sec' }, t(ayuda)) : null, ...filas, barra);
    const dlg = h('dialog', { class: 'modal' }, form);
    dlg.addEventListener('cancel', e => { e.preventDefault(); cierre(null); }); // tecla Esc
    document.body.append(dlg);
    dlg.showModal();
  });
}
