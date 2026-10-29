/**
 * RN-03 · Cálculo de tarifa (CU-19).
 *   Monto total = (precio base × N.º de personas) × 1,13, redondeado a 2 decimales.
 *
 * Se calcula en céntimos enteros: subtotal exacto, IVA redondeado al céntimo
 * (mitad hacia arriba, igual que round() de PostgreSQL en la vista
 * v_reservas_detalle) y total = subtotal + IVA. Como el subtotal ya es exacto,
 * esto da el mismo resultado que redondear (subtotal × 1,13).
 */

export const TASA_IVA_PORCENTAJE = 13;

export interface EntradaTarifa {
  precioBaseCentimos: number;
  personas: number;
  tasaIvaPorcentaje?: number;
}

export interface Tarifa {
  subtotalCentimos: number;
  ivaCentimos: number;
  totalCentimos: number;
  tasaIvaPorcentaje: number;
}

export const TarifaService = {
  calcular({
    precioBaseCentimos,
    personas,
    tasaIvaPorcentaje = TASA_IVA_PORCENTAJE,
  }: EntradaTarifa): Tarifa {
    if (!Number.isInteger(precioBaseCentimos) || precioBaseCentimos <= 0) {
      throw new RangeError('El precio base debe ser un número entero de céntimos mayor que 0.');
    }
    if (!Number.isInteger(personas) || personas < 1) {
      throw new RangeError('La cantidad de personas debe ser un entero mayor o igual a 1.');
    }
    const subtotalCentimos = precioBaseCentimos * personas;
    const ivaCentimos = Math.round((subtotalCentimos * tasaIvaPorcentaje) / 100);
    return {
      subtotalCentimos,
      ivaCentimos,
      totalCentimos: subtotalCentimos + ivaCentimos,
      tasaIvaPorcentaje,
    };
  },
};
