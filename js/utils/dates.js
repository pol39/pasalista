// Utilidades de fechas. Los meses se escriben "AAAA-MM" (ej. "2025-09") y se pueden
// comparar como texto: "2025-09" < "2025-10".
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
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
  return `${MESES[m - 1]} ${a}`;
}

// Edad aproximada a partir del año de nacimiento (vacío si no se indicó).
export const edad = anyNac => (anyNac ? new Date().getFullYear() - anyNac : null);
