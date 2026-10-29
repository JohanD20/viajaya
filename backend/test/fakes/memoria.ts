import { randomUUID } from 'node:crypto';
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
  SesionAdmin,
  Uuid,
} from '../../src/models/dominio';
import {
  EstadoReserva,
  type EstadoPagoId,
  type EstadoReservaId,
  esReservaActiva,
} from '../../src/models/estados';
import type {
  AdministradorRepository,
  BitacoraRepository,
  ClienteRepository,
  DestinoRepository,
  PagoRepository,
  Repositorios,
  ReservaRepository,
} from '../../src/ports/repositorios';
import type { EmisorToken, HasherContrasena, Reloj } from '../../src/ports/servicios-externos';
import type { UnidadDeTrabajo } from '../../src/ports/unidad-de-trabajo';
import { TarifaService } from '../../src/rules/TarifaService';

/**
 * DOBLES EN MEMORIA. Implementan las mismas interfaces que los repositorios de
 * PostgreSQL, así los servicios se prueban sin base de datos ni red (ADR-03).
 * Esta es la ventaja práctica de la inversión de dependencias.
 */

export interface ReservaEnMemoria {
  id: Uuid;
  destinoId: Uuid;
  fechaViaje: FechaISO;
  cantidadPersonas: number;
  estadoReservaId: EstadoReservaId;
  codigoConfirmacion?: string;
  clienteId?: Uuid;
  precioBaseAplicadoCentimos?: number;
  tasaIvaPorcentaje?: number;
}

export interface ClienteEnMemoria extends DatosCliente {
  id: Uuid;
}

export interface PagoEnMemoria {
  reservaId: Uuid;
  estadoPagoId: EstadoPagoId;
  ultimos4: string;
}

export class DatosEnMemoria {
  destinos: Destino[] = [];
  reservas: ReservaEnMemoria[] = [];
  clientes: ClienteEnMemoria[] = [];
  pagos: PagoEnMemoria[] = [];
  bitacora: EntradaBitacora[] = [];
  administradores: Administrador[] = [];
}

class DestinoRepositoryEnMemoria implements DestinoRepository {
  constructor(private readonly datos: DatosEnMemoria) {}

  async listarActivos(): Promise<Destino[]> {
    return this.datos.destinos
      .filter((d) => d.activo)
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  async buscarPorId(id: Uuid): Promise<Destino | null> {
    return this.datos.destinos.find((d) => d.id === id) ?? null;
  }

  async bloquearPorId(id: Uuid): Promise<Destino | null> {
    return this.buscarPorId(id);
  }

  async listar(f: FiltroDestinos): Promise<Destino[]> {
    return this.datos.destinos.filter(
      (d) =>
        (f.activo === undefined || d.activo === f.activo) &&
        (!f.nombre || d.nombre.toLowerCase().includes(f.nombre.toLowerCase())),
    );
  }

  async existeNombre(nombre: string, excluirId?: Uuid): Promise<boolean> {
    return this.datos.destinos.some((d) => d.nombre.toLowerCase() === nombre.toLowerCase() && d.id !== excluirId);
  }

  async crear(d: DatosDestino): Promise<Destino> {
    const destino = { id: randomUUID(), activo: true, ...d };
    this.datos.destinos.push(destino);
    return { ...destino };
  }

  async actualizar(id: Uuid, d: DatosDestino & { activo: boolean }): Promise<Destino> {
    const destino = this.datos.destinos.find((x) => x.id === id);
    if (!destino) throw new Error('No existe');
    Object.assign(destino, d);
    return { ...destino };
  }

  async cambiarActivo(id: Uuid, activo: boolean): Promise<void> {
    const destino = this.datos.destinos.find((x) => x.id === id);
    if (destino) destino.activo = activo;
  }
}

class ReservaRepositoryEnMemoria implements ReservaRepository {
  constructor(private readonly datos: DatosEnMemoria) {}

  async sumarPersonasActivas(destinoId: Uuid, fecha: FechaISO, excluir?: Uuid): Promise<number> {
    return this.datos.reservas
      .filter(
        (r) =>
          r.destinoId === destinoId &&
          r.fechaViaje === fecha &&
          esReservaActiva(r.estadoReservaId) &&
          r.id !== excluir,
      )
      .reduce((suma, r) => suma + r.cantidadPersonas, 0);
  }

  async existeCodigo(codigo: string): Promise<boolean> {
    return this.datos.reservas.some((r) => r.codigoConfirmacion === codigo);
  }

  async crear(d: NuevaReserva): Promise<Uuid> {
    const id = randomUUID();
    this.datos.reservas.push({ id, ...d });
    return id;
  }

  async buscarDetallePorCodigoYCorreo(codigo: string, correo: string): Promise<ReservaDetalle | null> {
    const reserva = this.buscarPorCodigoYCorreo(codigo, correo);
    return reserva ? this.obtenerDetalle(reserva.id) : null;
  }

  async bloquearPorCodigoYCorreo(codigo: string, correo: string): Promise<Reserva | null> {
    const r = this.buscarPorCodigoYCorreo(codigo, correo);
    return r ? this.completar(r) : null;
  }

  async obtenerDetalle(id: Uuid): Promise<ReservaDetalle | null> {
    const fila = this.datos.reservas.find((r) => r.id === id);
    if (!fila) return null;
    const r = this.completar(fila);
    const cliente = this.datos.clientes.find((c) => c.id === r.clienteId);
    const destino = this.datos.destinos.find((d) => d.id === r.destinoId);
    const pago = this.datos.pagos.find((p) => p.reservaId === r.id);
    const tarifa = TarifaService.calcular({
      precioBaseCentimos: r.precioBaseAplicadoCentimos,
      personas: r.cantidadPersonas,
      tasaIvaPorcentaje: r.tasaIvaPorcentaje,
    });
    return {
      id: r.id,
      codigoConfirmacion: r.codigoConfirmacion,
      fechaViaje: r.fechaViaje,
      cantidadPersonas: r.cantidadPersonas,
      precioBaseCentimos: r.precioBaseAplicadoCentimos,
      subtotalCentimos: tarifa.subtotalCentimos,
      ivaCentimos: tarifa.ivaCentimos,
      totalCentimos: tarifa.totalCentimos,
      tasaIvaPorcentaje: r.tasaIvaPorcentaje,
      estadoReservaId: r.estadoReservaId,
      estadoPagoId: pago?.estadoPagoId ?? null,
      tarjetaUltimos4: pago?.ultimos4 ?? null,
      cliente: {
        nombre: cliente?.nombre ?? '',
        correo: cliente?.correo ?? '',
        telefono: cliente?.telefono ?? '',
      },
      destino: { id: r.destinoId, nombre: destino?.nombre ?? '' },
      creadoEn: '2026-11-01T16:00:00.000Z',
    };
  }

  async cambiarFecha(id: Uuid, fecha: FechaISO): Promise<void> {
    const r = this.datos.reservas.find((x) => x.id === id);
    if (r) r.fechaViaje = fecha;
  }

  async cambiarEstado(id: Uuid, estado: EstadoReservaId): Promise<void> {
    const r = this.datos.reservas.find((x) => x.id === id);
    if (r) r.estadoReservaId = estado;
  }

  async mayorOcupacionDesde(destinoId: Uuid, desde: FechaISO): Promise<{ fecha: FechaISO; personas: number } | null> {
    const porFecha = new Map<FechaISO, number>();
    for (const r of this.datos.reservas) {
      if (r.destinoId === destinoId && r.fechaViaje >= desde && esReservaActiva(r.estadoReservaId)) {
        porFecha.set(r.fechaViaje, (porFecha.get(r.fechaViaje) ?? 0) + r.cantidadPersonas);
      }
    }
    const [primera] = [...porFecha.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    return primera ? { fecha: primera[0], personas: primera[1] } : null;
  }

  async contarActivasDesde(destinoId: Uuid, desde: FechaISO): Promise<number> {
    return this.datos.reservas.filter(
      (r) => r.destinoId === destinoId && r.fechaViaje >= desde && esReservaActiva(r.estadoReservaId),
    ).length;
  }

  async listarDetalle(f: FiltroReservas): Promise<ReservaDetalle[]> {
    const lista: ReservaDetalle[] = [];
    for (const r of this.datos.reservas) {
      const d = await this.obtenerDetalle(r.id);
      if (
        d &&
        (!f.destinoId || d.destino.id === f.destinoId) &&
        (!f.desde || d.fechaViaje >= f.desde) &&
        (!f.hasta || d.fechaViaje <= f.hasta) &&
        (!f.estadoReservaId || d.estadoReservaId === f.estadoReservaId) &&
        (!f.estadoPagoId || d.estadoPagoId === f.estadoPagoId)
      ) {
        lista.push(d);
      }
    }
    return lista.sort((a, b) => a.fechaViaje.localeCompare(b.fechaViaje));
  }

  async bloquearPorId(id: Uuid): Promise<Reserva | null> {
    const r = this.datos.reservas.find((x) => x.id === id);
    return r ? this.completar(r) : null;
  }

  async eliminar(id: Uuid): Promise<boolean> {
    const antes = this.datos.reservas.length;
    this.datos.reservas = this.datos.reservas.filter((r) => r.id !== id);
    this.datos.pagos = this.datos.pagos.filter((p) => p.reservaId !== id); // ON DELETE CASCADE
    this.datos.bitacora = this.datos.bitacora.filter((b) => b.reservaId !== id);
    return this.datos.reservas.length < antes;
  }

  private buscarPorCodigoYCorreo(codigo: string, correo: string): ReservaEnMemoria | undefined {
    const cliente = this.datos.clientes.find((c) => c.correo === correo);
    return this.datos.reservas.find(
      (r) => r.codigoConfirmacion === codigo && cliente !== undefined && r.clienteId === cliente.id,
    );
  }

  private completar(r: ReservaEnMemoria): Reserva {
    const destino = this.datos.destinos.find((d) => d.id === r.destinoId);
    return {
      id: r.id,
      codigoConfirmacion: r.codigoConfirmacion ?? 'VY-000000',
      clienteId: r.clienteId ?? '',
      destinoId: r.destinoId,
      estadoReservaId: r.estadoReservaId,
      fechaViaje: r.fechaViaje,
      cantidadPersonas: r.cantidadPersonas,
      precioBaseAplicadoCentimos: r.precioBaseAplicadoCentimos ?? destino?.precioBaseCentimos ?? 1,
      tasaIvaPorcentaje: r.tasaIvaPorcentaje ?? 13,
    };
  }
}

class ClienteRepositoryEnMemoria implements ClienteRepository {
  constructor(private readonly datos: DatosEnMemoria) {}

  async registrarOActualizar(d: DatosCliente): Promise<Uuid> {
    const existente = this.datos.clientes.find((c) => c.correo === d.correo);
    if (existente) {
      existente.nombre = d.nombre;
      existente.telefono = d.telefono;
      return existente.id;
    }
    const id = randomUUID();
    this.datos.clientes.push({ id, ...d });
    return id;
  }
}

class PagoRepositoryEnMemoria implements PagoRepository {
  constructor(private readonly datos: DatosEnMemoria) {}

  async registrar(d: PagoEnMemoria): Promise<void> {
    this.datos.pagos.push({ ...d });
  }

  async bloquearEstado(reservaId: Uuid): Promise<EstadoPagoId | null> {
    return this.datos.pagos.find((p) => p.reservaId === reservaId)?.estadoPagoId ?? null;
  }

  async actualizarEstado(reservaId: Uuid, estado: EstadoPagoId): Promise<void> {
    const pago = this.datos.pagos.find((p) => p.reservaId === reservaId);
    if (pago) pago.estadoPagoId = estado;
  }
}

class BitacoraRepositoryEnMemoria implements BitacoraRepository {
  constructor(private readonly datos: DatosEnMemoria) {}

  async registrar(e: EntradaBitacora): Promise<void> {
    this.datos.bitacora.push({ ...e });
  }
}

class AdministradorRepositoryEnMemoria implements AdministradorRepository {
  constructor(private readonly datos: DatosEnMemoria) {}

  async buscarPorCorreo(correo: string): Promise<Administrador | null> {
    return this.datos.administradores.find((a) => a.correo === correo) ?? null;
  }

  async guardar(d: { nombre: string; correo: string; passwordHash: string }): Promise<void> {
    this.datos.administradores.push({ id: `admin-${d.correo}`, activo: true, ...d });
  }
}

/**
 * Simula la transacción: guarda una copia de los datos y, si el trabajo lanza
 * un error, la restaura (equivalente al ROLLBACK de PgUnidadDeTrabajo).
 */
export class UnidadDeTrabajoEnMemoria implements UnidadDeTrabajo {
  readonly lectura: Repositorios;
  transaccionesAbiertas = 0;
  transaccionesRevertidas = 0;

  constructor(readonly datos = new DatosEnMemoria()) {
    this.lectura = {
      destinos: new DestinoRepositoryEnMemoria(datos),
      reservas: new ReservaRepositoryEnMemoria(datos),
      clientes: new ClienteRepositoryEnMemoria(datos),
      pagos: new PagoRepositoryEnMemoria(datos),
      bitacora: new BitacoraRepositoryEnMemoria(datos),
      administradores: new AdministradorRepositoryEnMemoria(datos),
    };
  }

  async ejecutar<T>(trabajo: (repos: Repositorios) => Promise<T>): Promise<T> {
    this.transaccionesAbiertas++;
    const copia = structuredClone({ ...this.datos });
    try {
      return await trabajo(this.lectura);
    } catch (error) {
      Object.assign(this.datos, copia);
      this.transaccionesRevertidas++;
      throw error;
    }
  }
}

/** Reloj detenido en una fecha fija (hora de Costa Rica si se usa el sufijo -06:00). */
export class RelojFijo implements Reloj {
  constructor(private instante: Date) {}
  ahora(): Date {
    return new Date(this.instante);
  }
  fijar(instante: Date): void {
    this.instante = instante;
  }
}

/** "Hash" reversible solo para pruebas: evita el costo de bcrypt. */
export class HasherFalso implements HasherContrasena {
  async hash(texto: string): Promise<string> {
    return `hash:${texto}`;
  }
  async comparar(texto: string, hash: string): Promise<boolean> {
    return hash === `hash:${texto}`;
  }
}

export class EmisorTokenFalso implements EmisorToken {
  emitir(sesion: SesionAdmin): string {
    return `token-de-${sesion.id}`;
  }
  verificar(token: string): SesionAdmin {
    return { id: token.replace('token-de-', ''), nombre: 'Prueba', correo: 'prueba@viajaya.cr' };
  }
}

/** Destino de ejemplo con los valores de los casos de prueba del SRS. */
export function destinoDePrueba(cambios: Partial<Destino> = {}): Destino {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    nombre: 'Parque Nacional Cahuita',
    descripcion: null,
    precioBaseCentimos: 4000,
    capacidadMaximaDiaria: 20,
    activo: true,
    ...cambios,
  };
}

/** Una reserva existente con su cliente, para las pruebas de CU-04 a CU-06. */
export function sembrarReserva(
  datos: DatosEnMemoria,
  r: Partial<ReservaEnMemoria> & { codigoConfirmacion: string; fechaViaje: FechaISO },
  correo = 'ana@correo.cr',
): ReservaEnMemoria {
  let cliente = datos.clientes.find((c) => c.correo === correo);
  if (!cliente) {
    cliente = { id: randomUUID(), nombre: 'Ana Mora', correo, telefono: '8888-0000' };
    datos.clientes.push(cliente);
  }
  const reserva: ReservaEnMemoria = {
    id: randomUUID(),
    destinoId: destinoDePrueba().id,
    cantidadPersonas: 3,
    estadoReservaId: EstadoReserva.Pendiente,
    clienteId: cliente.id,
    precioBaseAplicadoCentimos: 4000,
    tasaIvaPorcentaje: 13,
    ...r,
  };
  datos.reservas.push(reserva);
  return reserva;
}
