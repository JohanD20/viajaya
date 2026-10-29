import type { Uuid } from '../../models/dominio';
import type { EstadoPagoId } from '../../models/estados';
import type { PagoRepository } from '../../ports/repositorios';
import type { Consultor } from './consultor';

export class PgPagoRepository implements PagoRepository {
  constructor(private readonly db: Consultor) {}

  async registrar(d: { reservaId: Uuid; estadoPagoId: EstadoPagoId; ultimos4: string }): Promise<void> {
    await this.db.query(
      'INSERT INTO pagos (reserva_id, estado_pago_id, tarjeta_ultimos4) VALUES ($1, $2, $3)',
      [d.reservaId, d.estadoPagoId, d.ultimos4],
    );
  }

  async bloquearEstado(reservaId: Uuid): Promise<EstadoPagoId | null> {
    const rows = await this.db.query<{ estado_pago_id: number }>(
      'SELECT estado_pago_id FROM pagos WHERE reserva_id = $1 FOR UPDATE',
      [reservaId],
    );
    return (rows[0]?.estado_pago_id ?? null) as EstadoPagoId | null;
  }

  async actualizarEstado(reservaId: Uuid, estado: EstadoPagoId): Promise<void> {
    await this.db.query('UPDATE pagos SET estado_pago_id = $2 WHERE reserva_id = $1', [reservaId, estado]);
  }
}
