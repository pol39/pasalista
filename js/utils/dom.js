// Ayudas para crear HTML sin plantillas de texto (así no hay problemas con comillas ni nombres raros).
import { t, diasCortos } from '../i18n.js';
import { edad } from './dates.js';
import { matizEdad } from './orden.js';

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

// Los días se numeran 1 = lunes … 7 = domingo (nombres cortos en i18n.js).

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
        const DIAS = diasCortos();
        const cajas = DIAS.map((_, k) => h('input', { type: 'checkbox', value: k + 1 }));
        el = h('div', { class: 'dias' }, ...cajas.map((cb, k) => h('label', {}, cb, DIAS[k])));
        poner[c.n] = v => cajas.forEach(cb => { cb.checked = v.includes(+cb.value); });
        poner[c.n](valores[c.n] || []);
        leer[c.n] = () => cajas.filter(cb => cb.checked).map(cb => +cb.value);
      } else {
        const area = c.tipo === 'textarea';
        el = h(area ? 'textarea' : 'input', {
          type: area ? null : c.tipo || 'text', required: !!c.req, placeholder: t(c.ph),
          pattern: c.req && !area ? '.*\\S.*' : null // impide nombres vacíos con solo espacios
        });
        el.value = valores[c.n] ?? '';
        leer[c.n] = () => c.tipo === 'number' ? (el.value === '' ? null : +el.value) : c.tipo === 'password' ? el.value : el.value.trim();
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

// Etiqueta con la edad, de un color distinto para cada edad (ver .edad en components.css).
export function chipEdad(anyNac, largo = false) {
  const e = edad(anyNac), matiz = matizEdad(anyNac);
  return e == null ? null : h('span', { class: 'edad', style: `--h:${matiz}`, title: `${t('Nacido en')} ${anyNac}` }, largo ? `${e} ${t('años')}` : String(e));
}

// Burbujas que suben al completar la lista (decorativo; desaparecen solas).
export function burbujas(contenedor) {
  const bs = Array.from({ length: 10 }, () => {
    const d = 8 + Math.random() * 14;
    return h('span', { class: 'burbuja', style: `left:${5 + Math.random() * 90}%;width:${d}px;height:${d}px;animation-delay:${Math.random() * 300}ms` });
  });
  contenedor.append(...bs);
  setTimeout(() => bs.forEach(b => b.remove()), 2000);
}

// Círculo con la foto del participante (o sus iniciales, con el color de su edad).
export function avatar(p, foto, tam = 44) {
  const matiz = matizEdad(p.anyNacimiento) ?? 200;
  const iniciales = p.nombre.trim().split(/\s+/).slice(0, 2).map(x => x[0]?.toUpperCase() || '').join('');
  return h('span', { class: 'avatar', style: `--h:${matiz};--tam:${tam}px` }, foto ? h('img', { src: foto, alt: '' }) : iniciales);
}

// Anillo de porcentaje que se rellena con una animación suave. nv: ok | mid | bad | na
export function anillo(valor, tam = 96, nv = 'na') {
  const a = h('div', { class: `anillo nv-${nv}`, style: `--tam:${tam}px` }, h('span', {}, valor == null ? '—' : valor + '%'));
  const frame = globalThis.requestAnimationFrame || (f => setTimeout(f, 16));
  frame(() => frame(() => a.style.setProperty('--p', valor ?? 0))); // dos fotogramas: así se ve el relleno animado
  return a;
}
