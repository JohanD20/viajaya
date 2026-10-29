import type { Destino, Uuid } from '../../models/dominio';
import type { DestinoRepository } from '../../ports/repositorios';
import { aCentimos } from '../../shared/dinero';
import type { Consultor } from './consultor';

interface FilaDestino {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio_base: string;
  capacidad_maxima_diaria: number;
  activo: boolean;
}

function aDestino(fila: FilaDestino): Destino {
  return {
    id: fila.id,
    nombre: fila.nombre,
    descripcion: fila.descripcion,
    precioBaseCentimos: aCentimos(fila.precio_base),
    capacidadMaximaDiaria: fila.capacidad_maxima_diaria,
    activo: fila.activo,
  };
}

export class PgDestinoRepository implements DestinoRepository {
  constructor(private readonly db: Consultor) {}

  async listarActivos(): Promise<Destino[]> {
    const rows = await this.db.query<FilaDestino>(
      `SELECT id, nombre, descripcion, precio_base, capacidad_maxima_diaria, activo
         FROM destinos WHERE activo ORDER BY nombre`,
    );
    return rows.map(aDestino);
  }

  async buscarPorId(id: Uuid): Promise<Destino | null> {
    const rows = await this.db.query<FilaDestino>(
      `SELECT id, nombre, descripcion, precio_base, capacidad_maxima_diaria, activo
         FROM destinos WHERE id = $1`,
      [id],
    );
    return rows[0] ? aDestino(rows[0]) : null;
  }

  async bloquearPorId(id: Uuid): Promise<Destino | null> {
    const rows = await this.db.query<FilaDestino>(
      `SELECT id, nombre, descripcion, precio_base, capacidad_maxima_diaria, activo
         FROM destinos WHERE id = $1
          FOR UPDATE`,
      [id],
    );
    return rows[0] ? aDestino(rows[0]) : null;
  }
}
