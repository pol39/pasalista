// Capa de almacenamiento (IndexedDB). El resto de la app solo usa estas funciones
// y nunca toca IndexedDB directamente.
// Cada "cajón" (store) guarda objetos que se identifican por `id` (los ajustes, por `clave`).
const CAJONES = {
  temporadas: 'id', grupos: 'id', participantes: 'id',
  asistencias: 'id', diasEspeciales: 'id', sesiones: 'id', ajustes: 'clave'
};

let conexion;
const abrir = () => conexion ??= new Promise((ok, ko) => {
  const rq = indexedDB.open('pasalista', 1);
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
export const guardar = (cajon, objeto) => operar(cajon, 'readwrite', o => o.put(objeto));
export const borrar = (cajon, id) => operar(cajon, 'readwrite', o => o.delete(id));
export const nuevoId = () => crypto.randomUUID();
// Pide al navegador que no borre los datos si falta espacio.
export const pedirPersistencia = () => navigator.storage?.persist?.();
