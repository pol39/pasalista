// Temporadas: crear, editar, borrar y elegir la activa.
import { todos, guardar, borrar, nuevoId } from '../storage.js';
import { estado, fijarTemporada } from '../state.js';
import { h, pedir } from '../utils/dom.js';
import { t } from '../i18n.js';

const CAMPOS = [
  { n: 'nombre', et: 'Nombre', req: true, ph: '2025-26' },
  { n: 'inicio', et: 'Inicio', tipo: 'date', req: true },
  { n: 'fin', et: 'Fin', tipo: 'date', req: true }
];
const fecha = iso => iso.split('-').reverse().join('/');

export async function vista(main) {
  const pintar = async () => {
    const lista = (await todos('temporadas')).sort((a, b) => b.inicio.localeCompare(a.inicio));

    const editar = async s => {
      const r = await pedir({ titulo: s ? 'Editar temporada' : 'Nueva temporada', campos: CAMPOS, valores: s || {}, acciones: s ? [{ id: 'borrar', t: 'Borrar' }] : [] });
      if (!r) return;
      if (r.__accion === 'borrar') {
        if (!confirm(t('¿Borrar esta temporada? Los participantes y las asistencias no se borran.'))) return;
        await borrar('temporadas', s.id);
        if (estado.temporadaId === s.id) await fijarTemporada(null);
      } else {
        if (r.fin < r.inicio) return alert(t('La fecha de fin es anterior a la de inicio.'));
        const o = { ...s, ...r, id: s?.id ?? nuevoId() };
        await guardar('temporadas', o);
        if (!estado.temporadaId) await fijarTemporada(o.id);
      }
      pintar();
    };

    main.replaceChildren(
      h('div', { class: 'cab' }, h('h2', {}, t('Temporadas')), h('button', { class: 'btn primario', onclick: () => editar() }, '+ ' + t('Nueva'))),
      ...(lista.length ? lista.map(s => h('div', { class: 'card fila' },
        h('div', { class: 'grow' }, h('strong', {}, s.nombre), h('div', { class: 'sec' }, `${fecha(s.inicio)} – ${fecha(s.fin)}`)),
        s.id === estado.temporadaId
          ? h('span', { class: 'chip' }, t('Activa'))
          : h('button', { class: 'btn', onclick: async () => { await fijarTemporada(s.id); pintar(); } }, t('Activar')),
        h('button', { class: 'btn', 'aria-label': t('Editar'), onclick: () => editar(s) }, '✏️')))
        : [h('p', { class: 'vacio' }, t('Aún no hay temporadas. Crea la primera con «Nueva».'))]));
  };
  await pintar();
}
