import type { DatosCliente, Uuid } from '../../models/dominio';
import type { ClienteRepository } from '../../ports/repositorios';
import type { Consultor } from './consultor';

export class PgClienteRepository implements ClienteRepository {
  constructor(private readonly db: Consultor) {}

  async registrarOActualizar(d: DatosCliente): Promise<Uuid> {
    const rows = await this.db.query<{ id: string }>(
      `INSERT INTO clientes (nombre, correo, telefono)
       VALUES ($1, $2, $3)
       ON CONFLICT (correo) DO UPDATE
         SET nombre = EXCLUDED.nombre, telefono = EXCLUDED.telefono
       RETURNING id`,
      [d.nombre, d.correo, d.telefono],
    );
    const fila = rows[0];
    if (!fila) throw new Error('El registro del cliente no devolvió un id.');
    return fila.id;
  }
}
