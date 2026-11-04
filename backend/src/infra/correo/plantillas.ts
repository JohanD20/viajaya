import type { FechaISO, ReservaDetalle } from '../../models/dominio';
import { EstadoPago, NOMBRE_ESTADO_PAGO, NOMBRE_ESTADO_RESERVA } from '../../models/estados';
import type { EventoReserva, NotificacionReserva } from '../../ports/servicios-externos';

/** Un correo listo para entregarlo a un proveedor. */
export interface CorreoSaliente {
  para: { correo: string; nombre: string };
  asunto: string;
  html: string;
  /** Versión en texto plano para clientes que no muestran HTML. */
  texto: string;
}

const MONEDA = new Intl.NumberFormat('es-CR', {
  style: 'currency',
  currency: 'USD',
  currencyDisplay: 'narrowSymbol',
});
const FECHA = new Intl.DateTimeFormat('es-CR', { dateStyle: 'full', timeZone: 'UTC' });

const monto = (centimos: number) => MONEDA.format(centimos / 100).replace(/\u00a0/g, ' ');
const fecha = (f: FechaISO) => FECHA.format(new Date(`${f}T00:00:00Z`));

/** Todo dato del turista se escapa antes de entrar al HTML (S-03). */
export function escaparHtml(texto: string): string {
  const reemplazos: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return texto.replace(/[&<>"']/g, (c) => reemplazos[c] ?? c);
}

interface Contenido {
  asunto: string;
  titulo: string;
  parrafos: string[];
}

function contenido(evento: EventoReserva, r: ReservaDetalle, fechaAnterior?: FechaISO): Contenido {
  const codigo = r.codigoConfirmacion;
  const destino = r.destino.nombre;
  switch (evento) {
    case 'CREADA':
      return {
        asunto: `Reserva ${codigo} registrada · ViajaYa`,
        titulo: 'Su reserva está registrada',
        parrafos: [
          `Recibimos su reserva para ${destino} el ${fecha(r.fechaViaje)}.`,
          r.estadoPagoId === EstadoPago.Rechazado
            ? `El pago con la tarjeta terminada en ${r.tarjetaUltimos4 ?? '----'} fue rechazado. La reserva quedó registrada y la agencia decidirá si la mantiene o la cancela.`
            : 'El pago quedó aprobado. La agencia revisará la reserva y le avisaremos cuando la apruebe.',
        ],
      };
    case 'FECHA_CAMBIADA':
      return {
        asunto: `Nueva fecha para su reserva ${codigo} · ViajaYa`,
        titulo: 'Cambiamos la fecha de su excursión',
        parrafos: [
          `Su excursión a ${destino} pasó ${fechaAnterior ? `del ${fecha(fechaAnterior)} ` : ''}al ${fecha(r.fechaViaje)}.`,
          'El monto pagado se mantiene.',
        ],
      };
    case 'CANCELADA_POR_TURISTA':
      return {
        asunto: `Reserva ${codigo} cancelada · ViajaYa`,
        titulo: 'Su reserva fue cancelada',
        parrafos: [`Cancelamos su reserva para ${destino} el ${fecha(r.fechaViaje)}, como lo solicitó.`],
      };
    case 'CANCELADA_POR_AGENCIA':
      return {
        asunto: `Reserva ${codigo} cancelada por la agencia · ViajaYa`,
        titulo: 'La agencia canceló su reserva',
        parrafos: [
          `La agencia canceló su reserva para ${destino} el ${fecha(r.fechaViaje)}.`,
          'Si tiene dudas, comuníquese con la agencia.',
        ],
      };
    case 'APROBADA':
      return {
        asunto: `Reserva ${codigo} aprobada · ViajaYa`,
        titulo: '¡Todo listo! Su reserva fue aprobada',
        parrafos: [`La agencia aprobó su reserva para ${destino} el ${fecha(r.fechaViaje)}. ¡Buen viaje!`],
      };
  }
}

/** Arma el correo de un aviso. Función pura: se prueba sin red. */
export function componerCorreo(n: NotificacionReserva, sitioUrl: string): CorreoSaliente {
  const r = n.reserva;
  const c = contenido(n.evento, r, n.fechaAnterior);
  const sitio = sitioUrl.replace(/\/+$/, '');
  const enlace = `${sitio}/mi-reserva`;
  // Logo en PNG servido por el sitio (Gmail y Outlook no muestran SVG).
  const logo = `${sitio}/logo-correo.png`;
  const filas: Array<[string, string]> = [
    ['Código', r.codigoConfirmacion],
    ['Destino', r.destino.nombre],
    ['Fecha', fecha(r.fechaViaje)],
    ['Personas', String(r.cantidadPersonas)],
    ['Subtotal', monto(r.subtotalCentimos)],
    [`IVA (${r.tasaIvaPorcentaje} %)`, monto(r.ivaCentimos)],
    ['Monto total', monto(r.totalCentimos)],
    ['Estado de la reserva', NOMBRE_ESTADO_RESERVA[r.estadoReservaId]],
    ['Pago', r.estadoPagoId ? NOMBRE_ESTADO_PAGO[r.estadoPagoId] : 'Sin pago'],
  ];
  const nota =
    'Este correo se envió automáticamente porque esta dirección se usó en una reserva de ViajaYa. ' +
    'Pago simulado: no se realizó ningún cobro real.';

  const texto = [
    `Hola ${r.cliente.nombre}:`,
    '',
    c.titulo,
    ...c.parrafos,
    '',
    ...filas.map(([etiqueta, valor]) => `${etiqueta}: ${valor}`),
    '',
    `Consulte su reserva con el código y este correo en ${enlace}`,
    '',
    nota,
  ].join('\n');

  const e = escaparHtml;
  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>${e(c.asunto)}</title></head>
<body style="margin:0;padding:24px;background:#f1f5f3;font-family:Arial,Helvetica,sans-serif;color:#13302b">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #cddbd6">
<tr><td style="padding:22px 28px 10px;border-bottom:4px solid #0e6b61">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="padding-right:10px"><img src="${e(logo)}" width="32" height="37" alt="" style="display:block;border:0"></td>
<td style="font-size:26px;font-weight:bold;color:#13302b">Viaja<span style="color:#0e6b61">Ya</span></td>
</tr></table>
</td></tr>
<tr><td style="padding:8px 28px">
<p style="margin:0 0 12px">Hola ${e(r.cliente.nombre)}:</p>
<h1 style="margin:0 0 12px;font-size:20px">${e(c.titulo)}</h1>
${c.parrafos.map((p) => `<p style="margin:0 0 12px;color:#4a625c">${e(p)}</p>`).join('\n')}
</td></tr>
<tr><td style="padding:8px 28px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #cddbd6">
${filas
  .map(
    ([etiqueta, valor], i) =>
      `<tr><td style="padding:8px 0;border-bottom:1px solid #cddbd6">${e(etiqueta)}</td><td align="right" style="padding:8px 0;border-bottom:1px solid #cddbd6;font-weight:bold${i === 0 ? ';font-size:18px' : ''}">${e(valor)}</td></tr>`,
  )
  .join('\n')}
</table>
</td></tr>
<tr><td style="padding:20px 28px">
<a href="${e(enlace)}" style="display:inline-block;background:#0e6b61;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 20px">Ver mi reserva</a>
</td></tr>
<tr><td style="padding:14px 28px 18px;font-size:12px;color:#d7e3df;background:#13302b">${e(nota)}<br><span style="color:#ffffff">© 2026 ViajaYa · Universidad de Costa Rica</span></td></tr>
</table>
</body></html>`;

  return { para: { correo: r.cliente.correo, nombre: r.cliente.nombre }, asunto: c.asunto, html, texto };
}
