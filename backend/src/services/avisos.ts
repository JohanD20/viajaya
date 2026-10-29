import type { NotificacionReserva, Notificador } from '../ports/servicios-externos';

/** Notificador que no hace nada: el valor por omisión cuando no se inyecta uno. */
export const SIN_AVISOS: Notificador = { notificar: async () => undefined };

/**
 * Dispara el aviso sin esperarlo: la respuesta al turista no se demora por el
 * proveedor de correo y un fallo de envío nunca afecta una operación que ya se
 * confirmó en la base de datos. El adaptador (infra/correo) registra los fallos.
 */
export function avisar(notificador: Notificador, notificacion: NotificacionReserva): void {
  try {
    notificador.notificar(notificacion).catch(() => undefined);
  } catch {
    // Un notificador que falla de forma síncrona tampoco debe romper el caso de uso.
  }
}
