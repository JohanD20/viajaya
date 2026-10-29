import {
  ConflictoError,
  DatosInvalidosError,
  NoEncontradoError,
  ReglaNegocioError,
} from '../errors/errores';
import type { DatosDestino, Destino, DestinoAdmin, FechaISO, FiltroDestinos, Uuid } from '../models/dominio';
import type { Reloj } from '../ports/servicios-externos';
import type { UnidadDeTrabajo } from '../ports/unidad-de-trabajo';
import { CupoService } from '../rules/CupoService';
import { esFechaFutura, hoyEnCostaRica } from '../shared/fechas';

export interface Disponibilidad {
  destinoId: Uuid;
  fecha: FechaISO;
  capacidadMaximaDiaria: number;
  personasReservadas: number;
  disponibles: number;
  personasSolicitadas: number;
  /** false → flujo 6a de CU-01: no se habilita "Cotizar". */
  alcanza: boolean;
}

/**
 * Casos de uso de destinos: CU-01 (turista) y CU-08 a CU-11 (administrador).
 * Depende solo de interfaces: UnidadDeTrabajo y Reloj (inyectadas por container.ts).
 */
export class DestinoService {
  constructor(
    private readonly uow: UnidadDeTrabajo,
    private readonly reloj: Reloj,
  ) {}

  /** CU-01 paso 2 · RC-01: solo destinos activos. */
  async listarActivos(): Promise<Destino[]> {
    return this.uow.lectura.destinos.listarActivos();
  }

  /** CU-01 pasos 4 a 6 · RN-01 en modo consulta (sin bloqueo). */
  async consultarDisponibilidad(
    destinoId: Uuid,
    fecha: FechaISO,
    personas: number,
  ): Promise<Disponibilidad> {
    if (!esFechaFutura(fecha, this.reloj.ahora())) {
      throw new DatosInvalidosError('La fecha del viaje debe ser futura.', [
        { campo: 'fecha', mensaje: 'Elija una fecha posterior a hoy.' },
      ]);
    }

    const destino = await this.uow.lectura.destinos.buscarPorId(destinoId);
    if (!destino) throw new NoEncontradoError('El destino no existe.');
    if (!destino.activo) throw new ReglaNegocioError('El destino ya no está disponible.');

    const personasReservadas = await this.uow.lectura.reservas.sumarPersonasActivas(
      destinoId,
      fecha,
    );
    const cupo = CupoService.verificar({
      capacidadMaximaDiaria: destino.capacidadMaximaDiaria,
      personasReservadas,
      personasSolicitadas: personas,
    });

    return {
      destinoId,
      fecha,
      capacidadMaximaDiaria: destino.capacidadMaximaDiaria,
      personasReservadas,
      disponibles: cupo.disponibles,
      personasSolicitadas: personas,
      alcanza: cupo.aceptado,
    };
  }

  // ------------------------------------------------------------ administración

  /** CU-09 · Todos los destinos, con sus reservas activas desde hoy. */
  async listarParaAdmin(filtro: FiltroDestinos): Promise<DestinoAdmin[]> {
    const { destinos, reservas } = this.uow.lectura;
    const hoy = hoyEnCostaRica(this.reloj.ahora());
    const lista = await destinos.listar(filtro);
    return Promise.all(
      lista.map(async (d) => ({ ...d, reservasActivasFuturas: await reservas.contarActivasDesde(d.id, hoy) })),
    );
  }

  /** CU-08 · Crear destino (queda Activo). */
  async crear(datos: DatosDestino): Promise<Destino> {
    return this.uow.ejecutar(async (repos) => {
      await this.exigirNombreLibre(repos.destinos.existeNombre(datos.nombre));
      return repos.destinos.crear(datos);
    });
  }

  /**
   * CU-10 · Editar destino, incluida su reactivación. Con el destino bloqueado
   * para que ninguna reserva entre mientras se valida RC-06.
   */
  async actualizar(id: Uuid, datos: DatosDestino & { activo: boolean }): Promise<Destino> {
    return this.uow.ejecutar(async (repos) => {
      const actual = await repos.destinos.bloquearPorId(id);
      if (!actual) throw new NoEncontradoError('El destino no existe.');
      await this.exigirNombreLibre(repos.destinos.existeNombre(datos.nombre, id));

      // RC-06: la capacidad no puede quedar por debajo de lo ya reservado en fechas futuras.
      if (datos.capacidadMaximaDiaria < actual.capacidadMaximaDiaria) {
        const pico = await repos.reservas.mayorOcupacionDesde(id, hoyEnCostaRica(this.reloj.ahora()));
        if (pico && pico.personas > datos.capacidadMaximaDiaria) {
          throw new ConflictoError(
            `No se puede bajar la capacidad a ${datos.capacidadMaximaDiaria}: el ${pico.fecha} ya hay ${pico.personas} personas reservadas.`,
            { fecha: pico.fecha, personasReservadas: pico.personas },
          );
        }
      }
      return repos.destinos.actualizar(id, datos);
    });
  }

  /** CU-11 · Desactivar destino (borrado lógico): conserva sus reservas. */
  async desactivar(id: Uuid): Promise<void> {
    await this.uow.ejecutar(async (repos) => {
      const destino = await repos.destinos.bloquearPorId(id);
      if (!destino) throw new NoEncontradoError('El destino no existe.');
      if (!destino.activo) throw new ConflictoError('El destino ya estaba inactivo.'); // flujo 4a
      await repos.destinos.cambiarActivo(id, false);
    });
  }

  private async exigirNombreLibre(existe: Promise<boolean>): Promise<void> {
    if (await existe) {
      throw new ConflictoError('Ya existe un destino con ese nombre.', {
        errores: [{ campo: 'nombre', mensaje: 'Ya existe un destino con ese nombre.' }],
      });
    }
  }
}
