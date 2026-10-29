/**
 * Errores de dominio tipados (SAD, sección 4 "Manejo centralizado de errores").
 * Los servicios los lanzan; el middleware middlewares/errores.ts los traduce a
 * application/problem+json (RFC 7807) con el código HTTP del contrato (SAD 3.1).
 * Los servicios NUNCA conocen Express ni códigos HTTP directamente.
 */

export interface DetalleCampo {
  campo: string;
  mensaje: string;
}

export abstract class ErrorDominio extends Error {
  abstract readonly estadoHttp: number;
  abstract readonly titulo: string;

  constructor(
    mensaje: string,
    readonly extras: Record<string, unknown> = {},
  ) {
    super(mensaje);
    this.name = new.target.name;
  }
}

/** 400 — formato o rango inválido (RNF-08). */
export class DatosInvalidosError extends ErrorDominio {
  readonly estadoHttp = 400;
  readonly titulo = 'Datos inválidos';
  constructor(mensaje: string, errores: DetalleCampo[] = []) {
    super(mensaje, errores.length > 0 ? { errores } : {});
  }
}

/** 401 — sin token, token inválido o credenciales incorrectas (mensaje siempre genérico). */
export class NoAutenticadoError extends ErrorDominio {
  readonly estadoHttp = 401;
  readonly titulo = 'No autenticado';
}

/** 404 — recurso inexistente, o código y correo que no coinciden (RNF-06). */
export class NoEncontradoError extends ErrorDominio {
  readonly estadoHttp = 404;
  readonly titulo = 'No encontrado';
}

/** 409 — RN-01: la suma de personas supera la capacidad máxima diaria. */
export class CupoInsuficienteError extends ErrorDominio {
  readonly estadoHttp = 409;
  readonly titulo = 'Cupo insuficiente';
  constructor(readonly disponibles: number) {
    super(`Cupo insuficiente: quedan ${disponibles} espacios para esa fecha.`, { disponibles });
  }
}

/** 409 — la reserva no está en un estado que permita la operación (RC-05). */
export class ReservaNoActivaError extends ErrorDominio {
  readonly estadoHttp = 409;
  readonly titulo = 'Estado incompatible';
}

/** 409 — conflicto de datos únicos u operación repetida (nombre de destino duplicado, ya inactivo…). */
export class ConflictoError extends ErrorDominio {
  readonly estadoHttp = 409;
  readonly titulo = 'Conflicto';
}

/** 422 — RN-02: faltan 48 horas o menos para la fecha agendada. */
export class VentanaVencidaError extends ErrorDominio {
  readonly estadoHttp = 422;
  readonly titulo = 'Fuera de la ventana de 48 horas';
}

/** 422 — otra regla de negocio incumplida (destino inactivo, fecha no futura…). */
export class ReglaNegocioError extends ErrorDominio {
  readonly estadoHttp = 422;
  readonly titulo = 'Regla de negocio incumplida';
}

/** 503 — la base de datos no responde. */
export class ServicioNoDisponibleError extends ErrorDominio {
  readonly estadoHttp = 503;
  readonly titulo = 'Servicio no disponible';
}
