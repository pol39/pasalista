// Participantes: altas, bajas y cambios de grupo POR MESES (ver js/logic/periods.js).
// La lista muestra a quien está activo en el mes que se está mirando (flechas ‹ ›).
import { todos, guardar, nuevoId } from '../storage.js';
import { estado } from '../state.js';
import { h, pedir, chipEdad } from '../utils/dom.js';
import { porEdadYNombre, matizEdad } from '../utils/orden.js';
import { nombreMes, mesAnterior, mesSiguiente, edad } from '../utils/dates.js';
import { estaActivo, grupoEn, periodoEn, diasEn, diasGrupo, nuevoParticipante, darDeBaja, reactivar, cambiarGrupo } from '../logic/periods.js';
import { t } from '../i18n.js';

const NOMBRES_DIA = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'];
const filtro = { texto: '', grupo: '', bajas: false }; // se recuerda al cambiar de pantalla

export async function vista(main) {
  const pintar = async () => {
    const parts = await todos('participantes');
    const grupos = (await todos('grupos')).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    const mes = estado.mes;
    const diasDe = id => { const g = grupos.find(x => x.id === id); return g ? diasGrupo(g, mes) : []; };
    const nombreGrupo = id => grupos.find(g => g.id === id)?.nombre ?? '—';

    // ---- Acciones ----
    const editar = async p => {
      if (!grupos.length) return alert(t('Primero crea al menos un grupo.'));
      const per = p && periodoEn(p, mes);
      const grupoIni = per?.grupoId ?? grupos[0].id;
      const campos = [
        { n: 'nombre', et: 'Nombre', req: true },
        { n: 'anyNacimiento', et: 'Año de nacimiento', tipo: 'number', ph: '2016' },
        { n: 'grupoId', et: 'Grupo', tipo: 'select', opciones: grupos.map(g => ({ v: g.id, t: g.nombre })), cambia: (v, poner) => poner.dias(diasDe(v)) },
        { n: 'dias', et: 'Días de asistencia', tipo: 'dias' },
        ...(p ? [] : [{ n: 'mes', et: 'Se incorpora en el mes', tipo: 'month', req: true, ph: '2025-10' }]),
        { n: 'notas', et: 'Notas', tipo: 'textarea' }
      ];
      const r = await pedir({
        titulo: p ? 'Editar participante' : 'Nuevo participante', campos,
        ayuda: p ? `Los cambios de grupo o de días se aplican desde ${nombreMes(mes)}. Los meses anteriores no cambian.` : 'Aparecerá en ese mes completo y en los siguientes.',
        valores: { ...p, grupoId: grupoIni, dias: per ? diasEn(p, mes, grupos) : diasDe(grupoIni), mes },
        acciones: p ? [{ id: 'baja', t: 'Dar de baja' }] : []
      });
      if (!r) return;
      if (r.__accion === 'baja') {
        if (!confirm(`Se quitará de ${nombreMes(mes)} en adelante. Los meses anteriores no cambian.`)) return;
        await guardar('participantes', darDeBaja(p, mes));
      } else {
        if (!r.dias.length) return alert(t('Elige al menos un día de asistencia.'));
        const dias = r.dias.join() === diasDe(r.grupoId).join() ? null : r.dias; // null = usa los del grupo
        if (!p) {
          await guardar('participantes', nuevoParticipante({ ...r, id: nuevoId() }, dias));
        } else {
          let q = { ...p, nombre: r.nombre, anyNacimiento: r.anyNacimiento, notas: r.notas };
          if (r.grupoId !== per.grupoId || r.dias.join() !== diasEn(p, mes, grupos).join()) q = cambiarGrupo(q, mes, r.grupoId, dias);
          await guardar('participantes', q);
        }
      }
      pintar();
    };

    const volver = async p => {
      if (!confirm(`¿Reactivar a ${p.nombre} desde ${nombreMes(mes)}? Conservará su historial.`)) return;
      const ultimo = [...p.periodos].sort((a, b) => a.desde.localeCompare(b.desde)).at(-1);
      try { await guardar('participantes', reactivar(p, mes, ultimo.grupoId, ultimo.dias)); pintar(); }
      catch (e) { alert(e.message); }
    };

    // ---- Lista ----
    const fila = p => {
      const per = periodoEn(p, mes);
      const detalle = per
        ? [nombreGrupo(per.grupoId), diasEn(p, mes, grupos).map(d => NOMBRES_DIA[d - 1]).join(' ')].filter(Boolean).join(' · ')
        : t('De baja o aún no incorporado en este mes');
      const matiz = matizEdad(p.anyNacimiento);
      return h('div', { class: 'card fila' + (per && matiz != null ? ' conedad' : ''), style: matiz != null ? `--h:${matiz}` : null },
        per ? chipEdad(p.anyNacimiento, true) : null,
        h('div', { class: 'grow' }, h('strong', {}, p.nombre), h('div', { class: 'sec' }, detalle)),
        per ? h('button', { class: 'btn', 'aria-label': t('Editar'), onclick: () => editar(p) }, '✏️')
            : h('button', { class: 'btn', onclick: () => volver(p) }, t('Reactivar')));
    };
    const filas = () => {
      const q = filtro.texto.toLowerCase();
      const visibles = parts
        .filter(p => estaActivo(p, mes) !== filtro.bajas)
        .filter(p => !q || p.nombre.toLowerCase().includes(q))
        .filter(p => filtro.bajas || !filtro.grupo || grupoEn(p, mes) === filtro.grupo)
        .sort(porEdadYNombre); // primero por edad y luego alfabético
      if (visibles.length) return visibles.map(fila);
      return [h('p', { class: 'vacio' }, filtro.bajas ? t('Nadie de baja en este mes.')
        : parts.length ? t('Nadie coincide con el filtro en este mes.') : t('Aún no hay participantes. Pulsa «Añadir».'))];
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
