// Navegación sencilla: cada pantalla es una "ruta" (#/hoy, #/grupos...).
// La misma barra es inferior en el móvil y lateral en el ordenador (lo decide el CSS).
// secundaria: solo aparece en el menú lateral del ordenador (en el móvil se llega por «Más»).
// soloMovil: solo aparece en la barra inferior del móvil.
import { h } from './utils/dom.js';
import { t } from './i18n.js';

const rutas = {};
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
    main.replaceChildren();
    await rutas[actual].vista(main);
  };
  addEventListener('hashchange', ir);
  ir();
}
