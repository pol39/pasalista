// Pantalla "Pasar lista": un toque por persona. Lo secundario queda tras el botón ⋯.
import { todos, guardar, borrar } from '../storage.js';
import { estado } from '../state.js';
import { h, pedir } from '../utils/dom.js';
import { sumarDias, hoyFecha, fechaLarga, mesDeFecha, diaSemana } from '../utils/dates.js';
import { estaActivo, grupoEn, diasGrupo } from '../logic/periods.js';
import { especialEn, listaDelDia } from '../logic/sessions.js';
import { ponerAsistencia } from '../asistencia.js';
import { crearEspeciales } from './especiales.js';
import { t } from '../i18n.js';

export async function vista(main) {
  let tm, tc; // temporizadores: aviso "Guardado" y guardado del comentario general

  const abrir = async () => {
    const [grupos, parts, especiales, sesiones, asist] =
      await Promise.all(['grupos', 'participantes', 'diasEspeciales', 'sesiones', 'asistencias'].map(c => todos(c)));
    grupos.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    if (!grupos.length) return main.replaceChildren(h('h2', {}, t('Pasar lista')), h('p', { class: 'vacio' }, t('Primero crea un grupo y añade participantes.')));
    if (!grupos.some(g => g.id === estado.grupoId)) estado.grupoId = grupos[0].id;
    const grupo = grupos.find(g => g.id === estado.grupoId), fecha = estado.fecha, mes = mesDeFecha(fecha);
    const sesion = sesiones.find(s => s.fecha === fecha && s.grupoId === grupo.id)
      || { id: `${fecha}|${grupo.id}`, fecha, grupoId: grupo.id, comentario: '', extras: [] };
    const reg = new Map(asist.filter(a => a.fecha === fecha).map(a => [a.id, a]));
    const clave = p => `${p.id}|${fecha}`;
    const especial = especialEn(fecha, grupo.id, especiales);
    const calc = () => listaDelDia(fecha, grupo, parts, grupos, sesion);

    // ---- Cabecera: fecha y grupo ----
    const mover = (txt, n) => h('button', { class: 'btn', 'aria-label': n < 0 ? t('Día anterior') : t('Día siguiente'), onclick: () => { estado.fecha = sumarDias(fecha, n); abrir(); } }, txt);
    const cabecera = [
      h('div', { class: 'cab' }, h('h2', {}, t('Pasar lista')),
        fecha !== hoyFecha() ? h('button', { class: 'btn', onclick: () => { estado.fecha = hoyFecha(); abrir(); } }, t('Ir a hoy')) : null),
      h('div', { class: 'barra-mes' }, mover('‹', -1),
        h('div', { class: 'centro' }, h('strong', {}, fechaLarga(fecha)),
          h('input', { type: 'date', value: fecha, 'aria-label': t('Elegir fecha'), onchange: e => { if (e.target.value) { estado.fecha = e.target.value; abrir(); } } })),
        mover('›', 1)),
      h('div', { class: 'segm' }, ...grupos.map(g =>
        h('button', { class: 'btn' + (g.id === grupo.id ? ' primario' : ''), onclick: () => { estado.grupoId = g.id; abrir(); } }, g.nombre)))
    ];

    // ---- Día no lectivo: no se pasa lista ----
    if (especial) {
      return main.replaceChildren(...cabecera, h('div', { class: 'card banner' },
        h('strong', {}, '🚫 ' + t('Día no lectivo')),
        h('div', {}, especial.tipo + (especial.motivo ? ': ' + especial.motivo : '')),
        h('div', { class: 'sec' }, especial.grupoId ? grupo.nombre : t('Todos los grupos')),
        h('p', { class: 'sec' }, t('No cuenta en ningún porcentaje.')),
        h('button', { class: 'btn', onclick: async () => {
          if (!confirm(especial.grupoId ? t('¿Deshacer el día no lectivo?') : t('Este día es no lectivo para todos los grupos. ¿Deshacerlo para todos?'))) return;
          await borrar('diasEspeciales', especial.id); abrir();
        } }, '↩ ' + t('Deshacer'))));
    }

    // ---- Guardado ----
    const ind = h('span', { class: 'guardado', role: 'status' });
    const avisar = () => { ind.textContent = t('Guardado ✓'); clearTimeout(tm); tm = setTimeout(() => { ind.textContent = ''; }, 1500); };
    const fallo = e => alert(t('No se pudo guardar: ') + e.message);
    const poner = (p, cambios, sinPintar) => { ponerAsistencia(reg, p.id, fecha, cambios).then(avisar, fallo); if (!sinPintar) pintar(); };
    const guardarSesion = () => ((sesion.comentario || sesion.extras.length) ? guardar('sesiones', sesion) : borrar('sesiones', sesion.id)).then(avisar, fallo);
    const marcar = (p, est) => poner(p, { estado: reg.get(clave(p))?.estado === est ? null : est, justificada: false, retraso: false });

    // ---- Opciones secundarias (⋯) ----
    const opciones = async p => {
      const r = reg.get(clave(p)), est = r?.estado, extra = sesion.extras.includes(p.id);
      const res = await pedir({
        titulo: p.nombre,
        campos: [
          { n: 'comentario', et: 'Comentario', tipo: 'textarea', ph: 'Se sintió mal, avisó la familia…' },
          ...(est === 'ausente' ? [{ n: 'justificada', et: 'Ausencia justificada', tipo: 'check' }] : []),
          ...(est === 'presente' ? [{ n: 'retraso', et: 'Llegó con retraso', tipo: 'check' }] : [])
        ],
        valores: r || {}, acciones: extra ? [{ id: 'quitar', t: 'Quitar de esta sesión' }] : []
      });
      if (!res) return;
      if (res.__accion === 'quitar') {
        sesion.extras = sesion.extras.filter(x => x !== p.id);
        guardarSesion();
        poner(p, { estado: null, justificada: false, retraso: false, comentario: '' });
      } else poner(p, { comentario: res.comentario, justificada: !!res.justificada, retraso: !!res.retraso });
    };

    // ---- Filas y contador ----
    const fila = p => {
      const r = reg.get(clave(p)), est = r?.estado;
      const notas = [r?.comentario ? '💬' : '', r?.justificada ? t('Justificada') : '', r?.retraso ? '⏱ ' + t('Retraso') : ''].filter(Boolean).join(' · ');
      return h('div', { class: 'card asis' },
        h('div', { class: 'fila' },
          h('div', { class: 'grow' }, h('strong', {}, p.nombre), ' ', sesion.extras.includes(p.id) ? h('span', { class: 'chip' }, t('Extra')) : null,
            notas ? h('div', { class: 'sec' }, notas) : null),
          h('button', { class: 'btn mini', 'aria-label': t('Más opciones'), onclick: () => opciones(p) }, '⋯')),
        h('div', { class: 'dos' },
          h('button', { class: 'btn grande ok' + (est === 'presente' ? ' on' : ''), 'aria-pressed': String(est === 'presente'), onclick: () => marcar(p, 'presente') }, '✓ ' + t('Ha venido')),
          h('button', { class: 'btn grande ko' + (est === 'ausente' ? ' on' : ''), 'aria-pressed': String(est === 'ausente'), onclick: () => marcar(p, 'ausente') }, '✗ ' + t('No ha venido'))));
    };
    const contador = h('div', {}), listaEl = h('div', {});
    const pintar = () => {
      const l = calc();
      const marcados = l.filter(p => reg.get(clave(p))?.estado);
      const pres = marcados.filter(p => reg.get(clave(p)).estado === 'presente').length;
      contador.replaceChildren(
        h('div', { class: 'fila' }, h('strong', { class: 'grow' }, `${marcados.length} ${t('de')} ${l.length} ${t('marcados')} · ${pres} ${t('presentes')} · ${marcados.length - pres} ${t('ausentes')}`), ind),
        h('div', { class: 'barra' }, h('div', { style: `width:${l.length ? 100 * marcados.length / l.length : 0}%` })));
      listaEl.replaceChildren(...(l.length ? l.map(fila) : [h('p', { class: 'vacio' },
        diasGrupo(grupo, mes).includes(diaSemana(fecha)) ? t('No hay participantes activos este día.') : t('Este grupo no entrena este día. Puedes añadir participantes extra.'))]));
    };

    // ---- Acciones generales ----
    const todosPresentes = () => { calc().filter(p => !reg.get(clave(p))?.estado).forEach(p => poner(p, { estado: 'presente' }, true)); pintar(); };
    const añadir = async () => {
      const enLista = new Set(calc().map(p => p.id));
      const cands = parts.filter(p => estaActivo(p, mes) && !enLista.has(p.id)).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
      if (!cands.length) return alert(t('No hay más participantes activos que añadir.'));
      const r = await pedir({
        titulo: 'Añadir a esta sesión', ayuda: 'Para una recuperación o un invitado que ya esté dado de alta.',
        campos: [{ n: 'id', et: 'Participante', tipo: 'select', opciones: cands.map(p => ({ v: p.id, t: `${p.nombre} (${grupos.find(g => g.id === grupoEn(p, mes))?.nombre ?? ''})` })) }]
      });
      if (!r) return;
      sesion.extras.push(r.id); guardarSesion(); pintar();
    };
    const coment = h('textarea', {
      placeholder: t('Comentario general de la sesión'), 'aria-label': t('Comentario general de la sesión'),
      oninput: e => { sesion.comentario = e.target.value.trim(); clearTimeout(tc); tc = setTimeout(guardarSesion, 600); },
      onchange: () => { clearTimeout(tc); guardarSesion(); }
    });
    coment.value = sesion.comentario;

    main.replaceChildren(...cabecera, contador,
      h('div', { class: 'fila acc' },
        h('button', { class: 'btn primario', onclick: todosPresentes }, '✓ ' + t('Marcar todos como presentes'))),
      listaEl,
      h('div', { class: 'fila acc' },
        h('button', { class: 'btn', onclick: añadir }, '+ ' + t('Añadir a esta sesión')),
        h('button', { class: 'btn', onclick: async () => { if (await crearEspeciales(grupos, { desde: fecha, grupoId: grupo.id })) abrir(); } }, '🚫 ' + t('Marcar día no lectivo'))),
      coment);
    pintar();
  };
  await abrir();
}
