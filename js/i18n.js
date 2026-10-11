// Idiomas: castellano (es), català (ca) y English (en).
// La "clave" de cada texto es el propio texto en castellano: t('Guardar').
// Las traducciones están en js/textos.js:  'Guardar': ['Desa', 'Save']  →  [catalán, inglés].
// Con variables: t('{n} marcados', { n: 3 }). Si falta una traducción, se muestra el castellano.
import { TEXTOS } from './textos.js';

export const IDIOMAS = { es: 'Castellano', ca: 'Català', en: 'English' };
const CLAVE = 'pasalista-idioma';
const detectar = () => { const l = (navigator.language || 'es').slice(0, 2); return IDIOMAS[l] ? l : 'es'; };

let actual = localStorage.getItem(CLAVE);
if (!IDIOMAS[actual]) actual = detectar();
if (typeof document !== 'undefined') document.documentElement.lang = actual;

export const eventosIdioma = new EventTarget(); // avisa cuando se cambia de idioma
export const idioma = () => actual;
export function setIdioma(x) {
  if (!IDIOMAS[x]) return;
  actual = x; localStorage.setItem(CLAVE, x); document.documentElement.lang = x;
  eventosIdioma.dispatchEvent(new Event('cambio'));
}

export function t(texto, vars) {
  const i = actual === 'ca' ? 0 : actual === 'en' ? 1 : -1;
  let s = (i >= 0 && TEXTOS[texto]?.[i]) || texto;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
  return s;
}

// Nombres de los días de la semana (1 = lunes … 7 = domingo)
const CORTOS = { es: ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'], ca: ['Dl', 'Dt', 'Dc', 'Dj', 'Dv', 'Ds', 'Dg'], en: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] };
const LETRAS = { es: ['L', 'M', 'X', 'J', 'V', 'S', 'D'], ca: ['Dl', 'Dt', 'Dc', 'Dj', 'Dv', 'Ds', 'Dg'], en: ['M', 'T', 'W', 'T', 'F', 'S', 'S'] };
export const diasCortos = () => CORTOS[actual];
export const diasLetras = () => LETRAS[actual];
