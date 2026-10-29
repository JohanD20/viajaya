import type { Repositorios } from './repositorios';

/**
 * Unidad de trabajo: encapsula la transacción (BEGIN / COMMIT / ROLLBACK).
 * Es la versión inyectable de la función `enTransaccion()` del SAD (sección 4).
 *
 * - `lectura`: repositorios sin transacción, para consultas simples.
 * - `ejecutar(trabajo)`: abre una transacción, entrega repositorios que usan esa
 *   misma conexión y confirma si `trabajo` termina bien o revierte si lanza un error.
 *
 * Ejemplo (CU-03, RN-01):
 *   await uow.ejecutar(async (repos) => {
 *     const destino = await repos.destinos.bloquearPorId(id);   // FOR UPDATE
 *     const reservadas = await repos.reservas.sumarPersonasActivas(id, fecha);
 *     ...                                                        // si lanza → ROLLBACK
 *   });
 */
export interface UnidadDeTrabajo {
  readonly lectura: Repositorios;
  ejecutar<T>(trabajo: (repos: Repositorios) => Promise<T>): Promise<T>;
}
