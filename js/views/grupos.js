// Grupos: nombre, días de entrenamiento por defecto y horario opcional.
import { todos, guardar, borrar, nuevoId } from '../storage.js';
import { h, pedir } from '../utils/dom.js';
import { estado } from '../state.js';
import { diasGrupo } from '../logic/periods.js';
import { t, diasCortos } from '../i18n.js';

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
        const nuevo = { ...g, ...r, id: g?.id ?? nuevoId() };
        if (g && r.dias.join() !== diasGrupo(g, estado.mes).join()) {
          // Cambio de días: se guarda desde qué mes vale, para que los meses anteriores no cambien.
          const c = await pedir({ titulo: 'Cambio de días', ayuda: 'Los meses anteriores conservan los días anteriores.',
            campos: [{ n: 'mes', et: 'Aplicar desde el mes', tipo: 'month', req: true, ph: '2025-10' }], valores: { mes: estado.mes } });
          if (!c) return;
          const hist = g.diasHist?.length ? g.diasHist : [{ desde: '0000-00', dias: g.dias }];
          nuevo.diasHist = [...hist.filter(x => x.desde < c.mes), { desde: c.mes, dias: r.dias }];
        }
        await guardar('grupos', nuevo);
      }
      pintar();
    };

    main.replaceChildren(
      h('div', { class: 'cab' }, h('h2', {}, t('Grupos')), h('button', { class: 'btn primario', onclick: () => editar() }, '+ ' + t('Nuevo'))),
      ...(lista.length ? lista.map(g => h('div', { class: 'card fila' },
        h('div', { class: 'grow' }, h('strong', {}, g.nombre),
          h('div', { class: 'sec' }, [g.dias.map(d => diasCortos()[d - 1]).join(' '), g.horario].filter(Boolean).join(' · '))),
        h('button', { class: 'btn', 'aria-label': t('Editar'), onclick: () => editar(g) }, '✏️')))
        : [h('p', { class: 'vacio' }, t('Aún no hay grupos. Crea el primero con «Nuevo».'))]));
  };
  await pintar();
}
