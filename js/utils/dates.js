// Utilidades de fechas. Los meses se escriben "AAAA-MM" (ej. "2025-09") y se pueden
// comparar como texto: "2025-09" < "2025-10".
import { idioma } from '../i18n.js';
const LOCALE = { es: 'es', ca: 'ca', en: 'en-GB' }; // formato de fechas de cada idioma
const formato = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

export const hoyMes = () => formato(new Date());

export function desplazarMes(mes, n) {
  const [a, m] = mes.split('-').map(Number);
  return formato(new Date(a, m - 1 + n, 1));
}
export const mesAnterior = mes => desplazarMes(mes, -1);
export const mesSiguiente = mes => desplazarMes(mes, 1);

export function nombreMes(mes) {
  const [a, m] = mes.split('-').map(Number);
  return new Date(a, m - 1, 1).toLocaleDateString(LOCALE[idioma()], { month: 'long', year: 'numeric' });
}

// Edad aproximada a partir del año de nacimiento (vacío si no se indicó).
export const edad = anyNac => (anyNac ? new Date().getFullYear() - anyNac : null);

// ---- Fechas completas "AAAA-MM-DD" (Fase 2) ----
const dosCifras = n => String(n).padStart(2, '0');
const aFecha = f => { const [a, m, d] = f.split('-').map(Number); return new Date(a, m - 1, d); };
const aTexto = d => `${formato(d)}-${dosCifras(d.getDate())}`;

export const hoyFecha = () => aTexto(new Date());
export const mesDeFecha = f => f.slice(0, 7);
export function sumarDias(f, n) { const d = aFecha(f); d.setDate(d.getDate() + n); return aTexto(d); }
export const diaSemana = f => aFecha(f).getDay() || 7; // 1 = lunes … 7 = domingo
export const fechaLarga = f => aFecha(f).toLocaleDateString(LOCALE[idioma()], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
export const fechaCorta = f => f.split('-').reverse().join('/'); // 2025-12-25 → 25/12/2025
export function diasDelMes(mes) {
  const [a, m] = mes.split('-').map(Number);
  return Array.from({ length: new Date(a, m, 0).getDate() }, (_, i) => `${mes}-${dosCifras(i + 1)}`);
}
