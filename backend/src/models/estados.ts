/**
 * Catálogos de estado. Los ids coinciden con los insertados en
 * database/migrations/001_esquema.sql; no cambiarlos sin una migración.
 */

export const EstadoReserva = {
  Pendiente: 1,
  Aprobada: 2,
  Cancelada: 3,
} as const;
export type EstadoReservaId = (typeof EstadoReserva)[keyof typeof EstadoReserva];

export const EstadoPago = {
  Pendiente: 1,
  Aprobado: 2,
  Rechazado: 3,
} as const;
export type EstadoPagoId = (typeof EstadoPago)[keyof typeof EstadoPago];

export const NOMBRE_ESTADO_RESERVA: Record<EstadoReservaId, string> = {
  1: 'Pendiente',
  2: 'Aprobada',
  3: 'Cancelada',
};

export const NOMBRE_ESTADO_PAGO: Record<EstadoPagoId, string> = {
  1: 'Pendiente',
  2: 'Aprobado',
  3: 'Rechazado',
};

/** Reserva activa = Pendiente o Aprobada (Glosario). Consume cupo. */
export function esReservaActiva(estado: EstadoReservaId): boolean {
  return estado !== EstadoReserva.Cancelada;
}
