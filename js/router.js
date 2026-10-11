// Navegación sencilla: cada pantalla es una "ruta" (#/hoy, #/grupos, #/participante/ID...).
// La misma barra es inferior en el móvil y lateral en el ordenador (lo decide el CSS).
//  secundaria: solo en el menú lateral del ordenador (en el móvil se llega por «Más»).
//  soloMovil: solo en la barra inferior del móvil.
//  oculta + padre: pantalla sin botón propio (la ficha de un participante) que marca el botón de su "padre".
import { h } from './utils/dom.js';
import { t } from './i18n.js';
import { eventos } from './sync.js';
import { cargarEstado } from './state.js';

const rutas = {};
let navEl, mainEl, quitar, reintento;
export const registrar = (id, ruta) => { rutas[id] = ruta; };

function rutaActual() {
  const [id, ...resto] = location.hash.slice(2).split('/');
  return rutas[id] ? { id, param: decodeURIComponent(resto.join('/')) } : { id: 'hoy', param: '' };
}

function marcarMenu() {
  const { id } = rutaActual(), r = rutas[id];
  navEl.querySelectorAll('a').forEach(a =>
    a.classList.toggle('activa', a.dataset.id === id || a.dataset.id === r.padre || (r.secundaria && a.dataset.id === 'mas')));
}

function construirMenu() {
  navEl.replaceChildren(...Object.entries(rutas).filter(([, r]) => !r.oculta).map(([id, r]) =>
    h('a', { href: '#/' + id, 'data-id': id, class: r.secundaria ? 'solo-ordenador' : r.soloMovil ? 'solo-movil' : '' },
      h('span', { class: 'ico' }, r.icono), h('span', {}, t(r.titulo)))));
  marcarMenu();
}

async function ir(animar = true) {
  const { id, param } = rutaActual();
  marcarMenu();
  // data-nav activa durante un momento la animación de entrada (solo al cambiar de pantalla).
  if (animar) document.body.dataset.nav = '1';
  mainEl.replaceChildren();
  scrollTo(0, 0);
  await rutas[id].vista(mainEl, param);
  mainEl.querySelectorAll('.cab, .barra-mes, .segm, .filtros, .card, .dia, .vacio, .solo-tabla').forEach((e, i) => e.style.setProperty('--i', i));
  clearTimeout(quitar);
  quitar = setTimeout(() => { delete document.body.dataset.nav; }, 900);
}

// Cambio de idioma: se reconstruye el menú y se vuelve a pintar la pantalla.
export function repintar() { construirMenu(); return ir(false); }

export function iniciar(main, nav) {
  mainEl = main; navEl = nav;
  construirMenu();
  addEventListener('hashchange', () => ir());

  // Llegaron cambios de otro dispositivo: se vuelve a pintar la pantalla actual,
  // pero sin interrumpir si estás escribiendo o hay una ventana abierta.
  const refrescar = async () => {
    const a = document.activeElement;
    const escribiendo = a && (a.tagName === 'TEXTAREA' || (a.tagName === 'INPUT' && ['text', 'search', 'number', 'email', 'password'].includes(a.type)));
    if (document.querySelector('dialog[open]') || escribiendo) { clearTimeout(reintento); reintento = setTimeout(refrescar, 1500); return; }
    await cargarEstado();
    const { id, param } = rutaActual();
    if (id === 'ajustes') return; // esa pantalla se actualiza sola
    const y = scrollY;
    await rutas[id].vista(mainEl, param);
    scrollTo(0, y);
  };
  eventos.addEventListener('datos', refrescar);
  ir();
}
