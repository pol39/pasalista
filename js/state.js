// Estado compartido entre pantallas: mes y día que se están mirando, grupo elegido y temporada activa.
import { leer, guardar } from './storage.js';
import { hoyMes, hoyFecha } from './utils/dates.js';

export const estado = { mes: hoyMes(), fecha: hoyFecha(), grupoId: null, temporadaId: null };

export async function cargarEstado() {
  estado.temporadaId = (await leer('ajustes', 'temporadaActiva'))?.valor ?? null;
}

export async function fijarTemporada(id) {
  estado.temporadaId = id;
  await guardar('ajustes', { clave: 'temporadaActiva', valor: id });
}
