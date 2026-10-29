import type { Administrador } from '../../models/dominio';
import type { AdministradorRepository } from '../../ports/repositorios';
import type { Consultor } from './consultor';

interface FilaAdministrador {
  id: string;
  nombre: string;
  correo: string;
  password_hash: string;
  activo: boolean;
}

export class PgAdministradorRepository implements AdministradorRepository {
  constructor(private readonly db: Consultor) {}

  async buscarPorCorreo(correo: string): Promise<Administrador | null> {
    const rows = await this.db.query<FilaAdministrador>(
      'SELECT id, nombre, correo, password_hash, activo FROM administradores WHERE correo = $1',
      [correo],
    );
    const fila = rows[0];
    return fila
      ? {
          id: fila.id,
          nombre: fila.nombre,
          correo: fila.correo,
          passwordHash: fila.password_hash,
          activo: fila.activo,
        }
      : null;
  }

  async guardar(datos: { nombre: string; correo: string; passwordHash: string }): Promise<void> {
    await this.db.query(
      `INSERT INTO administradores (nombre, correo, password_hash)
       VALUES ($1, $2, $3)
       ON CONFLICT (correo) DO UPDATE
         SET nombre = EXCLUDED.nombre, password_hash = EXCLUDED.password_hash, activo = true`,
      [datos.nombre, datos.correo, datos.passwordHash],
    );
  }
}
