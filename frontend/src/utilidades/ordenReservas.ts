import type { ReservaAdmin } from '../servicios/contratos';

/** Criterios de orden del listado de reservas del panel (CU-12). */
export type OrdenReservas = 'creacion' | 'viaje';

/**
 * - creacion: las reservas hechas más recientemente primero.
 * - viaje: las excursiones más próximas primero; si coinciden, la reservada antes.
 * No modifica la lista original.
 */
export function ordenarReservas(reservas: readonly ReservaAdmin[], orden: OrdenReservas): ReservaAdmin[] {
  const porCreacion = (a: ReservaAdmin, b: ReservaAdmin) => Date.parse(a.creadaEn) - Date.parse(b.creadaEn);
  return [...reservas].sort((a, b) =>
    orden === 'creacion' ? porCreacion(b, a) : a.fecha.localeCompare(b.fecha) || porCreacion(a, b),
  );
}
