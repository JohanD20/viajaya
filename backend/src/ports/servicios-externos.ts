import type { SesionAdmin } from '../models/dominio';
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
