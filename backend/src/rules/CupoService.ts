/**
 * RN-01 · Control de cupo (CU-17).
 * Función pura: recibe los números que ya leyó el repositorio (con el destino
 * bloqueado) y devuelve la decisión. No accede a la base de datos.
 */

export interface EntradaCupo {
  capacidadMaximaDiaria: number;
  /** Personas de las reservas activas del destino en la fecha (sin la propia al mover). */
  personasReservadas: number;
  personasSolicitadas: number;
}

export interface ResultadoCupo {
  aceptado: boolean;
  /** Espacios que quedan antes de esta solicitud. */
  disponibles: number;
}

export const CupoService = {
  disponibles(capacidadMaximaDiaria: number, personasReservadas: number): number {
    return Math.max(0, capacidadMaximaDiaria - personasReservadas);
  },

  verificar(entrada: EntradaCupo): ResultadoCupo {
    const disponibles = CupoService.disponibles(
      entrada.capacidadMaximaDiaria,
      entrada.personasReservadas,
    );
    return { aceptado: entrada.personasSolicitadas <= disponibles, disponibles };
  },
};
