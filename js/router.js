// Navegación sencilla: cada pantalla es una "ruta" (#/participantes, #/grupos...).
// La misma barra es inferior en el móvil y lateral en el ordenador (lo decide el CSS).
import { h } from './utils/dom.js';
import { t } from './i18n.js';

const rutas = {};
export const registrar = (id, ruta) => { rutas[id] = ruta; };

export function iniciar(main, nav) {
  nav.replaceChildren(...Object.entries(rutas).map(([id, r]) =>
    h('a', { href: '#/' + id, 'data-id': id }, h('span', { class: 'ico' }, r.icono), h('span', {}, t(r.titulo)))));

  const ir = async () => {
    const id = location.hash.slice(2);
    const actual = rutas[id] ? id : 'hoy';
    nav.querySelectorAll('a').forEach(a => a.classList.toggle('activa', a.dataset.id === actual));
    main.replaceChildren();
    await rutas[actual].vista(main);
  };
  addEventListener('hashchange', ir);
  ir();
}
