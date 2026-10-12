// Orden de las listas de participantes: primero por edad, de MAYOR a menor (de arriba abajo), y luego alfabético.
// Sin año de nacimiento → al final. Para ordenar de menor a mayor edad, invierte la resta (ea - eb).
import { edad } from './dates.js';

export function porEdadYNombre(a, b) {
  const ea = edad(a.anyNacimiento), eb = edad(b.anyNacimiento);
  if (ea == null && eb != null) return 1;
  if (eb == null && ea != null) return -1;
  return (eb ?? 0) - (ea ?? 0) || a.nombre.localeCompare(b.nombre, 'es');
}

// Color (matiz 0-359) propio de cada edad. Edades seguidas se separan 47° para que se distingan bien.
export const matizEdad = anyNac => { const e = edad(anyNac); return e == null ? null : (e * 47) % 360; };
