// Sincronización con la nube (Supabase). Es OPCIONAL: sin sesión iniciada la app funciona solo en local.
// Cómo funciona, sin jerga:
//  1. Todo se guarda siempre primero en este dispositivo (por eso funciona sin conexión).
//  2. Cada cambio se apunta en una "cola". Con conexión, la cola se sube a la nube.
//  3. Después se bajan los cambios hechos desde tus otros dispositivos y se aplican aquí.
//  4. Si dos dispositivos cambian lo mismo, gana el último cambio que llegó a la nube.
//  5. Un borrado se sube como "tumba" (borrado = true) para que se borre también en los demás.
import { SUPABASE_URL, SUPABASE_CLAVE } from './config.js';
import * as db from './storage.js';
import { pedir } from './utils/dom.js';
import { t } from './i18n.js';

export const eventos = new EventTarget(); // 'estado' (cambia la info de abajo) y 'datos' (llegaron cambios de la nube)
export const info = {
  configurado: !!(SUPABASE_URL && SUPABASE_CLAVE && globalThis.supabase),
  usuario: null,   // correo de la sesión iniciada
  fase: 'local',   // local | sincronizando | ok | sin-conexion | error
  ultima: null,    // última sincronización correcta
  pendientes: 0,   // cambios por subir
  error: null
};
const emitir = nombre => eventos.dispatchEvent(new Event(nombre));
const enLinea = () => navigator.onLine !== false;

let cliente, uid = null, listo = false, ocupado = false, repetir = false, canal = null, temporizador;

const iguales = (a, b) => {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || !a || !b) return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  return ka.length === kb.length && ka.every(k => iguales(a[k], b[k]));
};
const sinUndefined = x => JSON.parse(JSON.stringify(x));
const programar = ms => { clearTimeout(temporizador); temporizador = setTimeout(sincronizar, ms); };

// ---------- Cola de cambios pendientes ----------
async function aCola(tabla, clave, borrado) {
  await db.guardarLocal('cola', { id: `${tabla}|${clave}`, tabla, clave, borrado, t: Date.now() + Math.random() });
  info.pendientes = (await db.todos('cola')).length;
  emitir('estado');
}
db.enganche.alCambiar = (tabla, clave, borrado) => { if (uid) aCola(tabla, clave, borrado).then(() => programar(800)); };

// ---------- Subir y bajar ----------
async function empujar() {
  for (;;) {
    const cola = (await db.todos('cola')).slice(0, 200);
    if (!cola.length) return;
    const filas = [];
    for (const it of cola) {
      const doc = it.borrado ? null : await db.leer(it.tabla, it.clave);
      filas.push({ user_id: uid, tabla: it.tabla, clave: String(it.clave), datos: doc ? sinUndefined(doc) : null, borrado: !doc });
    }
    const { error } = await cliente.from('docs').upsert(filas, { onConflict: 'user_id,tabla,clave' });
    if (error) throw error;
    // Se quita de la cola solo lo que no cambió mientras subía.
    for (const it of cola) {
      const ahora = await db.leer('cola', it.id);
      if (ahora && ahora.t === it.t) await db.borrarLocal('cola', it.id);
    }
  }
}

async function traer() {
  const meta = (await db.leer('ajustes', '_sync')) || {};
  let cursor = meta.uid === uid ? meta.cursor : null;
  let cambios = false;
  for (;;) {
    let q = cliente.from('docs').select('tabla,clave,datos,borrado,actualizado').eq('user_id', uid).order('actualizado', { ascending: true }).limit(500);
    if (cursor) q = q.gt('actualizado', cursor);
    const { data, error } = await q;
    if (error) throw error;
    if (!data.length) break;
    const pendientes = new Set((await db.todos('cola')).map(x => x.id));
    for (const f of data) {
      if (!db.SINCRONIZADOS.includes(f.tabla)) continue;
      if (pendientes.has(`${f.tabla}|${f.clave}`)) continue; // hay un cambio local más reciente por subir
      const local = await db.leer(f.tabla, f.clave);
      if (f.borrado) { if (local) { await db.borrarLocal(f.tabla, f.clave); cambios = true; } }
      else if (!local || !iguales(sinUndefined(local), f.datos)) { await db.guardarLocal(f.tabla, f.datos); cambios = true; }
    }
    cursor = data.at(-1).actualizado;
    await db.guardarLocal('ajustes', { clave: '_sync', uid, cursor });
    if (data.length < 500) break;
  }
  return cambios;
}

export async function sincronizar() {
  if (!cliente || !uid || !listo) return;
  if (ocupado) { repetir = true; return; }
  if (!enLinea()) { info.fase = 'sin-conexion'; return emitir('estado'); }
  ocupado = true; info.fase = 'sincronizando'; info.error = null; emitir('estado');
  let cambios = false;
  try {
    await empujar();
    cambios = await traer();
    info.fase = 'ok'; info.ultima = new Date();
  } catch (e) {
    info.fase = enLinea() ? 'error' : 'sin-conexion';
    info.error = e?.message || String(e);
  } finally {
    ocupado = false;
    info.pendientes = (await db.todos('cola')).length;
    emitir('estado');
    if (cambios) emitir('datos');
    if (repetir) { repetir = false; programar(300); }
  }
}

// ---------- Primera vez que una cuenta se usa en este dispositivo ----------
async function prepararDispositivo() {
  const meta = await db.leer('ajustes', '_sync');
  if (meta?.uid === uid) return true; // este dispositivo ya está vinculado a esta cuenta
  const { count, error } = await cliente.from('docs').select('*', { count: 'exact', head: true }).eq('user_id', uid);
  if (error) throw error;
  let locales = 0;
  for (const s of db.SINCRONIZADOS) if (s !== 'ajustes') locales += (await db.todos(s)).length;
  let modo = 'combinar';
  if (count > 0 && locales > 0) {
    const r = await pedir({
      titulo: 'Datos en este dispositivo y en la nube',
      ayuda: t('Hay {n} registros en tu cuenta y {m} en este dispositivo. Si combinas, se juntan (puede haber grupos o participantes repetidos que tendrás que borrar).', { n: count, m: locales }),
      campos: [{ n: 'modo', et: '¿Qué quieres hacer?', tipo: 'select', opciones: [
        { v: 'combinar', t: t('Combinar los dos') },
        { v: 'nube', t: t('Usar solo los de la nube (se borran los de este dispositivo)') }] }],
      valores: { modo: 'combinar' }
    });
    if (!r) return false;
    modo = r.modo;
  }
  if (modo === 'nube') {
    for (const s of [...db.SINCRONIZADOS, 'cola']) await db.vaciar(s);
  } else {
    for (const s of db.SINCRONIZADOS) {
      for (const o of await db.todos(s)) {
        const clave = db.claveDe(s, o);
        if (!String(clave).startsWith('_')) await db.guardarLocal('cola', { id: `${s}|${clave}`, tabla: s, clave, borrado: false, t: Date.now() + Math.random() });
      }
    }
  }
  await db.guardarLocal('ajustes', { clave: '_sync', uid, cursor: null });
  return true;
}

// ---------- Sesión ----------
const traducir = e => {
  const m = e?.message || String(e);
  if (/Invalid login/i.test(m)) return t('Correo o contraseña incorrectos.');
  if (/already registered/i.test(m)) return t('Ese correo ya tiene cuenta. Pulsa «Entrar».');
  if (/at least 6/i.test(m)) return t('La contraseña debe tener al menos 6 caracteres.');
  if (/rate limit/i.test(m)) return t('Demasiados intentos. Espera un rato y vuelve a probar.');
  if (/fetch|network/i.test(m)) return t('No hay conexión. Inténtalo cuando tengas internet.');
  return m;
};
const fallar = e => { throw new Error(traducir(e)); };

export async function entrar(email, clave) {
  const { error } = await cliente.auth.signInWithPassword({ email, password: clave });
  if (error) fallar(error);
}
export async function registrar(email, clave) {
  const { data, error } = await cliente.auth.signUp({ email, password: clave });
  if (error) fallar(error);
  if (!data.session) throw new Error(t('Cuenta creada. Revisa tu correo para confirmarla y luego pulsa «Entrar».'));
}
export async function recuperar(email) {
  const { error } = await cliente.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
  if (error) fallar(error);
  return t('Te hemos enviado un correo para cambiar la contraseña.');
}
export async function salir(borrarDatosLocales) {
  await cliente.auth.signOut();
  await cambioSesion('SIGNED_OUT', null);
  if (borrarDatosLocales) {
    for (const s of [...db.SINCRONIZADOS, 'cola']) await db.vaciar(s);
    emitir('datos');
  }
}

async function nuevaClave() {
  const r = await pedir({ titulo: 'Nueva contraseña', campos: [{ n: 'clave', et: 'Nueva contraseña (mínimo 6 caracteres)', tipo: 'password', req: true }] });
  if (!r) return;
  const { error } = await cliente.auth.updateUser({ password: r.clave });
  alert(error ? traducir(error) : t('Contraseña cambiada.'));
}

function detener() { if (canal) { cliente.removeChannel(canal); canal = null; } }
function suscribir() {
  // Aviso en directo: cuando otro dispositivo cambia algo, se sincroniza enseguida.
  canal = cliente.channel('docs-' + uid)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'docs', filter: `user_id=eq.${uid}` }, () => programar(300))
    .subscribe();
}

async function cambioSesion(evento, sesion) {
  if (evento === 'PASSWORD_RECOVERY') await nuevaClave();
  const id = sesion?.user?.id ?? null;
  if (id === uid) return;
  detener(); listo = false; uid = id;
  info.usuario = sesion?.user?.email ?? null; info.error = null; info.pendientes = 0;
  if (!uid) { info.fase = 'local'; return emitir('estado'); }
  info.fase = 'sincronizando'; emitir('estado');
  try {
    if (!(await prepararDispositivo())) { await cliente.auth.signOut(); return cambioSesion('SIGNED_OUT', null); }
    listo = true; suscribir(); await sincronizar();
  } catch (e) {
    info.fase = enLinea() ? 'error' : 'sin-conexion'; info.error = e?.message || String(e); emitir('estado');
  }
}

export async function iniciar() {
  if (!info.configurado) return;
  cliente = globalThis.supabase.createClient(SUPABASE_URL, SUPABASE_CLAVE, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'pasalista-sesion' }
  });
  // (Dentro de este aviso no se llama a Supabase directamente: se hace en el siguiente turno.)
  cliente.auth.onAuthStateChange((evento, sesion) => { setTimeout(() => cambioSesion(evento, sesion), 0); });
  addEventListener('online', () => programar(200));
  addEventListener('offline', () => { if (uid) { info.fase = 'sin-conexion'; emitir('estado'); } });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) programar(200); });
  setInterval(() => programar(0), 60000); // por si algún aviso en directo se perdiera
  const { data } = await cliente.auth.getSession();
  await cambioSesion('INICIO', data.session);
}
