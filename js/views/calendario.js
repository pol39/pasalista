// Calendario mensual (móvil y ordenador) y, solo en ordenador, la tabla mensual de asistencia.
import { todos, leer } from '../storage.js';
import { estado } from '../state.js';
import { h, chipEdad } from '../utils/dom.js';
import { porEdadYNombre } from '../utils/orden.js';
import { nombreMes, mesAnterior, mesSiguiente, diasDelMes, diaSemana, hoyFecha } from '../utils/dates.js';
import { estaActivo, grupoEn, diasGrupo } from '../logic/periods.js';
import { especialEn, estadoDia, listaDelDia, porcentaje } from '../logic/sessions.js';
import { nivel } from '../logic/stats.js';
import { ponerAsistencia } from '../asistencia.js';
import { t, diasLetras } from '../i18n.js';

const siguiente = e => (!e ? 'presente' : e === 'presente' ? 'ausente' : null); // vacío → ✓ → ✗ → vacío

export async function vista(main) {
  const pintar = async () => {
    const LETRAS = diasLetras();
    const [parts, grupos, especiales, sesiones, asist] =
      await Promise.all(['participantes', 'grupos', 'diasEspeciales', 'sesiones', 'asistencias'].map(c => todos(c)));
    grupos.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    if (!grupos.length) return main.replaceChildren(h('h2', {}, t('Calendario')), h('p', { class: 'vacio' }, t('Primero crea un grupo y añade participantes.')));
    const justificado = (await leer('ajustes', 'justificado'))?.valor || 'excluye';
    if (!grupos.some(g => g.id === estado.grupoId)) estado.grupoId = grupos[0].id;
    const grupo = grupos.find(g => g.id === estado.grupoId), mes = estado.mes;
    const reg = new Map(asist.filter(a => a.fecha.startsWith(mes)).map(a => [a.id, a]));
    const ctx = { parts, grupos, especiales, sesiones, reg };
    const dias = diasDelMes(mes);
    const sesionDe = f => sesiones.find(s => s.id === `${f}|${grupo.id}`);

    // ---- Calendario de colores ----
    const cal = h('div', { class: 'cal' },
      ...LETRAS.map(l => h('div', { class: 'sec cabdia' }, l)),
      ...Array(diaSemana(dias[0]) - 1).fill(0).map(() => h('div')),
      ...dias.map(f => {
        const e = estadoDia(f, grupo, ctx), esp = especialEn(f, grupo.id, especiales);
        return h('button', {
          class: 'dia ' + e.tipo, title: esp ? t(esp.tipo) + (esp.motivo ? ': ' + esp.motivo : '') : null,
          onclick: () => { estado.fecha = f; estado.grupoId = grupo.id; location.hash = '#/hoy'; }
        }, String(+f.slice(8)), f === hoyFecha() ? h('i', { class: 'hoy' }) : null);
      }));
    const leyenda = h('div', { class: 'leyenda sec' }, ...[['completa', 'Lista pasada'], ['parcial', 'Incompleta'], ['pendiente', 'Pendiente'], ['nolectivo', 'No lectivo'], ['sinentreno', 'Sin entreno']]
      .map(([c, x]) => h('span', {}, h('i', { class: 'sw ' + c }), t(x))));

    // ---- Tabla mensual (ordenador): filas = participantes, columnas = días de entreno ----
    const cols = dias.filter(f => diasGrupo(grupo, mes).includes(diaSemana(f)) || sesionDe(f)?.extras?.length);
    const quien = new Map(cols.map(f => [f, new Set(listaDelDia(f, grupo, parts, grupos, sesionDe(f)).map(p => p.id))]));
    const noLectivo = new Set(cols.filter(f => especialEn(f, grupo.id, especiales)));
    const extrasMes = new Set(sesiones.filter(s => s.grupoId === grupo.id && s.fecha.startsWith(mes)).flatMap(s => s.extras || []));
    const filas = parts.filter(p => (estaActivo(p, mes) && grupoEn(p, mes) === grupo.id) || extrasMes.has(p.id))
      .sort(porEdadYNombre);

    const clic = (p, f) => {
      ponerAsistencia(reg, p.id, f, { estado: siguiente(reg.get(`${p.id}|${f}`)?.estado), justificada: false, retraso: false }).catch(e => alert(e.message));
      wrap.replaceChildren(tabla());
    };
    const celda = (p, f) => {
      if (noLectivo.has(f)) return h('td', { class: 'nl' });
      if (!quien.get(f).has(p.id)) return h('td', { class: 'na' }, '·');
      const r = reg.get(`${p.id}|${f}`), est = r?.estado;
      return h('td', {}, h('button', { class: 'celda ' + (est || ''), 'aria-label': `${p.nombre} ${f}`, onclick: () => clic(p, f) }, est === 'presente' ? '✓' : est === 'ausente' ? '✗' : ''));
    };
    const valor = p => porcentaje(cols.filter(f => !noLectivo.has(f) && quien.get(f).has(p.id)).map(f => reg.get(`${p.id}|${f}`)), justificado);
    // El % va justo después del nombre: así se ve sin deslizar la tabla (importante en el móvil).
    const tabla = () => h('table', {},
      h('thead', {}, h('tr', {}, h('th', {}, t('Participante')), h('th', {}, '%'),
        ...cols.map(f => h('th', { class: noLectivo.has(f) ? 'nl' : '' }, h('div', {}, LETRAS[diaSemana(f) - 1]), h('div', {}, String(+f.slice(8))), noLectivo.has(f) ? '🚫' : null)))),
      h('tbody', {}, ...filas.map(p => {
        const v = valor(p);
        return h('tr', {}, h('td', {}, h('div', { class: 'nom' }, chipEdad(p.anyNacimiento), ' ', p.nombre)),
          h('td', { class: 'pct t-' + nivel(v) }, v == null ? '—' : v + '%'), ...cols.map(f => celda(p, f)));
      })));
    const wrap = h('div', { class: 'tabla-wrap' }, filas.length && cols.length ? tabla() : h('p', { class: 'vacio' }, t('No hay participantes o días de entreno este mes.')));

    main.replaceChildren(
      h('div', { class: 'cab' }, h('h2', {}, t('Calendario'))),
      h('div', { class: 'segm' }, ...grupos.map(g => h('button', { class: 'btn' + (g.id === grupo.id ? ' primario' : ''), onclick: () => { estado.grupoId = g.id; pintar(); } }, g.nombre))),
      h('div', { class: 'barra-mes' },
        h('button', { class: 'btn', 'aria-label': t('Mes anterior'), onclick: () => { estado.mes = mesAnterior(mes); pintar(); } }, '‹'),
        h('strong', {}, nombreMes(mes)),
        h('button', { class: 'btn', 'aria-label': t('Mes siguiente'), onclick: () => { estado.mes = mesSiguiente(mes); pintar(); } }, '›')),
      cal, leyenda,
      h('h3', { class: 'solo-tabla' }, t('Tabla mensual')), wrap);
  };
  await pintar();
}
