// Ajustes. En la Fase 3 se añadirán umbrales, "Justificado", copia de seguridad y borrado de datos.
import { h } from '../utils/dom.js';
import { aplicarTema, temaGuardado } from '../theme.js';
import { t } from '../i18n.js';

export async function vista(main) {
  const opciones = [['sistema', 'Según el sistema'], ['claro', 'Claro'], ['oscuro', 'Oscuro']];
  main.replaceChildren(
    h('h2', { style: 'margin-bottom:14px' }, t('Ajustes')),
    h('div', { class: 'card' },
      h('label', { class: 'campo' }, h('span', {}, t('Tema')),
        h('select', { onchange: e => aplicarTema(e.target.value) },
          ...opciones.map(([v, x]) => h('option', { value: v, selected: temaGuardado() === v }, t(x)))))),
    h('div', { class: 'card' },
      h('h3', {}, t('Privacidad y datos')),
      h('p', {}, t('Todo se guarda solo en este dispositivo. Nada se envía a ningún servidor ni se usan analíticas o servicios de terceros.')),
      h('p', {}, t('Los datos del móvil y del ordenador son independientes. Para pasar datos de uno a otro se usará la exportación e importación de copia (JSON), que llegará en la Fase 3.'))));
}
