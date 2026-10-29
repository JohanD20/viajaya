import type { DatosDestino, Destino, FiltroDestinos, Uuid } from '../../models/dominio';
import type { DestinoRepository } from '../../ports/repositorios';
import { aCentimos, aTextoDecimal } from '../../shared/dinero';
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

  async listar(filtro: FiltroDestinos): Promise<Destino[]> {
    const rows = await this.db.query<FilaDestino>(
      `SELECT id, nombre, descripcion, precio_base, capacidad_maxima_diaria, activo
         FROM destinos
        WHERE ($1::boolean IS NULL OR activo = $1)
          AND ($2::text IS NULL OR nombre ILIKE '%' || $2 || '%')
        ORDER BY activo DESC, nombre`,
      [filtro.activo ?? null, filtro.nombre ?? null],
    );
    return rows.map(aDestino);
  }

  async existeNombre(nombre: string, excluirId?: Uuid): Promise<boolean> {
    const rows = await this.db.query<{ existe: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM destinos
          WHERE lower(nombre) = lower($1) AND ($2::uuid IS NULL OR id <> $2::uuid)
       ) AS existe`,
      [nombre, excluirId ?? null],
    );
    return rows[0]?.existe ?? false;
  }

  async crear(d: DatosDestino): Promise<Destino> {
    const rows = await this.db.query<FilaDestino>(
      `INSERT INTO destinos (nombre, descripcion, precio_base, capacidad_maxima_diaria)
       VALUES ($1, $2, $3, $4)
       RETURNING id, nombre, descripcion, precio_base, capacidad_maxima_diaria, activo`,
      [d.nombre, d.descripcion, aTextoDecimal(d.precioBaseCentimos), d.capacidadMaximaDiaria],
    );
    if (!rows[0]) throw new Error('La inserción del destino no devolvió datos.');
    return aDestino(rows[0]);
  }

  async actualizar(id: Uuid, d: DatosDestino & { activo: boolean }): Promise<Destino> {
    const rows = await this.db.query<FilaDestino>(
      `UPDATE destinos
          SET nombre = $2, descripcion = $3, precio_base = $4, capacidad_maxima_diaria = $5, activo = $6
        WHERE id = $1
       RETURNING id, nombre, descripcion, precio_base, capacidad_maxima_diaria, activo`,
      [id, d.nombre, d.descripcion, aTextoDecimal(d.precioBaseCentimos), d.capacidadMaximaDiaria, d.activo],
    );
    if (!rows[0]) throw new Error('El destino a actualizar no existe.');
    return aDestino(rows[0]);
  }

  async cambiarActivo(id: Uuid, activo: boolean): Promise<void> {
    await this.db.query('UPDATE destinos SET activo = $2 WHERE id = $1', [id, activo]);
  }
}
