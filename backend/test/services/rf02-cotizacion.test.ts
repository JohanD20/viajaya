import { expect } from 'chai';
import { CupoInsuficienteError, NoEncontradoError } from '../../src/errors/errores';
import { EstadoReserva } from '../../src/models/estados';
import { PagoSimuladoService } from '../../src/rules/PagoSimuladoService';
import { ReservaService } from '../../src/services/ReservaService';
import { RelojFijo, UnidadDeTrabajoEnMemoria, destinoDePrueba } from '../fakes/memoria';
import { esperarError } from '../utilidades';

describe('RF-02 · Cotización (ReservaService.cotizar, CU-02)', () => {
  const destino = destinoDePrueba();
  let servicio: ReservaService;

  beforeEach(() => {
    const uow = new UnidadDeTrabajoEnMemoria();
    uow.datos.destinos.push(destino);
    uow.datos.reservas.push({
      id: 'r1',
      destinoId: destino.id,
      fechaViaje: '2026-11-20',
      cantidadPersonas: 17,
      estadoReservaId: EstadoReserva.Pendiente,
    });
    servicio = new ReservaService({
      uow,
      reloj: new RelojFijo(new Date('2026-11-01T10:00:00-06:00')),
      pasarela: new PagoSimuladoService(),
      generadorCodigo: { generar: () => 'VY-ABC234' },
    });
  });

  it('UT-RF02: muestra el desglose de precio base, subtotal, IVA y monto total', async () => {
    const cotizacion = await servicio.cotizar({ destinoId: destino.id, fecha: '2026-11-20', personas: 3 });
    expect(cotizacion.destino.nombre).to.equal('Parque Nacional Cahuita');
    expect(cotizacion.precioBaseCentimos).to.equal(4000);
    expect(cotizacion.subtotalCentimos).to.equal(12000);
    expect(cotizacion.ivaCentimos).to.equal(1560);
    expect(cotizacion.totalCentimos).to.equal(13560);
  });

  it('no cotiza si ya no hay cupo (409) ni si el destino no existe (404)', async () => {
    const error = await esperarError(
      servicio.cotizar({ destinoId: destino.id, fecha: '2026-11-20', personas: 4 }),
      CupoInsuficienteError,
    );
    expect(error.disponibles).to.equal(3);
    await esperarError(
      servicio.cotizar({ destinoId: '99999999-9999-4999-8999-999999999999', fecha: '2026-11-20', personas: 1 }),
      NoEncontradoError,
    );
  });
});
