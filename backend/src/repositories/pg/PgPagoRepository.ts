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
}
