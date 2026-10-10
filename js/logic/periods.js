// LÓGICA DE ALTAS Y BAJAS POR MESES (sin pantallas, para poder probarla).
// Cada participante tiene una lista de "períodos":
//   { desde: '2025-10', hasta: null | '2025-11', grupoId, dias: null | [1..7] }
// - hasta = null → sigue de alta. Un mes está "activo" si cae dentro de algún período.
// - dias = null → usa los días de su grupo; si es una lista, son días personalizados.
// Nada se borra nunca: dar de baja solo cierra el período. Las funciones devuelven una COPIA.
import { mesAnterior } from '../utils/dates.js';

export const periodoEn = (p, mes) =>
  (p.periodos || []).find(x => x.desde <= mes && (x.hasta == null || mes <= x.hasta)) || null;
export const estaActivo = (p, mes) => !!periodoEn(p, mes);
export const grupoEn = (p, mes) => periodoEn(p, mes)?.grupoId ?? null;

// Días de la semana (1 = lunes … 7 = domingo) en que debe venir ese mes.
// Días del grupo en un mes. Si el grupo tiene historial de cambios (diasHist), se usa el vigente ese mes.
export function diasGrupo(g, mes) {
  const x = (g.diasHist || []).filter(d => d.desde <= mes).at(-1);
  return x ? x.dias : g.dias;
}

export function diasEn(p, mes, grupos) {
  const x = periodoEn(p, mes);
  if (!x) return [];
  const g = grupos.find(g => g.id === x.grupoId);
  return x.dias || (g ? diasGrupo(g, mes) : []);
}

export const nuevoParticipante = ({ id, nombre, anyNacimiento, notas, grupoId, mes }, dias = null) => ({
  id, nombre, anyNacimiento: anyNacimiento ?? null, notas: notas || '',
  periodos: [{ desde: mes, hasta: null, grupoId, dias }]
});

// Baja desde `mes` (incluido): el último mes activo pasa a ser el anterior.
export function darDeBaja(p, mes) {
  const c = structuredClone(p);
  c.periodos = c.periodos.filter(x => x.desde < mes); // descarta lo que empezaba ese mes o después
  c.periodos.forEach(x => { if (x.hasta == null || x.hasta >= mes) x.hasta = mesAnterior(mes); });
  return c;
}

// Vuelve a dar de alta desde `mes`, añadiendo un período nuevo (el historial anterior no se toca).
export function reactivar(p, mes, grupoId, dias = null) {
  const c = structuredClone(p);
  if (c.periodos.some(x => x.hasta == null || x.hasta >= mes)) throw new Error('Ya está de alta en ese mes o en uno posterior.');
  c.periodos.push({ desde: mes, hasta: null, grupoId, dias });
  return c;
}

// Cambia de grupo (o de días) desde `mes`: cierra el período en el mes anterior y abre otro.
// Así los meses pasados conservan su grupo y sus días.
export function cambiarGrupo(p, mes, grupoId, dias = null) {
  const c = structuredClone(p);
  const x = periodoEn(c, mes);
  if (!x) throw new Error('No está de alta en ese mes.');
  if (x.desde === mes) { x.grupoId = grupoId; x.dias = dias; return c; }
  const finOriginal = x.hasta;
  x.hasta = mesAnterior(mes);
  c.periodos.push({ desde: mes, hasta: finOriginal, grupoId, dias });
  return c;
}
