import {
  CupoInsuficienteError,
  NoEncontradoError,
  ReglaNegocioError,
  ReservaNoActivaError,
  VentanaVencidaError,
} from '../errors/errores';
import type { DatosCliente, FechaISO, Reserva, ReservaDetalle, Uuid } from '../models/dominio';
import {
  EstadoReserva,
  NOMBRE_ESTADO_PAGO,
  NOMBRE_ESTADO_RESERVA,
  esReservaActiva,
} from '../models/estados';
import type { Repositorios } from '../ports/repositorios';
import type { GeneradorCodigo, PasarelaPago, Reloj } from '../ports/servicios-externos';
import type { UnidadDeTrabajo } from '../ports/unidad-de-trabajo';
import { CupoService } from '../rules/CupoService';
import { TarifaService, type Tarifa } from '../rules/TarifaService';
import { VentanaService } from '../rules/VentanaService';
import { esFechaFutura } from '../shared/fechas';

export interface DependenciasReservaService {
  uow: UnidadDeTrabajo;
  reloj: Reloj;
  /** RN-04 (ADR-07): simulada hoy, reemplazable por una pasarela real. */
  pasarela: PasarelaPago;
  /** Código VY-XXXXXX. */
  generadorCodigo: GeneradorCodigo;
}

export interface SolicitudCotizacion {
  destinoId: Uuid;
  fecha: FechaISO;
  personas: number;
}

export interface Cotizacion extends Tarifa {
  destino: { id: Uuid; nombre: string };
  fecha: FechaISO;
  personas: number;
  precioBaseCentimos: number;
}

export interface SolicitudReserva extends SolicitudCotizacion {
  cliente: DatosCliente;
  numeroTarjeta: string;
}

export interface ConsultaReserva {
  reserva: ReservaDetalle;
  /** true si el turista aún puede cambiar la fecha o cancelar (activa y fuera de las 48 h). */
  modificable: boolean;
}

/** RNF-06: el mismo mensaje si el código no existe o si el correo no coincide. */
const NO_ENCONTRADA = 'No encontramos una reserva con esos datos.';
const INTENTOS_CODIGO = 5;

/**
 * Casos de uso del turista sobre reservas: CU-02 cotizar, CU-03 crear,
 * CU-04 consultar, CU-05 cambiar fecha y CU-06 cancelar.
 */
export class ReservaService {
  constructor(private readonly deps: DependenciasReservaService) {}

  // ------------------------------------------------------------------ CU-02
  /** Cotizar reserva · RN-03 mediante CU-19. No reserva cupo ni guarda datos. */
  async cotizar({ destinoId, fecha, personas }: SolicitudCotizacion): Promise<Cotizacion> {
    this.exigirFechaFutura(fecha);

    const { destinos, reservas } = this.deps.uow.lectura;
    const destino = await destinos.buscarPorId(destinoId);
    if (!destino) throw new NoEncontradoError('El destino no existe.');
    // Flujo 2a: destino desactivado después de la búsqueda.
    if (!destino.activo) throw new ReglaNegocioError('El destino ya no está disponible.');

    // Precondición de CU-02: el destino tiene cupo para esa fecha y personas.
    const cupo = CupoService.verificar({
      capacidadMaximaDiaria: destino.capacidadMaximaDiaria,
      personasReservadas: await reservas.sumarPersonasActivas(destinoId, fecha),
      personasSolicitadas: personas,
    });
    if (!cupo.aceptado) throw new CupoInsuficienteError(cupo.disponibles);

    return {
      destino: { id: destino.id, nombre: destino.nombre },
      fecha,
      personas,
      precioBaseCentimos: destino.precioBaseCentimos,
      ...TarifaService.calcular({ precioBaseCentimos: destino.precioBaseCentimos, personas }),
    };
  }

  // ------------------------------------------------------------------ CU-03
  /**
   * Crear reserva (diagrama de secuencia CU-03 del SAD). Todo ocurre en UNA
   * transacción con el destino bloqueado (ADR-04): si el cupo no alcanza se
   * revierte y no se cobra. Un pago rechazado igual registra la reserva (SUP-03).
   */
  async crear(s: SolicitudReserva): Promise<ReservaDetalle> {
    this.exigirFechaFutura(s.fecha); // flujo 5b

    return this.deps.uow.ejecutar(async (repos) => {
      // Paso 5 · CU-17 Validar cupo con el destino bloqueado (RN-01).
      const destino = await repos.destinos.bloquearPorId(s.destinoId);
      if (!destino) throw new NoEncontradoError('El destino no existe.');
      if (!destino.activo) throw new ReglaNegocioError('El destino ya no está disponible.');

      const cupo = CupoService.verificar({
        capacidadMaximaDiaria: destino.capacidadMaximaDiaria,
        personasReservadas: await repos.reservas.sumarPersonasActivas(destino.id, s.fecha),
        personasSolicitadas: s.personas,
      });
      if (!cupo.aceptado) throw new CupoInsuficienteError(cupo.disponibles); // flujo 5a → ROLLBACK

      // Paso 6 · CU-19 Calcular tarifa (RN-03) con el precio vigente.
      const tarifa = TarifaService.calcular({
        precioBaseCentimos: destino.precioBaseCentimos,
        personas: s.personas,
      });

      // Paso 7 · CU-20 Procesar pago simulado (RN-04).
      const pago = await this.deps.pasarela.procesar(s.numeroTarjeta);

      // Paso 8 · Código único, cliente, reserva, pago y bitácora.
      const codigo = await this.generarCodigoUnico(repos);
      const clienteId = await repos.clientes.registrarOActualizar(s.cliente);
      const reservaId = await repos.reservas.crear({
        codigoConfirmacion: codigo,
        clienteId,
        destinoId: destino.id,
        estadoReservaId: EstadoReserva.Pendiente,
        fechaViaje: s.fecha,
        cantidadPersonas: s.personas,
        precioBaseAplicadoCentimos: destino.precioBaseCentimos,
        tasaIvaPorcentaje: tarifa.tasaIvaPorcentaje,
      });
      await repos.pagos.registrar({ reservaId, estadoPagoId: pago.estadoPagoId, ultimos4: pago.ultimos4 });
      await repos.bitacora.registrar({
        reservaId,
        administradorId: null,
        accion: 'CREADA',
        valorNuevo: `${NOMBRE_ESTADO_RESERVA[EstadoReserva.Pendiente]}; pago ${NOMBRE_ESTADO_PAGO[pago.estadoPagoId]}`,
      });

      return this.detalleObligatorio(repos, reservaId);
    });
  }

  // ------------------------------------------------------------------ CU-04
  /** Consultar reserva con código y correo (RC-07, RNF-06). */
  async consultar(codigo: string, correo: string): Promise<ConsultaReserva> {
    const reserva = await this.deps.uow.lectura.reservas.buscarDetallePorCodigoYCorreo(codigo, correo);
    if (!reserva) throw new NoEncontradoError(NO_ENCONTRADA);
    return {
      reserva,
      modificable:
        esReservaActiva(reserva.estadoReservaId) &&
        VentanaService.permiteCambio(reserva.fechaViaje, this.deps.reloj.ahora()),
    };
  }

  // ------------------------------------------------------------------ CU-05
  /** Cambiar fecha (diagrama CU-05): ventana de 48 h, luego cupo en la nueva fecha. */
  async cambiarFecha(codigo: string, correo: string, nuevaFecha: FechaISO): Promise<ReservaDetalle> {
    return this.deps.uow.ejecutar(async (repos) => {
      const reserva = await this.reservaModificable(repos, codigo, correo, 'cambiar la fecha');

      if (nuevaFecha === reserva.fechaViaje) {
        throw new ReglaNegocioError('La nueva fecha es igual a la fecha actual de la reserva.');
      }
      this.exigirFechaFutura(nuevaFecha); // flujo 5a

      // CU-17 en la nueva fecha, con el destino bloqueado y sin contar la propia reserva (RC-04).
      const destino = await repos.destinos.bloquearPorId(reserva.destinoId);
      if (!destino) throw new NoEncontradoError('El destino no existe.');
      const cupo = CupoService.verificar({
        capacidadMaximaDiaria: destino.capacidadMaximaDiaria,
        personasReservadas: await repos.reservas.sumarPersonasActivas(destino.id, nuevaFecha, reserva.id),
        personasSolicitadas: reserva.cantidadPersonas,
      });
      if (!cupo.aceptado) throw new CupoInsuficienteError(cupo.disponibles); // flujo 6a → ROLLBACK

      // El monto pagado se conserva (RC-04): no se tocan precio ni tasa aplicados.
      await repos.reservas.cambiarFecha(reserva.id, nuevaFecha);
      await repos.bitacora.registrar({
        reservaId: reserva.id,
        administradorId: null,
        accion: 'FECHA_CAMBIADA',
        valorAnterior: reserva.fechaViaje,
        valorNuevo: nuevaFecha,
      });
      return this.detalleObligatorio(repos, reserva.id);
    });
  }

  // ------------------------------------------------------------------ CU-06
  /** Cancelar reserva por el turista: libera el cupo; sin reembolso (fuera de alcance). */
  async cancelar(codigo: string, correo: string): Promise<ReservaDetalle> {
    return this.deps.uow.ejecutar(async (repos) => {
      const reserva = await this.reservaModificable(repos, codigo, correo, 'cancelar');
      await repos.reservas.cambiarEstado(reserva.id, EstadoReserva.Cancelada);
      await repos.bitacora.registrar({
        reservaId: reserva.id,
        administradorId: null,
        accion: 'CANCELADA',
        valorAnterior: NOMBRE_ESTADO_RESERVA[reserva.estadoReservaId],
        valorNuevo: NOMBRE_ESTADO_RESERVA[EstadoReserva.Cancelada],
      });
      return this.detalleObligatorio(repos, reserva.id);
    });
  }

  // ------------------------------------------------------------------ apoyo
  /** RC-02: la fecha agendada debe ser posterior a hoy (hora de Costa Rica). */
  private exigirFechaFutura(fecha: FechaISO): void {
    if (!esFechaFutura(fecha, this.deps.reloj.ahora())) {
      throw new ReglaNegocioError('La fecha del viaje debe ser posterior a hoy.');
    }
  }

  /**
   * Localiza y bloquea la reserva, y aplica RC-05 (no cancelada) y RN-02
   * (más de 48 h, CU-18) antes de modificarla.
   */
  private async reservaModificable(
    repos: Repositorios,
    codigo: string,
    correo: string,
    operacion: 'cambiar la fecha' | 'cancelar',
  ): Promise<Reserva> {
    const reserva = await repos.reservas.bloquearPorCodigoYCorreo(codigo, correo);
    if (!reserva) throw new NoEncontradoError(NO_ENCONTRADA);
    if (!esReservaActiva(reserva.estadoReservaId)) {
      throw new ReservaNoActivaError('La reserva está cancelada y ya no se puede modificar.');
    }
    if (!VentanaService.permiteCambio(reserva.fechaViaje, this.deps.reloj.ahora())) {
      throw new VentanaVencidaError(
        operacion === 'cancelar'
          ? 'Solo se puede cancelar hasta 48 horas antes de la excursión. Para cancelarla ahora, comuníquese con la agencia.'
          : 'Solo se puede cambiar la fecha hasta 48 horas antes de la excursión.',
      );
    }
    return reserva;
  }

  /** Flujo 8a de CU-03: si el código ya existe, se genera otro. */
  private async generarCodigoUnico(repos: Repositorios): Promise<string> {
    for (let intento = 0; intento < INTENTOS_CODIGO; intento++) {
      const codigo = this.deps.generadorCodigo.generar();
      if (!(await repos.reservas.existeCodigo(codigo))) return codigo;
    }
    throw new Error('No se pudo generar un código de confirmación único.');
  }

  private async detalleObligatorio(repos: Repositorios, id: Uuid): Promise<ReservaDetalle> {
    const detalle = await repos.reservas.obtenerDetalle(id);
    if (!detalle) throw new Error(`La reserva ${id} no se encontró después de guardarla.`);
    return detalle;
  }
}
