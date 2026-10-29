import type { NotificacionReserva, Notificador } from '../../ports/servicios-externos';
import { componerCorreo } from './plantillas';
import type { ProveedorCorreo, Registro } from './proveedores';

/**
 * Adaptador del puerto Notificador: arma el correo y lo entrega al proveedor
 * configurado. Nunca rechaza la promesa: un fallo de envío queda en el log
 * (sin la dirección del turista, S-11) y la reserva sigue su curso.
 */
export class NotificadorCorreo implements Notificador {
  constructor(
    private readonly proveedor: ProveedorCorreo,
    private readonly sitioUrl: string,
    private readonly registro: Registro,
  ) {}

  async notificar(n: NotificacionReserva): Promise<void> {
    const datos = { evento: n.evento, codigo: n.reserva.codigoConfirmacion, proveedor: this.proveedor.nombre };
    try {
      await this.proveedor.enviar(componerCorreo(n, this.sitioUrl));
      if (this.proveedor.nombre !== 'consola') this.registro.info(datos, 'Correo enviado');
    } catch (error) {
      this.registro.error({ ...datos, motivo: (error as Error).message }, 'No se pudo enviar el correo');
    }
  }
}
