// Tema claro/oscuro. Por defecto sigue al sistema. Se guarda en localStorage
// (es un dato mínimo que hace falta antes de que cargue la base de datos).
const CLAVE = 'pasalista-tema';
export const temaGuardado = () => localStorage.getItem(CLAVE) || 'sistema';

export function aplicarTema(modo = temaGuardado()) {
  localStorage.setItem(CLAVE, modo);
  const oscuro = modo === 'oscuro' || (modo === 'sistema' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.tema = oscuro ? 'oscuro' : 'claro';
}

// Botón de la cabecera: alterna entre claro y oscuro.
export const alternarTema = () =>
  aplicarTema(document.documentElement.dataset.tema === 'oscuro' ? 'claro' : 'oscuro');

// Si está en "sistema" y el sistema cambia, seguimos el cambio.
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (temaGuardado() === 'sistema') aplicarTema('sistema');
});
