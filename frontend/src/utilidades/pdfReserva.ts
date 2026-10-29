import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import type { Reserva } from '../servicios/contratos';
import { formatearFecha, formatearMonto, personasTexto } from './formato';

/**
 * Comprobante de reserva en PDF (mejora de la confirmación de CU-03).
 * Se genera en el navegador con pdf-lib: no carga el servidor ni guarda nada.
 * Reproduce el boleto de la interfaz: datos arriba y talón color sol con el
 * código de confirmación y el monto total.
 */

// Paleta de docs/CONVENCIONES.md (sección 8)
const C = {
  tinta: rgb(0x13 / 255, 0x30 / 255, 0x2b / 255),
  suave: rgb(0x4a / 255, 0x62 / 255, 0x5c / 255),
  linea: rgb(0xcd / 255, 0xdb / 255, 0xd6 / 255),
  caribe: rgb(0x0e / 255, 0x6b / 255, 0x61 / 255),
  sol: rgb(0xe8 / 255, 0xb3 / 255, 0x21 / 255),
  error: rgb(0xb3 / 255, 0x26 / 255, 0x1e / 255),
  blanco: rgb(1, 1, 1),
};

const ANCHO = 612; // carta: 8,5 × 11 pulgadas
const ALTO = 792;
const MARGEN = 56;

export interface OpcionesPdf {
  /** Dirección pública del sitio, para indicar dónde consultar la reserva. */
  urlSitio: string;
  /** Momento de generación (inyectable para pruebas). */
  ahora?: Date;
}

/** Las fuentes estándar del PDF usan WinAnsi: se reemplazan los espacios especiales de Intl. */
const ansi = (texto: string) => texto.replace(/[\u202f\u2009\u00a0]/g, ' ');

export async function crearPdfReserva(r: Reserva, opciones: OpcionesPdf): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Reserva ${r.codigo} · ViajaYa`);
  doc.setAuthor('ViajaYa');
  doc.setSubject('Comprobante de reserva');
  const pagina = doc.addPage([ANCHO, ALTO]);
  const normal = await doc.embedFont(StandardFonts.Helvetica);
  const negrita = await doc.embedFont(StandardFonts.HelveticaBold);

  const escribir = (
    texto: string,
    x: number,
    y: number,
    tam: number,
    fuente: PDFFont = normal,
    color = C.tinta,
  ) => pagina.drawText(ansi(texto), { x, y, size: tam, font: fuente, color });
  const aLaDerecha = (texto: string, xDerecho: number, y: number, tam: number, fuente: PDFFont = normal, color = C.tinta) =>
    escribir(texto, xDerecho - fuente.widthOfTextAtSize(ansi(texto), tam), y, tam, fuente, color);

  // ---------- Encabezado ----------
  let y = ALTO - MARGEN;
  escribir('ViajaYa', MARGEN, y - 20, 26, negrita);
  aLaDerecha('Comprobante de reserva', ANCHO - MARGEN, y - 14, 11, normal, C.suave);
  y -= 40;
  pagina.drawLine({ start: { x: MARGEN, y }, end: { x: ANCHO - MARGEN, y }, thickness: 1, color: C.linea });

  // ---------- Boleto ----------
  const xBoleto = MARGEN;
  const anchoBoleto = ANCHO - 2 * MARGEN;
  const altoTalon = 118;
  const filas: Array<[string, string, PDFFont?, ReturnType<typeof rgb>?]> = [
    ['Precio por persona', formatearMonto(r.precioBase)],
    [`Subtotal (${personasTexto(r.personas)})`, formatearMonto(r.subtotal)],
    [`IVA (${Math.round(r.tasaIva * 100)} %)`, formatearMonto(r.iva)],
    ['Estado de la reserva', r.estadoReserva, negrita],
    [
      `Pago${r.tarjetaUltimos4 ? ` (tarjeta terminada en ${r.tarjetaUltimos4})` : ''}`,
      r.estadoPago ?? 'Sin pago',
      negrita,
      r.estadoPago === 'Rechazado' ? C.error : C.tinta,
    ],
  ];
  const altoCuerpo = 110 + filas.length * 22 + 14;
  const yTopeBoleto = y - 28;
  const yBaseBoleto = yTopeBoleto - altoCuerpo - altoTalon;

  // Marco del boleto y talón color sol.
  pagina.drawRectangle({
    x: xBoleto,
    y: yBaseBoleto,
    width: anchoBoleto,
    height: altoCuerpo + altoTalon,
    color: C.blanco,
    borderColor: C.linea,
    borderWidth: 1,
  });
  pagina.drawRectangle({ x: xBoleto, y: yBaseBoleto, width: anchoBoleto, height: altoTalon, color: C.sol });
  dibujarTroquel(pagina, xBoleto, yBaseBoleto + altoTalon, anchoBoleto);

  // Cuerpo: destino, fecha y desglose (RN-03).
  const xIn = xBoleto + 24;
  const xDer = xBoleto + anchoBoleto - 24;
  let yc = yTopeBoleto - 40;
  escribir(r.destino.nombre, xIn, yc, 22, negrita);
  yc -= 22;
  const fecha = formatearFecha(r.fecha);
  escribir(fecha.charAt(0).toUpperCase() + fecha.slice(1), xIn, yc, 12, normal, C.suave);
  yc -= 36;
  filas.forEach(([etiqueta, valor, fuente = normal, color = C.tinta], i) => {
    if (i === 3) {
      pagina.drawLine({ start: { x: xIn, y: yc + 14 }, end: { x: xDer, y: yc + 14 }, thickness: 0.75, color: C.linea });
      yc -= 8;
    }
    escribir(etiqueta, xIn, yc, 12);
    aLaDerecha(valor, xDer, yc, 12, fuente, color);
    yc -= 22;
  });

  // Talón: código y monto total.
  let yt = yBaseBoleto + altoTalon - 32;
  escribir('Código de confirmación', xIn, yt, 10, negrita);
  yt -= 32;
  escribir(r.codigo, xIn, yt, 30, negrita);
  yt -= 34;
  escribir('Monto total', xIn, yt, 12, negrita);
  aLaDerecha(formatearMonto(r.montoTotal), xDer, yt - 2, 22, negrita);

  // ---------- Información para el turista ----------
  let yi = yBaseBoleto - 36;
  const notas = [
    `Titular: ${r.cliente.nombre}`,
    `Consulte, cambie la fecha o cancele en ${opciones.urlSitio}/mi-reserva con este código y su correo.`,
    'Los cambios de fecha y las cancelaciones solo se permiten hasta 48 horas antes de la excursión.',
    'Pago simulado: no se realizó ningún cobro real.',
  ];
  for (const nota of notas) {
    for (const linea of partirTexto(nota, normal, 11, anchoBoleto)) {
      escribir(linea, MARGEN, yi, 11, normal, C.suave);
      yi -= 16;
    }
    yi -= 4;
  }

  // ---------- Pie ----------
  const ahora = opciones.ahora ?? new Date();
  const generado = new Intl.DateTimeFormat('es-CR', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'America/Costa_Rica',
  }).format(ahora);
  pagina.drawLine({ start: { x: MARGEN, y: MARGEN + 18 }, end: { x: ANCHO - MARGEN, y: MARGEN + 18 }, thickness: 0.75, color: C.linea });
  escribir(`Generado el ${generado} (hora de Costa Rica)`, MARGEN, MARGEN, 9, normal, C.suave);
  aLaDerecha('ViajaYa · Sistema de Reservas Turísticas', ANCHO - MARGEN, MARGEN, 9, normal, C.suave);

  return doc.save();
}

/** Línea punteada y muescas semicirculares entre el cuerpo y el talón, como en la interfaz. */
function dibujarTroquel(pagina: PDFPage, x: number, y: number, ancho: number): void {
  pagina.drawLine({
    start: { x: x + 14, y },
    end: { x: x + ancho - 14, y },
    thickness: 1.5,
    color: C.tinta,
    opacity: 0.4,
    dashArray: [6, 4],
  });
  for (const cx of [x, x + ancho]) {
    pagina.drawCircle({ x: cx, y, size: 11, color: C.blanco, borderColor: C.linea, borderWidth: 1 });
  }
}

/** Corta un texto en líneas que caben en el ancho dado. */
function partirTexto(texto: string, fuente: PDFFont, tam: number, ancho: number): string[] {
  const lineas: string[] = [];
  let actual = '';
  for (const palabra of ansi(texto).split(' ')) {
    const prueba = actual ? `${actual} ${palabra}` : palabra;
    if (fuente.widthOfTextAtSize(prueba, tam) > ancho && actual) {
      lineas.push(actual);
      actual = palabra;
    } else {
      actual = prueba;
    }
  }
  if (actual) lineas.push(actual);
  return lineas;
}

/** Genera el PDF y lo descarga como "ViajaYa-VY-XXXXXX.pdf". */
export async function descargarPdfReserva(r: Reserva): Promise<void> {
  const bytes = await crearPdfReserva(r, { urlSitio: window.location.origin });
  const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }));
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = `ViajaYa-${r.codigo}.pdf`;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
