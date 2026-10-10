// Arranque de la app: tema, rutas, estado, sincronización y service worker.
import { aplicarTema, alternarTema } from './theme.js';
import { registrar, iniciar } from './router.js';
import { cargarEstado } from './state.js';
import { pedirPersistencia } from './storage.js';
import { info, eventos, iniciar as iniciarSync } from './sync.js';
import * as hoy from './views/hoy.js';
import * as calendario from './views/calendario.js';
import * as participantes from './views/participantes.js';
import * as grupos from './views/grupos.js';
import * as mas from './views/mas.js';
import * as especiales from './views/especiales.js';
import * as temporadas from './views/temporadas.js';
import * as ajustes from './views/ajustes.js';

aplicarTema();
document.getElementById('tema').onclick = e => { alternarTema(); e.currentTarget.classList.toggle('giro'); };

// Icono de la nube en la cabecera: muestra si estás sincronizado y lleva a Ajustes.
const nube = document.getElementById('nube');
const pintarNube = () => {
  const fase = info.usuario ? info.fase : 'local';
  nube.hidden = !info.configurado;
  nube.className = 'btn nube ' + fase;
  nube.textContent = { sincronizando: '🔄', 'sin-conexion': '📴', error: '⚠️' }[fase] || '☁️';
  nube.title = { local: 'Iniciar sesión para sincronizar', sincronizando: 'Sincronizando…', ok: 'Sincronizado', 'sin-conexion': 'Sin conexión', error: 'Error de sincronización' }[fase];
};
nube.onclick = () => { location.hash = '#/ajustes'; };
eventos.addEventListener('estado', pintarNube);
pintarNube();

// El orden de aquí es el orden del menú.
registrar('hoy', { icono: '✅', titulo: 'Hoy', vista: hoy.vista });
registrar('calendario', { icono: '🗓️', titulo: 'Calendario', vista: calendario.vista });
registrar('participantes', { icono: '👥', titulo: 'Participantes', vista: participantes.vista });
registrar('grupos', { icono: '🏊', titulo: 'Grupos', vista: grupos.vista });
registrar('mas', { icono: '☰', titulo: 'Más', vista: mas.vista, soloMovil: true });
registrar('especiales', { icono: '🚫', titulo: 'Días especiales', vista: especiales.vista, secundaria: true });
registrar('temporadas', { icono: '📅', titulo: 'Temporadas', vista: temporadas.vista, secundaria: true });
registrar('ajustes', { icono: '⚙️', titulo: 'Ajustes', vista: ajustes.vista, secundaria: true });

try {
  await cargarEstado();
  pedirPersistencia();
  iniciar(document.getElementById('main'), document.getElementById('nav'));
  iniciarSync(); // sin await: no debe retrasar el arranque si no hay internet
} catch (e) {
  document.getElementById('main').textContent = 'No se pudo abrir el almacenamiento del navegador: ' + e.message;
}

if ('serviceWorker' in navigator) navigator.serviceWorker.register('service-worker.js');
