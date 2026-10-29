import type { Administrador, Destino, FechaISO, SesionAdmin, Uuid } from '../../src/models/dominio';
import { type EstadoReservaId, esReservaActiva } from '../../src/models/estados';
import type {
  AdministradorRepository,
  DestinoRepository,
  Repositorios,
  ReservaRepository,
} from '../../src/ports/repositorios';
import type { EmisorToken, HasherContrasena, Reloj } from '../../src/ports/servicios-externos';
import type { UnidadDeTrabajo } from '../../src/ports/unidad-de-trabajo';

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
}

export class DatosEnMemoria {
  destinos: Destino[] = [];
  reservas: ReservaEnMemoria[] = [];
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

/** Ejecuta el trabajo sin transacción real; cuenta cuántas veces se abrió una. */
export class UnidadDeTrabajoEnMemoria implements UnidadDeTrabajo {
  readonly lectura: Repositorios;
  transaccionesAbiertas = 0;

  constructor(readonly datos = new DatosEnMemoria()) {
    this.lectura = {
      destinos: new DestinoRepositoryEnMemoria(datos),
      reservas: new ReservaRepositoryEnMemoria(datos),
      administradores: new AdministradorRepositoryEnMemoria(datos),
    };
  }

  async ejecutar<T>(trabajo: (repos: Repositorios) => Promise<T>): Promise<T> {
    this.transaccionesAbiertas++;
    return trabajo(this.lectura);
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
