// Navegación sencilla: cada pantalla es una "ruta" (#/hoy, #/grupos...).
// La misma barra es inferior en el móvil y lateral en el ordenador (lo decide el CSS).
// secundaria: solo aparece en el menú lateral del ordenador (en el móvil se llega por «Más»).
// soloMovil: solo aparece en la barra inferior del móvil.
import { h } from './utils/dom.js';
import { t } from './i18n.js';
import { eventos } from './sync.js';
import { cargarEstado } from './state.js';

const rutas = {};
let quitar; // temporizador que apaga la animación de entrada
export const registrar = (id, ruta) => { rutas[id] = ruta; };

export function iniciar(main, nav) {
  nav.replaceChildren(...Object.entries(rutas).map(([id, r]) =>
    h('a', { href: '#/' + id, 'data-id': id, class: r.secundaria ? 'solo-ordenador' : r.soloMovil ? 'solo-movil' : '' },
      h('span', { class: 'ico' }, r.icono), h('span', {}, t(r.titulo)))));

  const ir = async () => {
    const id = location.hash.slice(2);
    const actual = rutas[id] ? id : 'hoy';
    nav.querySelectorAll('a').forEach(a =>
      a.classList.toggle('activa', a.dataset.id === actual || (rutas[actual].secundaria && a.dataset.id === 'mas')));
    // data-nav activa durante un momento la animación de entrada (solo al cambiar de pantalla).
    document.body.dataset.nav = '1';
    main.replaceChildren();
    scrollTo(0, 0);
    await rutas[actual].vista(main);
    main.querySelectorAll('.cab, .barra-mes, .segm, .filtros, .card, .dia, .vacio, .solo-tabla').forEach((e, i) => e.style.setProperty('--i', i));
    clearTimeout(quitar);
    quitar = setTimeout(() => { delete document.body.dataset.nav; }, 900);
  };
  addEventListener('hashchange', ir);

  // Llegaron cambios de otro dispositivo: se vuelve a pintar la pantalla actual,
  // pero sin interrumpir si estás escribiendo o hay una ventana abierta.
  let reintento;
  const refrescar = async () => {
    const a = document.activeElement;
    const escribiendo = a && (a.tagName === 'TEXTAREA' || (a.tagName === 'INPUT' && ['text', 'search', 'number', 'email', 'password'].includes(a.type)));
    if (document.querySelector('dialog[open]') || escribiendo) { clearTimeout(reintento); reintento = setTimeout(refrescar, 1500); return; }
    await cargarEstado();
    const id = location.hash.slice(2), actual = rutas[id] ? id : 'hoy';
    if (actual === 'ajustes') return; // esa pantalla se actualiza sola
    const y = scrollY;
    await rutas[actual].vista(main);
    scrollTo(0, y);
  };
  eventos.addEventListener('datos', refrescar);
  ir();
}
