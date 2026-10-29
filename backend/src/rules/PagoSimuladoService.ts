import { DatosInvalidosError } from '../errors/errores';
import { EstadoPago } from '../models/estados';
import type { PasarelaPago, ResultadoPago } from '../ports/servicios-externos';

/**
 * RN-04 · Gateway de pago simulado (CU-20).
 * Último dígito par (0, 2, 4, 6, 8) → Aprobado; impar → Rechazado.
 * Implementa la interfaz PasarelaPago (ADR-07): ReservaService no sabe si el
 * pago es simulado o real. No mueve dinero ni guarda el número completo.
 */

const FORMATO_TARJETA = /^\d{13,19}$/;

export class PagoSimuladoService implements PasarelaPago {
  /** Regla pura, expuesta para probarla sin instanciar la clase. */
  static decidir(numeroTarjeta: string): ResultadoPago {
    if (!FORMATO_TARJETA.test(numeroTarjeta)) {
      throw new DatosInvalidosError('La tarjeta debe tener entre 13 y 19 dígitos.', [
        { campo: 'numeroTarjeta', mensaje: 'Debe tener entre 13 y 19 dígitos, sin espacios.' },
      ]);
    }
    const ultimoDigito = Number(numeroTarjeta.at(-1));
    return {
      estadoPagoId: ultimoDigito % 2 === 0 ? EstadoPago.Aprobado : EstadoPago.Rechazado,
      ultimos4: numeroTarjeta.slice(-4),
    };
  }

  async procesar(numeroTarjeta: string): Promise<ResultadoPago> {
    return PagoSimuladoService.decidir(numeroTarjeta);
  }
}
