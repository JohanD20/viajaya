import { expect } from 'chai';
import { CupoInsuficienteError, VentanaVencidaError } from '../../src/errors/errores';
import { EstadoReserva } from '../../src/models/estados';
import { PagoSimuladoService } from '../../src/rules/PagoSimuladoService';
import { ReservaService } from '../../src/services/ReservaService';
import {
  RelojFijo,
  UnidadDeTrabajoEnMemoria,
  destinoDePrueba,
  sembrarReserva,
  type ReservaEnMemoria,
} from '../fakes/memoria';
import { esperarError } from '../utilidades';

describe('RF-05 · Modificación de fecha (ReservaService.cambiarFecha, CU-05)', () => {
  const destino = destinoDePrueba(); // capacidad 20
  let uow: UnidadDeTrabajoEnMemoria;
  let reloj: RelojFijo;
  let servicio: ReservaService;
  let propia: ReservaEnMemoria;

  beforeEach(() => {
    uow = new UnidadDeTrabajoEnMemoria();
    uow.datos.destinos.push(destino);
    propia = sembrarReserva(uow.datos, { codigoConfirmacion: 'VY-ABC234', fechaViaje: '2026-11-20', cantidadPersonas: 3 });
    // El 25/11 ya hay 17 personas de otros turistas: quedan exactamente 3 espacios.
    uow.datos.reservas.push({
      id: 'otra',
      destinoId: destino.id,
      fechaViaje: '2026-11-25',
      cantidadPersonas: 17,
      estadoReservaId: EstadoReserva.Aprobada,
    });
    reloj = new RelojFijo(new Date('2026-11-17T23:00:00-06:00')); // faltan 49 h para el 20/11
    servicio = new ReservaService({
      uow,
      reloj,
      pasarela: new PagoSimuladoService(),
      generadorCodigo: { generar: () => 'VY-ZZZ999' },
    });
  });

  it('UT-RF05-a: con más de 48 h y cupo en la nueva fecha mueve la reserva, conserva el monto y anota la bitácora', async () => {
    const reserva = await servicio.cambiarFecha('VY-ABC234', 'ana@correo.cr', '2026-11-25');

    expect(reserva.fechaViaje).to.equal('2026-11-25');
    expect(reserva.totalCentimos).to.equal(13560); // RC-04
    expect(await uow.lectura.reservas.sumarPersonasActivas(destino.id, '2026-11-20')).to.equal(0); // liberó el cupo
    expect(await uow.lectura.reservas.sumarPersonasActivas(destino.id, '2026-11-25')).to.equal(20);
    expect(uow.datos.bitacora[0]).to.deep.equal({
      reservaId: propia.id,
      administradorId: null,
      accion: 'FECHA_CAMBIADA',
      valorAnterior: '2026-11-20',
      valorNuevo: '2026-11-25',
    });
  });

  it('UT-RF05-b: sin cupo en la nueva fecha (RN-01) responde 409 y la reserva conserva su fecha', async () => {
    uow.datos.reservas.push({
      id: 'una-mas',
      destinoId: destino.id,
      fechaViaje: '2026-11-25',
      cantidadPersonas: 1,
      estadoReservaId: EstadoReserva.Pendiente,
    }); // ahora quedan 2 y la reserva es de 3
    const error = await esperarError(
      servicio.cambiarFecha('VY-ABC234', 'ana@correo.cr', '2026-11-25'),
      CupoInsuficienteError,
    );
    expect(error.disponibles).to.equal(2);
    expect(uow.datos.reservas.find((r) => r.id === propia.id)?.fechaViaje).to.equal('2026-11-20');
  });

  it('con 48 horas o menos (RN-02, CU-18) responde 422 sin cambios', async () => {
    reloj.fijar(new Date('2026-11-18T01:00:00-06:00')); // faltan 47 h
    await esperarError(servicio.cambiarFecha('VY-ABC234', 'ana@correo.cr', '2026-11-25'), VentanaVencidaError);
    expect(uow.datos.bitacora.length).to.equal(0);
  });
});
