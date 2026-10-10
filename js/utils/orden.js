// Orden de las listas de participantes: primero por edad (de menor a mayor) y luego alfabético.
// Sin año de nacimiento → al final. Para ordenar de mayor a menor edad, invierte la resta (eb - ea).
import { edad } from './dates.js';

export function porEdadYNombre(a, b) {
  const ea = edad(a.anyNacimiento), eb = edad(b.anyNacimiento);
  if (ea == null && eb != null) return 1;
  if (eb == null && ea != null) return -1;
  return (ea ?? 0) - (eb ?? 0) || a.nombre.localeCompare(b.nombre, 'es');
}

// Color (matiz 0-359) propio de cada edad. Edades seguidas se separan 47° para que se distingan bien.
export const matizEdad = anyNac => { const e = edad(anyNac); return e == null ? null : (e * 47) % 360; };
