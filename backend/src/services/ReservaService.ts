import { CupoInsuficienteError, NoEncontradoError, ReglaNegocioError } from '../errors/errores';
import type { FechaISO, Uuid } from '../models/dominio';
import type { GeneradorCodigo, PasarelaPago, Reloj } from '../ports/servicios-externos';
import type { UnidadDeTrabajo } from '../ports/unidad-de-trabajo';
import { CupoService } from '../rules/CupoService';
import { TarifaService, type Tarifa } from '../rules/TarifaService';
import { esFechaFutura } from '../shared/fechas';

export interface DependenciasReservaService {
  uow: UnidadDeTrabajo;
  reloj: Reloj;
  /** RN-04 · se usa en crear() (HU-10). */
  pasarela: PasarelaPago;
  /** Código VY-XXXXXX · se usa en crear() (HU-10). */
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

/**
 * Casos de uso del turista sobre reservas: CU-02 (cotizar) y, en el Sprint 2,
 * CU-03 crear, CU-04 consultar, CU-05 cambiar fecha y CU-06 cancelar.
 */
export class ReservaService {
  constructor(private readonly deps: DependenciasReservaService) {}

  /** CU-02 · RN-03 mediante CU-19. No reserva cupo ni guarda datos. */
  async cotizar({ destinoId, fecha, personas }: SolicitudCotizacion): Promise<Cotizacion> {
    if (!esFechaFutura(fecha, this.deps.reloj.ahora())) {
      throw new ReglaNegocioError('La fecha del viaje debe ser futura.');
    }

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

    const tarifa = TarifaService.calcular({
      precioBaseCentimos: destino.precioBaseCentimos,
      personas,
    });

    return {
      destino: { id: destino.id, nombre: destino.nombre },
      fecha,
      personas,
      precioBaseCentimos: destino.precioBaseCentimos,
      ...tarifa,
    };
  }

  // HU-10 · CU-03 crear(): uow.ejecutar(repos => bloquear destino, CupoService,
  //   TarifaService, deps.pasarela.procesar, deps.generadorCodigo.generar, guardar
  //   cliente, reserva, pago y bitácora). Ver diagrama de secuencia CU-03 del SAD.
}
