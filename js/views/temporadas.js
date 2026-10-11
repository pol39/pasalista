// Temporadas: crear, editar, borrar, elegir la activa y ver sus porcentajes (por meses y general).
// Solo cuentan los días de entreno ya realizados con la lista pasada (ver js/logic/stats.js).
import { todos, leer, guardar, borrar, nuevoId } from '../storage.js';
import { estado, fijarTemporada } from '../state.js';
import { h, pedir, anillo } from '../utils/dom.js';
import { nombreMes } from '../utils/dates.js';
import { estadisticasTemporada, nivel } from '../logic/stats.js';
import { t } from '../i18n.js';

const CAMPOS = [
  { n: 'nombre', et: 'Nombre', req: true, ph: '2025-26' },
  { n: 'inicio', et: 'Inicio', tipo: 'date', req: true },
  { n: 'fin', et: 'Fin', tipo: 'date', req: true }
];
const fecha = iso => iso.split('-').reverse().join('/');
const txt = v => (v == null ? '—' : v + '%');

export async function vista(main) {
  const pintar = async () => {
    const [lista0, parts, grupos, asist, especiales, aj] = await Promise.all([
      todos('temporadas'), todos('participantes'), todos('grupos'), todos('asistencias'), todos('diasEspeciales'), leer('ajustes', 'justificado')]);
    const modo = aj?.valor || 'excluye';
    const lista = lista0.sort((a, b) => b.inicio.localeCompare(a.inicio));
    const nombreGrupo = id => grupos.find(g => g.id === id)?.nombre ?? '—';

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

    const filaMes = m => h('div', { class: 'mes-bloque' },
      h('div', { class: 'mes-fila' + (m.conteo.computables ? '' : ' vacio-mes') }, h('span', { class: 'mes-nom' }, nombreMes(m.mes)),
        h('div', { class: 'barra' }, h('div', { class: 'nv-' + nivel(m.conteo.pct), style: `width:${m.conteo.pct ?? 0}%` })),
        h('span', { class: 'sec' }, `${txt(m.conteo.pct)} · ${m.conteo.presentes}/${m.conteo.computables}`)),
      m.porGrupo.length ? h('div', { class: 'chips-g' }, ...m.porGrupo.map(g => h('span', { class: 'chip-g' }, `${nombreGrupo(g.grupoId)} ${txt(g.pct)}`))) : null);

    const tarjeta = s => {
      const est = estadisticasTemporada(s, parts, grupos, asist, especiales, modo);
      const tot = est.total;
      return h('div', { class: 'card' },
        h('div', { class: 'fila' },
          h('div', { class: 'grow' }, h('strong', {}, s.nombre), h('div', { class: 'sec' }, `${fecha(s.inicio)} – ${fecha(s.fin)}`)),
          s.id === estado.temporadaId
            ? h('span', { class: 'chip' }, t('Activa'))
            : h('button', { class: 'btn', onclick: async () => { await fijarTemporada(s.id); pintar(); } }, t('Activar')),
          h('button', { class: 'btn', 'aria-label': t('Editar'), onclick: () => editar(s) }, '✏️')),
        h('div', { class: 'resumen' }, anillo(tot.pct, 72, nivel(tot.pct)),
          h('div', { class: 'grow' }, h('strong', {}, t('General de la temporada')),
            h('div', { class: 'sec' }, t('{p} presencias de {n} sesiones contadas', { p: tot.presentes + (modo === 'cuenta' ? tot.justificadas : 0), n: tot.computables })))),
        h('details', { open: s.id === estado.temporadaId },
          h('summary', {}, t('Porcentaje por meses')),
          ...est.meses.map(filaMes),
          h('p', { class: 'sec' }, t('Solo cuentan los días de entreno ya realizados con la lista pasada. Porcentaje = presencias / sesiones contadas (todos los participantes juntos).'))));
    };

    main.replaceChildren(
      h('div', { class: 'cab' }, h('h2', {}, t('Temporadas')), h('button', { class: 'btn primario', onclick: () => editar() }, '+ ' + t('Nueva'))),
      ...(lista.length ? lista.map(tarjeta) : [h('p', { class: 'vacio' }, t('Aún no hay temporadas. Crea la primera con «Nueva».'))]));
  };
  await pintar();
}
