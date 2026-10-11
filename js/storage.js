// Capa de almacenamiento (IndexedDB). El resto de la app solo usa estas funciones
// y nunca toca IndexedDB directamente. Cada "cajón" guarda objetos con un identificador
// (`id`; en los ajustes, `clave`). Todo se guarda primero AQUÍ, en el dispositivo.
// Si hay sesión iniciada, sync.js sube los cambios a la nube (ver js/sync.js).
const CAJONES = {
  temporadas: 'id', grupos: 'id', participantes: 'id',
  asistencias: 'id', diasEspeciales: 'id', sesiones: 'id', ajustes: 'clave', fotos: 'id',
  cola: 'id' // cambios pendientes de subir a la nube (solo local)
};

// Cajones que se sincronizan. Los ajustes cuya clave empieza por "_" son solo de este dispositivo.
export const SINCRONIZADOS = ['temporadas', 'grupos', 'participantes', 'asistencias', 'diasEspeciales', 'sesiones', 'ajustes', 'fotos'];
export const claveDe = (cajon, objeto) => objeto[CAJONES[cajon]];

// sync.js se engancha aquí para enterarse de cada cambio hecho en este dispositivo.
export const enganche = { alCambiar: null };
const avisar = (cajon, clave, borrado) => {
  if (SINCRONIZADOS.includes(cajon) && !String(clave).startsWith('_')) enganche.alCambiar?.(cajon, clave, borrado);
};

let conexion;
const abrir = () => conexion ??= new Promise((ok, ko) => {
  const rq = indexedDB.open(globalThis.PASALISTA_DB || 'pasalista', 3);
  rq.onupgradeneeded = () => {
    for (const [nombre, clave] of Object.entries(CAJONES)) {
      if (!rq.result.objectStoreNames.contains(nombre)) rq.result.createObjectStore(nombre, { keyPath: clave });
    }
  };
  rq.onsuccess = () => ok(rq.result);
  rq.onerror = () => ko(rq.error);
});

async function operar(cajon, modo, fn) {
  const db = await abrir();
  return new Promise((ok, ko) => {
    const tx = db.transaction(cajon, modo);
    const rq = fn(tx.objectStore(cajon));
    tx.oncomplete = () => ok(rq?.result);
    tx.onerror = () => ko(tx.error);
  });
}

export const todos = cajon => operar(cajon, 'readonly', o => o.getAll());
export const leer = (cajon, id) => operar(cajon, 'readonly', o => o.get(id));

// Versiones "locales": guardan sin avisar a la sincronización (las usa sync.js al aplicar cambios de la nube).
export const guardarLocal = (cajon, objeto) => operar(cajon, 'readwrite', o => o.put(objeto));
export const borrarLocal = (cajon, id) => operar(cajon, 'readwrite', o => o.delete(id));
export const vaciar = cajon => operar(cajon, 'readwrite', o => o.clear());

// Las que usa el resto de la app: guardan y avisan a la sincronización.
export async function guardar(cajon, objeto) { await guardarLocal(cajon, objeto); avisar(cajon, claveDe(cajon, objeto), false); }
export async function borrar(cajon, id) { await borrarLocal(cajon, id); avisar(cajon, id, true); }

export const nuevoId = () => crypto.randomUUID();
// Pide al navegador que no borre los datos si falta espacio.
export const pedirPersistencia = () => navigator.storage?.persist?.();
