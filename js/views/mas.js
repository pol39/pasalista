// Menú "Más" (solo móvil): accesos a lo que no cabe en la barra inferior.
import { h } from '../utils/dom.js';
import { t } from '../i18n.js';

const enlace = (href, ico, titulo, sub) => h('a', { class: 'card fila enlace', href },
  h('span', { class: 'ico' }, ico), h('div', { class: 'grow' }, h('strong', {}, t(titulo)), h('div', { class: 'sec' }, t(sub))));

export async function vista(main) {
  main.replaceChildren(
    h('h2', { style: 'margin-bottom:14px' }, t('Más')),
    enlace('#/especiales', '🚫', 'Días especiales', 'Festivos, temporal, huelgas y bloques de fechas'),
    enlace('#/temporadas', '📅', 'Temporadas', 'Crear, cambiar y consultar temporadas'),
    enlace('#/ajustes', '⚙️', 'Ajustes', 'Tema, privacidad y datos'));
}
