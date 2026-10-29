import { DatosInvalidosError, NoEncontradoError, ReglaNegocioError } from '../errors/errores';
import type { Destino, FechaISO, Uuid } from '../models/dominio';
import type { Reloj } from '../ports/servicios-externos';
import type { UnidadDeTrabajo } from '../ports/unidad-de-trabajo';
import { CupoService } from '../rules/CupoService';
import { esFechaFutura } from '../shared/fechas';

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
 * Casos de uso de destinos: CU-01 (turista) y, en HU-04 a HU-07, CU-08 a CU-11.
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
}
