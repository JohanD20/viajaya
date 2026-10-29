import type { FechaISO, ReservaDetalle, SesionAdmin } from '../models/dominio';
import type { EstadoPagoId } from '../models/estados';

/**
 * PUERTOS hacia infraestructura. Cada interfaz tiene una implementación real
 * (infra/) y una falsa para pruebas (test/fakes/). La raíz de composición
 * (container.ts) decide cuál se usa.
 */

/** ADR-07: el gateway simulado se puede reemplazar por una pasarela real sin tocar ReservaService. */
export interface PasarelaPago {
  procesar(numeroTarjeta: string): Promise<ResultadoPago>;
}

export interface ResultadoPago {
  estadoPagoId: EstadoPagoId;
  /** Lo único que se guarda de la tarjeta (RNF-05). */
  ultimos4: string;
}

/** Fuente de la hora actual. Permite probar RN-02 con una fecha fija. */
export interface Reloj {
  ahora(): Date;
}

/** Genera códigos de confirmación con formato VY-XXXXXX. */
export interface GeneradorCodigo {
  generar(): string;
}

export interface HasherContrasena {
  hash(texto: string): Promise<string>;
  comparar(texto: string, hash: string): Promise<boolean>;
}

export interface EmisorToken {
  emitir(sesion: SesionAdmin): string;
  /** Lanza NoAutenticadoError si el token falta, venció o es inválido. */
  verificar(token: string): SesionAdmin;
}

/** Momentos en que se avisa al turista por correo. */
export type EventoReserva =
  | 'CREADA'
  | 'FECHA_CAMBIADA'
  | 'CANCELADA_POR_TURISTA'
  | 'CANCELADA_POR_AGENCIA'
  | 'APROBADA';

export interface NotificacionReserva {
  evento: EventoReserva;
  reserva: ReservaDetalle;
  /** Solo en FECHA_CAMBIADA. */
  fechaAnterior?: FechaISO;
}

/**
 * Avisos al turista (correo de confirmación y cambios). Los servicios lo llaman
 * DESPUÉS del COMMIT y nunca dejan que un fallo de envío deshaga la operación.
 * Implementaciones: infra/correo (consola, Brevo o Resend) y un doble en memoria.
 */
export interface Notificador {
  notificar(notificacion: NotificacionReserva): Promise<void>;
}
