import type { Destino } from '../models/dominio';
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
