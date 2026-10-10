// Días especiales (no lectivos): festivos, temporal, huelga, competición, mantenimiento, otro.
// Un día no lectivo no cuenta en ningún porcentaje. Se puede deshacer en cualquier momento.
import { todos, guardar, borrar } from '../storage.js';
import { h, pedir } from '../utils/dom.js';
import { sumarDias, fechaCorta, hoyFecha } from '../utils/dates.js';
import { t } from '../i18n.js';

const TIPOS = ['Festivo', 'Alerta de temporal', 'Huelga', 'Competición', 'Mantenimiento de la piscina', 'Otro'];

// Formulario para crear uno o varios días no lectivos (bloque de fechas). Devuelve true si guardó.
export async function crearEspeciales(grupos, valores = {}) {
  const r = await pedir({
    titulo: 'Día no lectivo',
    ayuda: 'No cuenta en ningún porcentaje. Para un bloque (Navidad, Semana Santa) rellena también «Hasta».',
    campos: [
      { n: 'desde', et: 'Desde', tipo: 'date', req: true },
      { n: 'hasta', et: 'Hasta (opcional)', tipo: 'date' },
      { n: 'tipo', et: 'Motivo', tipo: 'select', opciones: TIPOS.map(x => ({ v: x, t: x })) },
      { n: 'motivo', et: 'Detalle (opcional)', ph: 'Navidad' },
      { n: 'grupoId', et: 'Afecta a', tipo: 'select', opciones: [{ v: '', t: 'Todos los grupos' }, ...grupos.map(g => ({ v: g.id, t: g.nombre }))] }
    ],
    valores: { desde: hoyFecha(), tipo: TIPOS[0], ...valores }
  });
  if (!r) return false;
  const fin = r.hasta || r.desde;
  if (fin < r.desde) { alert(t('La fecha final es anterior a la inicial.')); return false; }
  const regs = [];
  for (let f = r.desde; f <= fin && regs.length < 366; f = sumarDias(f, 1)) {
    regs.push({ id: `${f}|${r.grupoId || 'todos'}`, fecha: f, grupoId: r.grupoId || null, tipo: r.tipo, motivo: r.motivo });
  }
  await Promise.all(regs.map(x => guardar('diasEspeciales', x)));
  return true;
}

export async function vista(main) {
  const pintar = async () => {
    const [esp, grupos] = [await todos('diasEspeciales'), await todos('grupos')];
    const clave = e => `${e.grupoId || ''}|${e.tipo}|${e.motivo || ''}`;
    esp.sort((a, b) => clave(a).localeCompare(clave(b)) || a.fecha.localeCompare(b.fecha));
    // Junta días seguidos con el mismo motivo y grupo en un solo bloque para mostrarlos.
    const bloques = [];
    for (const e of esp) {
      const u = bloques.at(-1);
      if (u && clave(u.e) === clave(e) && sumarDias(u.hasta, 1) === e.fecha) { u.hasta = e.fecha; u.items.push(e); }
      else bloques.push({ e, desde: e.fecha, hasta: e.fecha, items: [e] });
    }
    bloques.sort((a, b) => a.desde.localeCompare(b.desde));

    const deshacer = async b => {
      if (!confirm(t('¿Deshacer este día no lectivo? Volverá a contar en los porcentajes.'))) return;
      await Promise.all(b.items.map(x => borrar('diasEspeciales', x.id)));
      pintar();
    };
    main.replaceChildren(
      h('div', { class: 'cab' }, h('h2', {}, t('Días especiales')),
        h('button', { class: 'btn primario', onclick: async () => { if (await crearEspeciales(grupos)) pintar(); } }, '+ ' + t('Añadir'))),
      ...(bloques.length ? bloques.map(b => h('div', { class: 'card fila' },
        h('div', { class: 'grow' },
          h('strong', {}, fechaCorta(b.desde) + (b.hasta !== b.desde ? ' – ' + fechaCorta(b.hasta) : '')),
          h('div', {}, b.e.tipo + (b.e.motivo ? ': ' + b.e.motivo : '')),
          h('div', { class: 'sec' }, b.e.grupoId ? (grupos.find(g => g.id === b.e.grupoId)?.nombre ?? '—') : t('Todos los grupos'))),
        h('button', { class: 'btn', onclick: () => deshacer(b) }, '↩ ' + t('Deshacer'))))
        : [h('p', { class: 'vacio' }, t('No hay días especiales. Añade un festivo o un bloque de fechas.'))]));
  };
  await pintar();
}
