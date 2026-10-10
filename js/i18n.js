// Textos de la app. La "clave" es el propio texto en castellano: t('Guardar') devuelve 'Guardar'.
// Para añadir catalán: rellena `ca` con { 'Guardar': 'Desa', ... } y pon idioma = 'ca'.
const idioma = 'es';
const ca = {};
export const t = txt => (idioma === 'ca' && ca[txt]) || txt;
