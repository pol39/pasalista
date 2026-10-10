// Estado compartido entre pantallas: mes que se está mirando y temporada activa.
import { leer, guardar } from './storage.js';
import { hoyMes } from './utils/dates.js';

export const estado = { mes: hoyMes(), temporadaId: null };

export async function cargarEstado() {
  estado.temporadaId = (await leer('ajustes', 'temporadaActiva'))?.valor ?? null;
}

export async function fijarTemporada(id) {
  estado.temporadaId = id;
  await guardar('ajustes', { clave: 'temporadaActiva', valor: id });
}
