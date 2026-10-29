import type {
  Administrador,
  DatosCliente,
  Destino,
  EntradaBitacora,
  FechaISO,
  NuevaReserva,
  Reserva,
  ReservaDetalle,
  Uuid,
} from '../models/dominio';
import type { EstadoPagoId, EstadoReservaId } from '../models/estados';

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
  existeCodigo(codigo: string): Promise<boolean>;
  crear(datos: NuevaReserva): Promise<Uuid>;
  /** RC-07: código y correo deben coincidir en el mismo registro. */
  buscarDetallePorCodigoYCorreo(codigo: string, correo: string): Promise<ReservaDetalle | null>;
  /** Igual que la anterior pero bloquea la fila (FOR UPDATE) dentro de una transacción. */
  bloquearPorCodigoYCorreo(codigo: string, correo: string): Promise<Reserva | null>;
  obtenerDetalle(id: Uuid): Promise<ReservaDetalle | null>;
  cambiarFecha(id: Uuid, fecha: FechaISO): Promise<void>;
  cambiarEstado(id: Uuid, estado: EstadoReservaId): Promise<void>;
  // HU-14 a HU-17: listarDetalle(filtro), eliminar…
}

export interface ClienteRepository {
  /** Si el correo ya existe, actualiza nombre y teléfono con los últimos datos (SAD 3.5). */
  registrarOActualizar(datos: DatosCliente): Promise<Uuid>;
}

export interface PagoRepository {
  registrar(datos: { reservaId: Uuid; estadoPagoId: EstadoPagoId; ultimos4: string }): Promise<void>;
  // HU-18: actualizarEstado(reservaId, estado)
}

export interface BitacoraRepository {
  registrar(entrada: EntradaBitacora): Promise<void>;
}

export interface AdministradorRepository {
  buscarPorCorreo(correo: string): Promise<Administrador | null>;
  /** Crea o actualiza (por correo) un administrador activo. Usado por scripts/crear-admin.ts. */
  guardar(datos: { nombre: string; correo: string; passwordHash: string }): Promise<void>;
}

/** Conjunto de repositorios que comparten la misma conexión o transacción. */
export interface Repositorios {
  destinos: DestinoRepository;
  reservas: ReservaRepository;
  clientes: ClienteRepository;
  pagos: PagoRepository;
  bitacora: BitacoraRepository;
  administradores: AdministradorRepository;
}
