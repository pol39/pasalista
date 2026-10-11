// LÓGICA DE ESTADÍSTICAS (sin pantallas, para poder probarla).
// REGLA: solo cuentan los días de entreno YA REALIZADOS (fecha <= hoy) en los que la persona tiene marca
// (lista pasada) y que no son días no lectivos. Los días previstos sin marca salen como "pendientes", pero no cuentan.
import { periodoEn, grupoEn, diasEn } from './periods.js';
import { especialEn, porcentaje } from './sessions.js';
import { diaSemana, mesDeFecha, mesSiguiente, sumarDias, hoyFecha } from '../utils/dates.js';

export const UMBRALES = { verde: 85, ambar: 70 }; // colores de los porcentajes (configurables en la Fase 3)
export const nivel = pct => (pct == null ? 'na' : pct >= UMBRALES.verde ? 'ok' : pct >= UMBRALES.ambar ? 'mid' : 'bad');

// Marcas de UN participante que cuentan. `suyas` = sus asistencias (cualquier fecha).
export function registrosDe(p, suyas, especiales, hoy = hoyFecha()) {
  return suyas
    .filter(a => a.estado && a.fecha <= hoy && !especialEn(a.fecha, grupoEn(p, mesDeFecha(a.fecha)), especiales))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

// Resumen de una lista de marcas. modo: 'excluye' | 'cuenta' (qué hacer con las ausencias justificadas).
export function conteo(regs, modo = 'excluye') {
  let presentes = 0, faltas = 0, justificadas = 0, retrasos = 0;
  for (const r of regs) {
    if (r.estado === 'presente') { presentes++; if (r.retraso) retrasos++; }
    else if (r.justificada) justificadas++;
    else faltas++;
  }
  const computables = presentes + faltas + (modo === 'cuenta' ? justificadas : 0);
  return { presentes, faltas, justificadas, retrasos, computables, pct: porcentaje(regs, modo) };
}

// Días de entreno previstos para esa persona (ya pasados, lectivos y dentro de sus meses de alta).
export function previstos(p, desde, hasta, grupos, especiales, hoy = hoyFecha()) {
  const fin = hasta < hoy ? hasta : hoy, salida = [];
  for (let f = desde; f <= fin; f = sumarDias(f, 1)) {
    const mes = mesDeFecha(f);
    if (!periodoEn(p, mes) || !diasEn(p, mes, grupos).includes(diaSemana(f))) continue;
    if (especialEn(f, grupoEn(p, mes), especiales)) continue;
    salida.push(f);
  }
  return salida;
}

export function porMes(regs) {
  const m = new Map();
  for (const r of regs) { const k = mesDeFecha(r.fecha); if (!m.has(k)) m.set(k, []); m.get(k).push(r); }
  return m;
}

// Rachas actuales (regs ordenadas de más antigua a más reciente).
export function rachas(regs) {
  let presencias = 0, faltas = 0;
  for (let i = regs.length - 1; i >= 0 && regs[i].estado === 'presente'; i--) presencias++;
  for (let i = regs.length - 1; i >= 0 && regs[i].estado === 'ausente'; i--) faltas++;
  return { presencias, faltas };
}

// Porcentaje de cada mes y general de una temporada (todos los participantes juntos, y por grupo).
export function estadisticasTemporada(temp, parts, grupos, asistencias, especiales, modo = 'excluye', hoy = hoyFecha()) {
  const porP = new Map();
  for (const a of asistencias) {
    if (!a.estado) continue;
    if (!porP.has(a.participanteId)) porP.set(a.participanteId, []);
    porP.get(a.participanteId).push(a);
  }
  const todos = [], meses = new Map();
  for (const p of parts) {
    const regs = registrosDe(p, porP.get(p.id) || [], especiales, hoy).filter(r => r.fecha >= temp.inicio && r.fecha <= temp.fin);
    for (const r of regs) {
      todos.push(r);
      const m = mesDeFecha(r.fecha);
      if (!meses.has(m)) meses.set(m, { regs: [], grupos: new Map() });
      const M = meses.get(m);
      M.regs.push(r);
      const g = grupoEn(p, m);
      if (g) { if (!M.grupos.has(g)) M.grupos.set(g, []); M.grupos.get(g).push(r); }
    }
  }
  const lista = [];
  for (let m = temp.inicio.slice(0, 7), i = 0; m <= temp.fin.slice(0, 7) && i < 36; m = mesSiguiente(m), i++) {
    const M = meses.get(m);
    const porGrupo = [...(M?.grupos || [])].map(([grupoId, rs]) => ({ grupoId, ...conteo(rs, modo) }))
      .sort((a, b) => grupos.findIndex(g => g.id === a.grupoId) - grupos.findIndex(g => g.id === b.grupoId));
    lista.push({ mes: m, conteo: conteo(M?.regs || [], modo), porGrupo });
  }
  return { total: conteo(todos, modo), meses: lista };
}
