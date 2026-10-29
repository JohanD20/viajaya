import type { EntradaBitacora } from '../../models/dominio';
import type { BitacoraRepository } from '../../ports/repositorios';
import type { Consultor } from './consultor';

/** Trazabilidad de cada cambio sobre una reserva (OBJ-04). */
export class PgBitacoraRepository implements BitacoraRepository {
  constructor(private readonly db: Consultor) {}

  async registrar(e: EntradaBitacora): Promise<void> {
    await this.db.query(
      `INSERT INTO bitacora_reservas (reserva_id, administrador_id, accion, valor_anterior, valor_nuevo)
       VALUES ($1, $2, $3, $4, $5)`,
      [e.reservaId, e.administradorId, e.accion, e.valorAnterior ?? null, e.valorNuevo ?? null],
    );
  }
}
