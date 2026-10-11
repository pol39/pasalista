// Ficha del participante: foto, datos, asistencia detallada (días que vino, faltas, retrasos, pendientes),
// evolución por meses y "datos y logros" (ganadora del reto del mes, cumpleaños, notas...).
import { todos, leer, guardar, borrar, nuevoId } from '../storage.js';
import { estado } from '../state.js';
import { h, pedir, chipEdad, avatar, anillo } from '../utils/dom.js';
import { nombreMes, mesAnterior, mesSiguiente, fechaLarga, fechaCorta, hoyFecha, mesDeFecha } from '../utils/dates.js';
import { fotoDesde } from '../utils/foto.js';
import { grupoEn } from '../logic/periods.js';
import { registrosDe, conteo, previstos, porMes, rachas, nivel } from '../logic/stats.js';
import { editarParticipante } from './participantes.js';
import { t } from '../i18n.js';

const ver = { periodo: 'temporada', filtro: 'todo' }; // se recuerda mientras la app está abierta
const ICONO = { reto: '🏆', cumple: '🎂', logro: '⭐', nota: '📝' };
const NOMBRE = { reto: 'Reto del mes', cumple: 'Cumpleaños', logro: 'Logro', nota: 'Nota' };
const FILTROS = [['todo', 'Todo'], ['presente', 'Presencias'], ['ausente', 'Faltas'], ['retraso', 'Retrasos'], ['pend', 'Pendientes']];
const cumple = { todo: () => true, presente: x => x.tipo === 'presente', ausente: x => x.tipo === 'ausente', retraso: x => x.tipo === 'presente' && x.r.retraso, pend: x => x.tipo === 'pend' };

export async function vista(main, id) {
  const pintar = async () => {
    const [p, grupos, asist, especiales, temporadas, foto, aj] = await Promise.all([
      leer('participantes', id), todos('grupos'), todos('asistencias'), todos('diasEspeciales'), todos('temporadas'), leer('fotos', id), leer('ajustes', 'justificado')]);
    if (!p) return main.replaceChildren(h('p', { class: 'vacio' }, t('Este participante no existe.')), h('a', { class: 'btn', href: '#/participantes' }, t('Volver')));
    const modo = aj?.valor || 'excluye', hoy = hoyFecha(), mes = estado.mes;
    const temp = temporadas.find(s => s.id === estado.temporadaId);
    if (ver.periodo === 'temporada' && !temp) ver.periodo = 'todo';

    // ---- Datos del período elegido ----
    const mias = asist.filter(a => a.participanteId === p.id);
    const primero = [...p.periodos.map(x => x.desde + '-01'), ...mias.map(a => a.fecha)].sort()[0] || hoy;
    const [desde, hasta] = ver.periodo === 'mes' ? [mes + '-01', mes + '-31'] : ver.periodo === 'temporada' ? [temp.inicio, temp.fin] : [primero, '9999-12-31'];
    const regs = registrosDe(p, mias, especiales, hoy).filter(r => r.fecha >= desde && r.fecha <= hasta);
    const c = conteo(regs, modo);
    const marcadas = new Set(mias.filter(a => a.estado).map(a => a.fecha));
    const pend = previstos(p, desde, hasta, grupos, especiales, hoy).filter(f => !marcadas.has(f));
    const { presencias, faltas } = rachas(regs);

    // ---- Cabecera: foto, nombre, datos ----
    const fichero = h('input', { type: 'file', accept: 'image/*', hidden: true, onchange: async e => {
      const f = e.target.files[0];
      if (!f) return;
      try { await guardar('fotos', { id: p.id, datos: await fotoDesde(f) }); pintar(); } catch (err) { alert(t(err.message)); }
    } });
    const grupoAct = grupos.find(g => g.id === grupoEn(p, mes));
    const fechaCumple = p.nacimiento ? fechaCorta(p.nacimiento).slice(0, 5) : '';
    const cabecera = h('div', { class: 'ficha-cab' },
      h('button', { class: 'avatar-btn', 'aria-label': t('Cambiar foto'), onclick: () => fichero.click() }, avatar(p, foto?.datos, 84)),
      h('div', { class: 'grow' },
        h('h2', {}, p.nombre),
        h('div', { class: 'chips' }, chipEdad(p.anyNacimiento, true), h('span', { class: 'chip' }, grupoAct ? grupoAct.nombre : t('De baja')), fechaCumple ? h('span', { class: 'chip' }, '🎂 ' + fechaCumple) : null),
        p.notas ? h('p', { class: 'sec' }, p.notas) : null),
      h('div', { class: 'cuenta-botones' },
        h('button', { class: 'btn', onclick: async () => { if (await editarParticipante(p, grupos, mes)) pintar(); } }, '✏️ ' + t('Editar')),
        foto ? h('button', { class: 'btn', onclick: async () => { if (confirm(t('¿Quitar la foto?'))) { await borrar('fotos', p.id); pintar(); } } }, t('Quitar foto')) : null),
      fichero);

    // ---- Selector de período ----
    const boton = (k, txt) => h('button', { class: 'btn' + (ver.periodo === k ? ' primario' : ''), onclick: () => { ver.periodo = k; pintar(); } }, txt);
    const selector = h('div', { class: 'segm' }, temp ? boton('temporada', `${t('Temporada')} ${temp.nombre}`) : null, boton('mes', t('Mes')), boton('todo', t('Todo el historial')));
    const navMes = ver.periodo === 'mes' ? h('div', { class: 'barra-mes' },
      h('button', { class: 'btn', 'aria-label': t('Mes anterior'), onclick: () => { estado.mes = mesAnterior(mes); pintar(); } }, '‹'),
      h('strong', {}, nombreMes(mes)),
      h('button', { class: 'btn', 'aria-label': t('Mes siguiente'), onclick: () => { estado.mes = mesSiguiente(mes); pintar(); } }, '›')) : null;

    // ---- Resumen ----
    const stat = (v, et, cl) => h('div', { class: 'stat ' + cl }, h('b', {}, String(v)), t(et));
    const resumen = h('div', { class: 'card' },
      h('div', { class: 'resumen' }, anillo(c.pct, 96, nivel(c.pct)),
        h('div', { class: 'stats' }, stat(c.presentes, 'Presencias', 'ok'), stat(c.faltas, 'Faltas', 'ko'), stat(c.justificadas, 'Justificadas', 'mid'),
          stat(c.retrasos, 'Retrasos', ''), stat(pend.length, 'Pendientes', ''), stat(c.computables, 'Sesiones contadas', ''))),
      h('div', { class: 'chips' },
        presencias ? h('span', { class: 'chip' }, '🔥 ' + t('{n} presencias seguidas', { n: presencias })) : null,
        faltas >= 2 ? h('span', { class: 'chip' }, '⚠️ ' + t('{n} faltas seguidas', { n: faltas })) : null),
      h('p', { class: 'sec' }, t('Solo cuentan los días de entreno ya realizados con la lista pasada. Porcentaje = presencias / sesiones contadas.')));

    // ---- Por meses ----
    const meses = porMes(regs), pendMes = new Map();
    for (const f of pend) pendMes.set(mesDeFecha(f), (pendMes.get(mesDeFecha(f)) || 0) + 1);
    const listaMeses = [...new Set([...meses.keys(), ...pendMes.keys()])].sort();
    const bloqueMeses = ver.periodo !== 'mes' && listaMeses.length ? h('div', { class: 'card' }, h('h3', {}, t('Por meses')),
      ...listaMeses.map(m => {
        const cm = conteo(meses.get(m) || [], modo);
        return h('div', { class: 'mes-fila' }, h('span', { class: 'mes-nom' }, nombreMes(m)),
          h('div', { class: 'barra' }, h('div', { class: 'nv-' + nivel(cm.pct), style: `width:${cm.pct ?? 0}%` })),
          h('span', { class: 'sec' }, `${cm.pct == null ? '—' : cm.pct + '%'} · ${cm.presentes}/${cm.computables}` + (pendMes.get(m) ? ` · ⏳ ${pendMes.get(m)}` : '')));
      })) : null;

    // ---- Datos y logros ----
    const editarHito = async hito => {
      const r = await pedir({
        titulo: hito ? 'Editar dato' : 'Nuevo dato', valores: hito || { tipo: 'reto', fecha: hoy },
        campos: [
          { n: 'tipo', et: 'Tipo', tipo: 'select', opciones: Object.keys(NOMBRE).map(k => ({ v: k, t: `${ICONO[k]} ${t(NOMBRE[k])}` })) },
          { n: 'fecha', et: 'Fecha', tipo: 'date', req: true },
          { n: 'texto', et: 'Descripción', tipo: 'textarea', ph: 'Ganadora del reto de enero' }],
        acciones: hito ? [{ id: 'borrar', t: 'Borrar' }] : []
      });
      if (!r) return;
      let hitos = p.hitos || [];
      if (r.__accion === 'borrar') hitos = hitos.filter(x => x.id !== hito.id);
      else hitos = hito ? hitos.map(x => (x.id === hito.id ? { ...x, ...r } : x)) : [...hitos, { id: nuevoId(), ...r }];
      await guardar('participantes', { ...p, hitos });
      pintar();
    };
    const hitos = [...(p.hitos || [])].sort((a, b) => b.fecha.localeCompare(a.fecha));
    const cardHitos = h('div', { class: 'card' },
      h('div', { class: 'cab' }, h('h3', {}, t('Datos y logros')), h('button', { class: 'btn', onclick: () => editarHito() }, '+ ' + t('Añadir'))),
      ...(hitos.length ? hitos.map(x => h('div', { class: 'hito', onclick: () => editarHito(x) },
        h('span', { class: 'ico-h' }, ICONO[x.tipo] || '📝'),
        h('div', { class: 'grow' }, h('strong', {}, t(NOMBRE[x.tipo] || 'Nota')), h('div', {}, x.texto), h('div', { class: 'sec' }, fechaCorta(x.fecha)))))
        : [h('p', { class: 'sec' }, t('Aquí puedes apuntar logros, cumpleaños, retos ganados…'))]));

    // ---- Día a día ----
    const todas = [...regs.map(r => ({ f: r.fecha, tipo: r.estado, r })), ...pend.map(f => ({ f, tipo: 'pend' }))].sort((a, b) => b.f.localeCompare(a.f));
    const visibles = todas.filter(cumple[ver.filtro]);
    const linea = x => h('div', { class: 'dia-fila ' + x.tipo },
      h('span', { class: 'marca' }, x.tipo === 'presente' ? '✓' : x.tipo === 'ausente' ? '✗' : '⏳'),
      h('div', { class: 'grow' }, h('div', {}, fechaLarga(x.f)),
        x.r ? h('div', { class: 'sec' }, [x.r.justificada ? t('Justificada') : '', x.r.retraso ? '⏱ ' + t('Retraso') : '', x.r.comentario ? '💬 ' + x.r.comentario : ''].filter(Boolean).join(' · '))
            : h('div', { class: 'sec' }, t('Sin lista pasada'))));
    const diario = h('div', { class: 'card' }, h('h3', {}, t('Día a día')),
      h('div', { class: 'segm' }, ...FILTROS.map(([k, et]) =>
        h('button', { class: 'btn mini' + (ver.filtro === k ? ' primario' : ''), onclick: () => { ver.filtro = k; pintar(); } }, `${t(et)} (${todas.filter(cumple[k]).length})`))),
      ...(visibles.length ? visibles.map(linea) : [h('p', { class: 'sec' }, t('No hay días con este filtro.'))]));

    main.replaceChildren(h('a', { class: 'btn mini', href: '#/participantes' }, '← ' + t('Participantes')), cabecera, selector, navMes, resumen, bloqueMeses, cardHitos, diario);
  };
  await pintar();
}
