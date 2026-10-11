// Foto del participante: se recorta en cuadrado y se reduce (320 px, JPEG) para que ocupe poco
// (unos 20-40 KB) y se sincronice rápido.
export function fotoDesde(archivo, lado = 320) {
  return new Promise((ok, ko) => {
    const url = URL.createObjectURL(archivo), img = new Image();
    img.onload = () => {
      const l = Math.min(img.width, img.height), c = document.createElement('canvas');
      c.width = c.height = lado;
      c.getContext('2d').drawImage(img, (img.width - l) / 2, (img.height - l) / 2, l, l, 0, 0, lado, lado);
      URL.revokeObjectURL(url);
      ok(c.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => { URL.revokeObjectURL(url); ko(new Error('No se pudo leer la imagen.')); };
    img.src = url;
  });
}
