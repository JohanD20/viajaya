import type { Pool, PoolClient } from 'pg';

/**
 * Lo único que un repositorio necesita para ejecutar SQL. Puede venir del pool
 * (consultas sueltas) o de un cliente con una transacción abierta
 * (UnidadDeTrabajo.ejecutar).
 *
 * Regla S-02: SIEMPRE consultas parametrizadas ($1, $2…), nunca interpolar valores.
 */
export interface Consultor {
  query<Fila>(sql: string, valores?: readonly unknown[]): Promise<Fila[]>;
}

export function consultorDePool(pool: Pool): Consultor {
  return {
    async query<Fila>(sql: string, valores: readonly unknown[] = []): Promise<Fila[]> {
      const resultado = await pool.query(sql, [...valores]);
      return resultado.rows as Fila[];
    },
  };
}

export function consultorDeCliente(cliente: PoolClient): Consultor {
  return {
    async query<Fila>(sql: string, valores: readonly unknown[] = []): Promise<Fila[]> {
      const resultado = await cliente.query(sql, [...valores]);
      return resultado.rows as Fila[];
    },
  };
}
