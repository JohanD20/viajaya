import type { FechaISO } from '../models/dominio';
import { inicioDelDiaCostaRica } from '../shared/fechas';

/**
 * RN-02 · Ventana de 48 horas (CU-18).
 * El turista solo puede cambiar de fecha o cancelar si faltan MÁS de 48 horas
 * para las 00:00 (hora de Costa Rica) de la fecha agendada. Exactamente 48 h no
 * cumple (Glosario, SUP-02). La hora actual se recibe como parámetro para que
 * la regla sea pura y se pueda probar con cualquier fecha.
 */

export const VENTANA_HORAS = 48;
const VENTANA_MS = VENTANA_HORAS * 60 * 60 * 1000;

export const VentanaService = {
  /** Horas que faltan (puede ser negativo si la fecha ya pasó). */
  horasRestantes(fechaAgendada: FechaISO, ahora: Date): number {
    return (inicioDelDiaCostaRica(fechaAgendada).getTime() - ahora.getTime()) / 3_600_000;
  },

  permiteCambio(fechaAgendada: FechaISO, ahora: Date): boolean {
    return inicioDelDiaCostaRica(fechaAgendada).getTime() - ahora.getTime() > VENTANA_MS;
  },
};
