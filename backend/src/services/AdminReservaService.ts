import {
  ConflictoError,
  DatosInvalidosError,
  NoEncontradoError,
  ReservaNoActivaError,
} from '../errors/errores';
import type { FiltroReservas, Reserva, ReservaDetalle, SesionAdmin, Uuid } from '../models/dominio';
import {
  EstadoReserva,
  NOMBRE_ESTADO_PAGO,
  NOMBRE_ESTADO_RESERVA,
  type EstadoPagoId,
  esReservaActiva,
} from '../models/estados';
import type { Repositorios } from '../ports/repositorios';
import type { Notificador } from '../ports/servicios-externos';
import type { UnidadDeTrabajo } from '../ports/unidad-de-trabajo';
import { SIN_AVISOS, avisar } from './avisos';

/**
 * Casos de uso del administrador sobre reservas y pagos: CU-12 a CU-16.
 * Cada cambio se hace con la reserva bloqueada y queda en la bitácora con el
 * administrador que lo hizo (OBJ-04).
 */
export class AdminReservaService {
  constructor(
    private readonly uow: UnidadDeTrabajo,
    /** Correos al turista cuando la agencia aprueba o cancela su reserva. */
    private readonly notificador: Notificador = SIN_AVISOS,
  ) {}

  /** CU-12 · Listado completo con filtros. */
  async listar(filtro: FiltroReservas): Promise<ReservaDetalle[]> {
    return this.uow.lectura.reservas.listarDetalle(filtro);
  }

  /** CU-13 · Aprobar una reserva Pendiente. */
  async aprobar(id: Uuid, admin: SesionAdmin): Promise<ReservaDetalle> {
    const detalle = await this.uow.ejecutar(async (repos) => {
      const reserva = await this.bloquear(repos, id);
      if (reserva.estadoReservaId !== EstadoReserva.Pendiente) {
        throw new ReservaNoActivaError(
          `Solo se pueden aprobar reservas pendientes; esta está ${NOMBRE_ESTADO_RESERVA[reserva.estadoReservaId]}.`,
        );
      }
      await repos.reservas.cambiarEstado(id, EstadoReserva.Aprobada);
      await repos.bitacora.registrar({
        reservaId: id,
        administradorId: admin.id,
        accion: 'APROBADA',
        valorAnterior: NOMBRE_ESTADO_RESERVA[reserva.estadoReservaId],
        valorNuevo: NOMBRE_ESTADO_RESERVA[EstadoReserva.Aprobada],
      });
      return this.detalle(repos, id);
    });

    avisar(this.notificador, { evento: 'APROBADA', reserva: detalle });
    return detalle;
  }

  /** CU-14 · Cancelar por decisión de la agencia, sin la restricción de 48 h (SUP-04). */
  async cancelar(id: Uuid, admin: SesionAdmin): Promise<ReservaDetalle> {
    const detalle = await this.uow.ejecutar(async (repos) => {
      const reserva = await this.bloquear(repos, id);
      if (!esReservaActiva(reserva.estadoReservaId)) {
        throw new ReservaNoActivaError('La reserva ya estaba cancelada.'); // flujo 4a
      }
      await repos.reservas.cambiarEstado(id, EstadoReserva.Cancelada);
      await repos.bitacora.registrar({
        reservaId: id,
        administradorId: admin.id,
        accion: 'CANCELADA',
        valorAnterior: NOMBRE_ESTADO_RESERVA[reserva.estadoReservaId],
        valorNuevo: NOMBRE_ESTADO_RESERVA[EstadoReserva.Cancelada],
      });
      return this.detalle(repos, id);
    });

    avisar(this.notificador, { evento: 'CANCELADA_POR_AGENCIA', reserva: detalle });
    return detalle;
  }

  /**
   * CU-15 · Eliminar definitivamente (con su pago y bitácora, en cascada).
   * Exige escribir el código de la reserva para confirmar (paso 3).
   */
  async eliminar(id: Uuid, codigoEscrito: string): Promise<void> {
    await this.uow.ejecutar(async (repos) => {
      const reserva = await this.bloquear(repos, id);
      if (reserva.codigoConfirmacion !== codigoEscrito.trim().toUpperCase()) {
        throw new DatosInvalidosError('El código escrito no coincide con el de la reserva.', [
          { campo: 'codigoConfirmacion', mensaje: `Escriba ${reserva.codigoConfirmacion} para confirmar.` },
        ]);
      }
      await repos.reservas.eliminar(id);
    });
  }

  /** CU-16 · Cambiar el estado del pago simulado (RF-09). */
  async actualizarPago(id: Uuid, nuevo: EstadoPagoId, admin: SesionAdmin): Promise<ReservaDetalle> {
    return this.uow.ejecutar(async (repos) => {
      const reserva = await this.bloquear(repos, id);
      if (!esReservaActiva(reserva.estadoReservaId)) {
        throw new ReservaNoActivaError('La reserva está cancelada: su pago ya no se puede modificar.'); // flujo 2a
      }
      const actual = await repos.pagos.bloquearEstado(id);
      if (actual === null) throw new NoEncontradoError('La reserva no tiene un pago registrado.');
      if (actual === nuevo) {
        throw new ConflictoError(`El pago ya está ${NOMBRE_ESTADO_PAGO[nuevo]}.`); // flujo 4a
      }
      await repos.pagos.actualizarEstado(id, nuevo);
      await repos.bitacora.registrar({
        reservaId: id,
        administradorId: admin.id,
        accion: 'PAGO_ACTUALIZADO',
        valorAnterior: NOMBRE_ESTADO_PAGO[actual],
        valorNuevo: NOMBRE_ESTADO_PAGO[nuevo],
      });
      return this.detalle(repos, id);
    });
  }

  private async bloquear(repos: Repositorios, id: Uuid): Promise<Reserva> {
    const reserva = await repos.reservas.bloquearPorId(id);
    if (!reserva) throw new NoEncontradoError('La reserva no existe.');
    return reserva;
  }

  private async detalle(repos: Repositorios, id: Uuid): Promise<ReservaDetalle> {
    const d = await repos.reservas.obtenerDetalle(id);
    if (!d) throw new NoEncontradoError('La reserva no existe.');
    return d;
  }
}
