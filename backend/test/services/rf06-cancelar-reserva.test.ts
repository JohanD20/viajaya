import { expect } from 'chai';
import { ReservaNoActivaError, VentanaVencidaError } from '../../src/errors/errores';
import { EstadoReserva } from '../../src/models/estados';
import { PagoSimuladoService } from '../../src/rules/PagoSimuladoService';
import { ReservaService } from '../../src/services/ReservaService';
import { RelojFijo, UnidadDeTrabajoEnMemoria, destinoDePrueba, sembrarReserva } from '../fakes/memoria';
import { esperarError } from '../utilidades';

describe('RF-06 · Cancelación de reserva (ReservaService.cancelar, CU-06)', () => {
  const destino = destinoDePrueba();
  let uow: UnidadDeTrabajoEnMemoria;
  let reloj: RelojFijo;
  let servicio: ReservaService;

  beforeEach(() => {
    uow = new UnidadDeTrabajoEnMemoria();
    uow.datos.destinos.push(destino);
    sembrarReserva(uow.datos, { codigoConfirmacion: 'VY-ABC234', fechaViaje: '2026-11-20', cantidadPersonas: 3 });
    reloj = new RelojFijo(new Date('2026-11-17T23:00:00-06:00')); // faltan 49 h
    servicio = new ReservaService({
      uow,
      reloj,
      pasarela: new PagoSimuladoService(),
      generadorCodigo: { generar: () => 'VY-ZZZ999' },
    });
  });

  it('UT-RF06-a: con más de 48 h cancela la reserva, libera el cupo y lo anota en la bitácora', async () => {
    const reserva = await servicio.cancelar('VY-ABC234', 'ana@correo.cr');

    expect(reserva.estadoReservaId).to.equal(EstadoReserva.Cancelada);
    expect(await uow.lectura.reservas.sumarPersonasActivas(destino.id, '2026-11-20')).to.equal(0);
    expect(uow.datos.bitacora.map((b) => [b.accion, b.valorAnterior, b.valorNuevo])).to.deep.equal([
      ['CANCELADA', 'Pendiente', 'Cancelada'],
    ]);
  });

  it('UT-RF06-b: con 48 horas o menos (RN-02) responde 422 y la reserva sigue activa', async () => {
    reloj.fijar(new Date('2026-11-18T01:00:00-06:00')); // faltan 47 h
    await esperarError(servicio.cancelar('VY-ABC234', 'ana@correo.cr'), VentanaVencidaError);
    expect(uow.datos.reservas[0]?.estadoReservaId).to.equal(EstadoReserva.Pendiente);
  });

  it('una reserva ya cancelada no se puede volver a cancelar (RC-05, 409)', async () => {
    await servicio.cancelar('VY-ABC234', 'ana@correo.cr');
    await esperarError(servicio.cancelar('VY-ABC234', 'ana@correo.cr'), ReservaNoActivaError);
  });
});
