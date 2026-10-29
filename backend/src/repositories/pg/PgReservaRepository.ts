import type { FechaISO, Uuid } from '../../models/dominio';
import { EstadoReserva } from '../../models/estados';
import type { ReservaRepository } from '../../ports/repositorios';
import type { Consultor } from './consultor';

export class PgReservaRepository implements ReservaRepository {
  constructor(private readonly db: Consultor) {}

  async sumarPersonasActivas(
    destinoId: Uuid,
    fecha: FechaISO,
    excluirReservaId?: Uuid,
  ): Promise<number> {
    const rows = await this.db.query<{ total: number }>(
      `SELECT COALESCE(SUM(cantidad_personas), 0)::int AS total
         FROM reservas
        WHERE destino_id = $1
          AND fecha_viaje = $2
          AND estado_reserva_id <> $3
          AND ($4::uuid IS NULL OR id <> $4::uuid)`,
      [destinoId, fecha, EstadoReserva.Cancelada, excluirReservaId ?? null],
    );
    return rows[0]?.total ?? 0;
  }
}
