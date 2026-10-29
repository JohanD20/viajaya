import { expect } from 'chai';
import { NoEncontradoError } from '../../src/errors/errores';
import { EstadoReserva } from '../../src/models/estados';
import { PagoSimuladoService } from '../../src/rules/PagoSimuladoService';
import { ReservaService } from '../../src/services/ReservaService';
import { RelojFijo, UnidadDeTrabajoEnMemoria, destinoDePrueba, sembrarReserva } from '../fakes/memoria';
import { esperarError } from '../utilidades';

describe('RF-04 · Consulta de reserva (ReservaService.consultar, CU-04)', () => {
  let servicio: ReservaService;

  beforeEach(() => {
    const uow = new UnidadDeTrabajoEnMemoria();
    uow.datos.destinos.push(destinoDePrueba());
    sembrarReserva(uow.datos, { codigoConfirmacion: 'VY-ABC234', fechaViaje: '2026-11-20' });
    sembrarReserva(uow.datos, {
      codigoConfirmacion: 'VY-CAN567',
      fechaViaje: '2026-11-25',
      estadoReservaId: EstadoReserva.Cancelada,
    });
    servicio = new ReservaService({
      uow,
      reloj: new RelojFijo(new Date('2026-11-01T10:00:00-06:00')),
      pasarela: new PagoSimuladoService(),
      generadorCodigo: { generar: () => 'VY-ZZZ999' },
    });
  });

  it('UT-RF04-a: con código y correo coincidentes devuelve la reserva con su desglose y si es modificable', async () => {
    const { reserva, modificable } = await servicio.consultar('VY-ABC234', 'ana@correo.cr');
    expect(reserva.destino.nombre).to.equal('Parque Nacional Cahuita');
    expect(reserva.totalCentimos).to.equal(13560);
    expect(modificable).to.equal(true);

    const cancelada = await servicio.consultar('VY-CAN567', 'ana@correo.cr');
    expect(cancelada.modificable).to.equal(false); // RC-05
  });

  it('UT-RF04-b: si el correo no coincide responde el mismo mensaje genérico que un código inexistente (RNF-06)', async () => {
    const correoAjeno = await esperarError(servicio.consultar('VY-ABC234', 'otro@correo.cr'), NoEncontradoError);
    const codigoInexistente = await esperarError(servicio.consultar('VY-NOEXIS', 'ana@correo.cr'), NoEncontradoError);
    expect(correoAjeno.message).to.equal(codigoInexistente.message);
  });
});
