import type {
  Administrador,
  DatosCliente,
  DatosDestino,
  Destino,
  FiltroDestinos,
  FiltroReservas,
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
  /** CU-09: todos los destinos (activos e inactivos) con filtro por estado y nombre. */
  listar(filtro: FiltroDestinos): Promise<Destino[]>;
  /** Nombre único sin distinguir mayúsculas (CU-08 4b, CU-10 4a). */
  existeNombre(nombre: string, excluirId?: Uuid): Promise<boolean>;
  crear(datos: DatosDestino): Promise<Destino>;
  actualizar(id: Uuid, datos: DatosDestino & { activo: boolean }): Promise<Destino>;
  cambiarActivo(id: Uuid, activo: boolean): Promise<void>;
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
  /** RC-06: fecha (desde `desde`) con más personas reservadas en el destino. */
  mayorOcupacionDesde(destinoId: Uuid, desde: FechaISO): Promise<{ fecha: FechaISO; personas: number } | null>;
  /** CU-11 paso 2: reservas activas del destino desde `desde`. */
  contarActivasDesde(destinoId: Uuid, desde: FechaISO): Promise<number>;
  /** CU-12: listado completo con filtros, ordenado por fecha de viaje. */
  listarDetalle(filtro: FiltroReservas): Promise<ReservaDetalle[]>;
  bloquearPorId(id: Uuid): Promise<Reserva | null>;
  /** CU-15: borrado definitivo; el pago y la bitácora se borran en cascada. */
  eliminar(id: Uuid): Promise<boolean>;
}

export interface ClienteRepository {
  /** Si el correo ya existe, actualiza nombre y teléfono con los últimos datos (SAD 3.5). */
  registrarOActualizar(datos: DatosCliente): Promise<Uuid>;
}

export interface PagoRepository {
  registrar(datos: { reservaId: Uuid; estadoPagoId: EstadoPagoId; ultimos4: string }): Promise<void>;
  /** Estado actual del pago de la reserva, bloqueando la fila (CU-16). */
  bloquearEstado(reservaId: Uuid): Promise<EstadoPagoId | null>;
  actualizarEstado(reservaId: Uuid, estado: EstadoPagoId): Promise<void>;
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
