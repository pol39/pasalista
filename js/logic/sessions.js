// LÓGICA DE SESIONES Y PORCENTAJES (sin pantallas, para poder probarla).
// Estado de una marca: 'presente' | 'ausente' | null (sin marcar: nunca se asume nada).
import { grupoEn, diasEn } from './periods.js';
import { diaSemana, mesDeFecha, hoyFecha } from '../utils/dates.js';

const porNombre = (a, b) => a.nombre.localeCompare(b.nombre, 'es');

// ¿Es día no lectivo para ese grupo? (grupoId null = afecta a todos los grupos)
export const especialEn = (fecha, grupoId, especiales) =>
  especiales.find(e => e.fecha === fecha && (e.grupoId == null || e.grupoId === grupoId)) || null;

// Quién debe venir ese día: activos ese mes, en ese grupo y con ese día de la semana,
// más los participantes extra añadidos a la sesión (recuperaciones).
export function listaDelDia(fecha, grupo, parts, grupos, sesion) {
  const mes = mesDeFecha(fecha), dia = diaSemana(fecha), extra = sesion?.extras || [];
  const normales = parts.filter(p => grupoEn(p, mes) === grupo.id && diasEn(p, mes, grupos).includes(dia)).sort(porNombre);
  const extras = parts.filter(p => extra.includes(p.id) && !normales.includes(p)).sort(porNombre);
  return [...normales, ...extras];
}

// Estado de un día para el calendario. ctx = { parts, grupos, especiales, sesiones, reg }
export function estadoDia(fecha, grupo, ctx) {
  if (especialEn(fecha, grupo.id, ctx.especiales)) return { tipo: 'nolectivo' };
  const lista = listaDelDia(fecha, grupo, ctx.parts, ctx.grupos, ctx.sesiones.find(s => s.id === `${fecha}|${grupo.id}`));
  if (!lista.length) return { tipo: 'sinentreno' };
  const marcados = lista.filter(p => ctx.reg.get(`${p.id}|${fecha}`)?.estado).length;
  const tipo = marcados === lista.length ? 'completa' : marcados > 0 ? 'parcial' : fecha > hoyFecha() ? 'futuro' : 'pendiente';
  return { tipo, total: lista.length, marcados };
}

// % de asistencia = presentes / sesiones computables. Lo sin marcar NO cuenta.
// justificado: 'excluye' (la ausencia justificada se saca del cálculo) o 'cuenta' (cuenta como asistencia).
// Devuelve null si no hay ninguna sesión computable.
export function porcentaje(registros, justificado = 'excluye') {
  let presentes = 0, computables = 0;
  for (const r of registros) {
    if (!r?.estado) continue;
    if (r.estado === 'presente') { presentes++; computables++; }
    else if (r.justificada) { if (justificado === 'cuenta') { presentes++; computables++; } }
    else computables++;
  }
  return computables ? Math.round(100 * presentes / computables) : null;
}
