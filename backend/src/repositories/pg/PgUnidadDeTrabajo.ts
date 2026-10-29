import type { Pool } from 'pg';
import type { Repositorios } from '../../ports/repositorios';
import type { UnidadDeTrabajo } from '../../ports/unidad-de-trabajo';
import { type Consultor, consultorDeCliente, consultorDePool } from './consultor';
import { PgAdministradorRepository } from './PgAdministradorRepository';
import { PgBitacoraRepository } from './PgBitacoraRepository';
import { PgClienteRepository } from './PgClienteRepository';
import { PgDestinoRepository } from './PgDestinoRepository';
import { PgPagoRepository } from './PgPagoRepository';
import { PgReservaRepository } from './PgReservaRepository';

/** Crea todos los repositorios sobre la misma conexión. Agregue aquí los nuevos. */
function crearRepositorios(db: Consultor): Repositorios {
  return {
    destinos: new PgDestinoRepository(db),
    reservas: new PgReservaRepository(db),
    clientes: new PgClienteRepository(db),
    pagos: new PgPagoRepository(db),
    bitacora: new PgBitacoraRepository(db),
    administradores: new PgAdministradorRepository(db),
  };
}

/**
 * Implementación de UnidadDeTrabajo con PostgreSQL (SAD 4 "Persistencia y
 * transacciones"). Toma un cliente del pool, abre la transacción, confirma o
 * revierte, y siempre devuelve el cliente al pool.
 */
export class PgUnidadDeTrabajo implements UnidadDeTrabajo {
  readonly lectura: Repositorios;

  constructor(private readonly pool: Pool) {
    this.lectura = crearRepositorios(consultorDePool(pool));
  }

  async ejecutar<T>(trabajo: (repos: Repositorios) => Promise<T>): Promise<T> {
    const cliente = await this.pool.connect();
    try {
      await cliente.query('BEGIN');
      const resultado = await trabajo(crearRepositorios(consultorDeCliente(cliente)));
      await cliente.query('COMMIT');
      return resultado;
    } catch (error) {
      await cliente.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      cliente.release();
    }
  }
}
