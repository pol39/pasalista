// Pantalla "Hoy" (pasar lista). Se construye en la Fase 2.
import { h } from '../utils/dom.js';
import { t } from '../i18n.js';

export async function vista(main) {
  main.replaceChildren(
    h('h2', {}, t('Hoy')),
    h('p', { class: 'vacio' }, t('Aquí pasarás lista con un toque. Llega en la Fase 2.')));
}
