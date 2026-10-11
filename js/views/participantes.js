// Participantes: lista separada por grupos, altas/bajas/cambios de grupo por meses (logic/periods.js)
// y acceso a la ficha de cada uno. Se muestra a quien está activo en el mes que se mira (flechas ‹ ›).
import { todos, guardar, nuevoId } from '../storage.js';
import { estado } from '../state.js';
import { h, pedir, chipEdad, avatar } from '../utils/dom.js';
import { nombreMes, mesAnterior, mesSiguiente } from '../utils/dates.js';
import { porEdadYNombre, matizEdad } from '../utils/orden.js';
import { estaActivo, grupoEn, periodoEn, diasEn, diasGrupo, nuevoParticipante, darDeBaja, reactivar, cambiarGrupo } from '../logic/periods.js';
import { t, diasCortos } from '../i18n.js';

const filtro = { texto: '', grupo: '', bajas: false }; // se recuerda al cambiar de pantalla

// Formulario de alta/edición (lo usan esta pantalla y la ficha). Devuelve true si algo cambió.
export async function editarParticipante(p, grupos, mes) {
  if (!grupos.length) { alert(t('Primero crea al menos un grupo.')); return false; }
  const per = p && periodoEn(p, mes);
  const grupoIni = per?.grupoId ?? grupos[0].id;
  const diasDe = id => { const g = grupos.find(x => x.id === id); return g ? diasGrupo(g, mes) : []; };
  const campos = [
    { n: 'nombre', et: 'Nombre', req: true },
    { n: 'anyNacimiento', et: 'Año de nacimiento', tipo: 'number', ph: '2016' },
    { n: 'nacimiento', et: 'Fecha de nacimiento completa (opcional, para el cumpleaños)', tipo: 'date' },
    { n: 'grupoId', et: 'Grupo', tipo: 'select', opciones: grupos.map(g => ({ v: g.id, t: g.nombre })), cambia: (v, poner) => poner.dias(diasDe(v)) },
    { n: 'dias', et: 'Días de asistencia', tipo: 'dias' },
    ...(p ? [] : [{ n: 'mes', et: 'Se incorpora en el mes', tipo: 'month', req: true, ph: '2025-10' }]),
    { n: 'notas', et: 'Notas', tipo: 'textarea' }
  ];
  const r = await pedir({
    titulo: p ? 'Editar participante' : 'Nuevo participante', campos,
    ayuda: p ? t('Los cambios de grupo o de días se aplican desde {mes}. Los meses anteriores no cambian.', { mes: nombreMes(mes) }) : 'Aparecerá en ese mes completo y en los siguientes.',
    valores: { ...p, grupoId: grupoIni, dias: per ? diasEn(p, mes, grupos) : diasDe(grupoIni), mes },
    acciones: p ? [{ id: 'baja', t: 'Dar de baja' }] : []
  });
  if (!r) return false;
  if (r.__accion === 'baja') {
    if (!confirm(t('Se quitará de {mes} en adelante. Los meses anteriores no cambian.', { mes: nombreMes(mes) }))) return false;
    await guardar('participantes', darDeBaja(p, mes));
    return true;
  }
  if (!r.dias.length) { alert(t('Elige al menos un día de asistencia.')); return false; }
  const dias = r.dias.join() === diasDe(r.grupoId).join() ? null : r.dias; // null = usa los del grupo
  const nac = r.nacimiento || '';
  const any = nac ? +nac.slice(0, 4) : r.anyNacimiento; // la fecha completa manda sobre el año
  if (!p) {
    await guardar('participantes', { ...nuevoParticipante({ ...r, anyNacimiento: any, id: nuevoId() }, dias), nacimiento: nac, hitos: [] });
  } else {
    let q = { ...p, nombre: r.nombre, anyNacimiento: any, nacimiento: nac, notas: r.notas };
    if (r.grupoId !== per.grupoId || r.dias.join() !== diasEn(p, mes, grupos).join()) q = cambiarGrupo(q, mes, r.grupoId, dias);
    await guardar('participantes', q);
  }
  return true;
}

export async function vista(main) {
  const pintar = async () => {
    const parts = await todos('participantes');
    const grupos = (await todos('grupos')).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    const fotos = new Map((await todos('fotos')).map(f => [f.id, f.datos]));
    const mes = estado.mes, dias = diasCortos();

    const editar = async p => { if (await editarParticipante(p, grupos, mes)) pintar(); };
    const volver = async p => {
      if (!confirm(t('¿Reactivar a {nombre} desde {mes}? Conservará su historial.', { nombre: p.nombre, mes: nombreMes(mes) }))) return;
      const ultimo = [...p.periodos].sort((a, b) => a.desde.localeCompare(b.desde)).at(-1);
      try { await guardar('participantes', reactivar(p, mes, ultimo.grupoId, ultimo.dias)); pintar(); }
      catch (e) { alert(t(e.message)); }
    };

    // ---- Lista ----
    const fila = p => {
      const per = periodoEn(p, mes), matiz = matizEdad(p.anyNacimiento);
      const detalle = per ? diasEn(p, mes, grupos).map(d => dias[d - 1]).join(' ') : t('De baja o aún no incorporado en este mes');
      return h('div', { class: 'card fila' + (matiz != null ? ' conedad' : ''), style: matiz != null ? `--h:${matiz}` : null },
        h('a', { class: 'ficha-enlace grow', href: '#/participante/' + p.id },
          avatar(p, fotos.get(p.id)),
          h('div', { class: 'grow' }, h('strong', {}, p.nombre), h('div', { class: 'sec' }, detalle)),
          chipEdad(p.anyNacimiento, true)),
        per ? h('button', { class: 'btn', 'aria-label': t('Editar'), onclick: () => editar(p) }, '✏️')
            : h('button', { class: 'btn', onclick: () => volver(p) }, t('Reactivar')));
    };
    const filas = () => {
      const q = filtro.texto.toLowerCase();
      const busca = parts.filter(p => !q || p.nombre.toLowerCase().includes(q)).sort(porEdadYNombre); // edad y luego alfabético
      if (filtro.bajas) {
        const l = busca.filter(p => !estaActivo(p, mes));
        return l.length ? l.map(fila) : [h('p', { class: 'vacio' }, t('Nadie de baja en este mes.'))];
      }
      const activos = busca.filter(p => estaActivo(p, mes));
      const secciones = grupos.filter(g => !filtro.grupo || g.id === filtro.grupo)
        .map(g => [g, activos.filter(p => grupoEn(p, mes) === g.id)])
        .filter(([, l]) => l.length || !q);
      if (!secciones.length) return [h('p', { class: 'vacio' }, parts.length ? t('Nadie coincide con el filtro en este mes.') : t('Aún no hay participantes. Pulsa «Añadir».'))];
      return secciones.map(([g, l]) => h('section', { class: 'grupo' },
        h('div', { class: 'grupo-cab' }, h('strong', {}, g.nombre),
          h('span', { class: 'sec' }, [`${l.length} ${t('participantes')}`, diasGrupo(g, mes).map(d => dias[d - 1]).join(' '), g.horario].filter(Boolean).join(' · '))),
        ...(l.length ? l.map(fila) : [h('p', { class: 'sec' }, t('Sin participantes este mes.'))])));
    };
    const lista = h('div', {}, ...filas());

    main.replaceChildren(
      h('div', { class: 'cab' }, h('h2', {}, t('Participantes')), h('button', { class: 'btn primario', onclick: () => editar() }, '+ ' + t('Añadir'))),
      h('div', { class: 'barra-mes' },
        h('button', { class: 'btn', 'aria-label': t('Mes anterior'), onclick: () => { estado.mes = mesAnterior(mes); pintar(); } }, '‹'),
        h('strong', {}, nombreMes(mes)),
        h('button', { class: 'btn', 'aria-label': t('Mes siguiente'), onclick: () => { estado.mes = mesSiguiente(mes); pintar(); } }, '›')),
      h('div', { class: 'filtros' },
        h('input', { type: 'search', placeholder: t('Buscar…'), value: filtro.texto, oninput: e => { filtro.texto = e.target.value; lista.replaceChildren(...filas()); } }),
        h('select', { 'aria-label': t('Filtrar por grupo'), onchange: e => { filtro.grupo = e.target.value; lista.replaceChildren(...filas()); } },
          h('option', { value: '' }, t('Todos los grupos')),
          ...grupos.map(g => h('option', { value: g.id, selected: filtro.grupo === g.id }, g.nombre))),
        h('label', { class: 'chk' }, h('input', { type: 'checkbox', checked: filtro.bajas, onchange: e => { filtro.bajas = e.target.checked; pintar(); } }), t('Ver bajas'))),
      lista);
  };
  await pintar();
}
