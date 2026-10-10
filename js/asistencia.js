// Guardar una marca de asistencia. `reg` es un Map en memoria (clave "participanteId|fecha")
// que se actualiza al instante; la base de datos se guarda a continuación.
// Sin marca = sin registro. Si no queda ni estado ni comentario, el registro se borra.
import { guardar, borrar } from './storage.js';

export function ponerAsistencia(reg, participanteId, fecha, cambios) {
  const id = `${participanteId}|${fecha}`;
  const base = reg.get(id) || { id, participanteId, fecha, estado: null, justificada: false, retraso: false, comentario: '' };
  const n = { ...base, ...cambios };
  if (!n.estado && !n.comentario) { reg.delete(id); return borrar('asistencias', id); }
  reg.set(id, n);
  return guardar('asistencias', n);
}
