import type { Destino, DestinoAdmin, ReservaDetalle } from '../models/dominio';
import { NOMBRE_ESTADO_PAGO, NOMBRE_ESTADO_RESERVA } from '../models/estados';
import type { Cotizacion } from '../services/ReservaService';
import { aDecimal } from '../shared/dinero';

/**
 * Convierten objetos del dominio (montos en céntimos) al formato del contrato
 * de la API (montos decimales). Es el único lugar donde se hace esa conversión.
 */

export function destinoPublico(d: Destino) {
  return {
    id: d.id,
    nombre: d.nombre,
    descripcion: d.descripcion,
    precioBase: aDecimal(d.precioBaseCentimos),
    capacidadMaximaDiaria: d.capacidadMaximaDiaria,
  };
}

export function cotizacionPublica(c: Cotizacion) {
  return {
    destino: c.destino,
    fecha: c.fecha,
    personas: c.personas,
    precioBase: aDecimal(c.precioBaseCentimos),
    subtotal: aDecimal(c.subtotalCentimos),
    tasaIva: c.tasaIvaPorcentaje / 100,
    iva: aDecimal(c.ivaCentimos),
    montoTotal: aDecimal(c.totalCentimos),
  };
}

/**
 * Reserva vista por el turista (CU-03, CU-04 a CU-06). RNF-07: no se devuelven
 * el teléfono ni el correo completo; de la tarjeta solo los últimos 4 dígitos.
 */
export function reservaPublica(r: ReservaDetalle, modificable?: boolean) {
  return {
    codigo: r.codigoConfirmacion,
    destino: r.destino,
    fecha: r.fechaViaje,
    personas: r.cantidadPersonas,
    precioBase: aDecimal(r.precioBaseCentimos),
    subtotal: aDecimal(r.subtotalCentimos),
    tasaIva: r.tasaIvaPorcentaje / 100,
    iva: aDecimal(r.ivaCentimos),
    montoTotal: aDecimal(r.totalCentimos),
    estadoReserva: NOMBRE_ESTADO_RESERVA[r.estadoReservaId],
    estadoPago: r.estadoPagoId ? NOMBRE_ESTADO_PAGO[r.estadoPagoId] : null,
    tarjetaUltimos4: r.tarjetaUltimos4,
    cliente: { nombre: r.cliente.nombre },
    ...(modificable === undefined ? {} : { modificable }),
  };
}

/** Destino visto por el administrador (CU-09). */
export function destinoAdmin(d: DestinoAdmin | Destino) {
  return {
    ...destinoPublico(d),
    activo: d.activo,
    ...('reservasActivasFuturas' in d ? { reservasActivasFuturas: d.reservasActivasFuturas } : {}),
  };
}

/** Reserva vista por el administrador (CU-12 a CU-16): incluye contacto del cliente. */
export function reservaAdmin(r: ReservaDetalle) {
  return {
    id: r.id,
    ...reservaPublica(r),
    cliente: r.cliente,
    creadaEn: r.creadoEn,
  };
}
