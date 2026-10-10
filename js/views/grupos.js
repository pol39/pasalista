// Grupos: nombre, días de entrenamiento por defecto y horario opcional.
import { todos, guardar, borrar, nuevoId } from '../storage.js';
import { h, pedir } from '../utils/dom.js';
import { t } from '../i18n.js';

const NOMBRES_DIA = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'];
const CAMPOS = [
  { n: 'nombre', et: 'Nombre', req: true, ph: 'Benjamines' },
  { n: 'dias', et: 'Días de entrenamiento', tipo: 'dias' },
  { n: 'horario', et: 'Horario (opcional)', ph: '18:00-19:00' }
];

export async function vista(main) {
  const pintar = async () => {
    const lista = (await todos('grupos')).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

    const editar = async g => {
      const r = await pedir({ titulo: g ? 'Editar grupo' : 'Nuevo grupo', campos: CAMPOS, valores: g || { dias: [] }, acciones: g ? [{ id: 'borrar', t: 'Borrar' }] : [] });
      if (!r) return;
      if (r.__accion === 'borrar') {
        const enUso = (await todos('participantes')).some(p => p.periodos.some(x => x.grupoId === g.id));
        if (enUso) return alert(t('No se puede borrar: hay participantes (actuales o antiguos) en este grupo.'));
        if (!confirm(t('¿Borrar este grupo?'))) return;
        await borrar('grupos', g.id);
      } else {
        if (!r.dias.length) return alert(t('Elige al menos un día.'));
        await guardar('grupos', { ...g, ...r, id: g?.id ?? nuevoId() });
      }
      pintar();
    };

    main.replaceChildren(
      h('div', { class: 'cab' }, h('h2', {}, t('Grupos')), h('button', { class: 'btn primario', onclick: () => editar() }, '+ ' + t('Nuevo'))),
      ...(lista.length ? lista.map(g => h('div', { class: 'card fila' },
        h('div', { class: 'grow' }, h('strong', {}, g.nombre),
          h('div', { class: 'sec' }, [g.dias.map(d => NOMBRES_DIA[d - 1]).join(' '), g.horario].filter(Boolean).join(' · '))),
        h('button', { class: 'btn', 'aria-label': t('Editar'), onclick: () => editar(g) }, '✏️')))
        : [h('p', { class: 'vacio' }, t('Aún no hay grupos. Crea el primero con «Nuevo».'))]));
  };
  await pintar();
}
