import type { Administrador, Destino, FechaISO, Uuid } from '../models/dominio';

/**
 * PUERTOS de acceso a datos (Inversión de dependencias, SAD 2.2).
 * Los servicios dependen SOLO de estas interfaces. Las implementaciones con
 * PostgreSQL viven en repositories/pg/ y las de memoria (para pruebas) en
 * test/fakes/. Cada historia del backlog agrega aquí los métodos que necesita.
 */

export interface DestinoRepository {
  /** RC-01: solo destinos activos, ordenados por nombre. */
  listarActivos(): Promise<Destino[]>;
  buscarPorId(id: Uuid): Promise<Destino | null>;
  /**
   * SELECT … FOR UPDATE (ADR-04). Solo tiene efecto dentro de
   * UnidadDeTrabajo.ejecutar(); serializa las reservas del mismo destino.
   */
  bloquearPorId(id: Uuid): Promise<Destino | null>;
  // HU-04 a HU-07: crear, listar(filtro), actualizar, desactivar, existeNombre…
}

export interface ReservaRepository {
  /**
   * Suma de personas de las reservas activas (Pendiente o Aprobada) del destino
   * en la fecha. `excluirReservaId` se usa al cambiar de fecha (RC-04).
   */
  sumarPersonasActivas(destinoId: Uuid, fecha: FechaISO, excluirReservaId?: Uuid): Promise<number>;
  // HU-10 a HU-17: existeCodigo, crear, buscarPorCodigoYCorreo, cambiarFecha, cambiarEstado…
}

export interface AdministradorRepository {
  buscarPorCorreo(correo: string): Promise<Administrador | null>;
  /** Crea o actualiza (por correo) un administrador activo. Usado por scripts/crear-admin.ts. */
  guardar(datos: { nombre: string; correo: string; passwordHash: string }): Promise<void>;
}

// HU-10: ClienteRepository, PagoRepository y BitacoraRepository se agregan aquí
// y en `Repositorios` cuando se implemente la creación de reservas.

/** Conjunto de repositorios que comparten la misma conexión o transacción. */
export interface Repositorios {
  destinos: DestinoRepository;
  reservas: ReservaRepository;
  administradores: AdministradorRepository;
}
