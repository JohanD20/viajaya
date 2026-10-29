import { expect } from 'chai';
import { CupoInsuficienteError, ReglaNegocioError } from '../../src/errors/errores';
import { EstadoPago, EstadoReserva } from '../../src/models/estados';
import { PagoSimuladoService } from '../../src/rules/PagoSimuladoService';
import { ReservaService, type SolicitudReserva } from '../../src/services/ReservaService';
import { RelojFijo, UnidadDeTrabajoEnMemoria, destinoDePrueba } from '../fakes/memoria';
import { esperarError } from '../utilidades';

describe('RF-03 · Reserva y pago simulado (ReservaService.crear, CU-03)', () => {
  const destino = destinoDePrueba(); // precio 40,00; capacidad 20
  let uow: UnidadDeTrabajoEnMemoria;
  let codigos: string[];
  let servicio: ReservaService;

  const solicitud = (cambios: Partial<SolicitudReserva> = {}): SolicitudReserva => ({
    destinoId: destino.id,
    fecha: '2026-11-20',
    personas: 3,
    cliente: { nombre: 'Ana Mora', correo: 'ana@correo.cr', telefono: '8888-0000' },
    numeroTarjeta: '4111111111111112',
    ...cambios,
  });

  beforeEach(() => {
    uow = new UnidadDeTrabajoEnMemoria();
    uow.datos.destinos.push(destino);
    // 17 personas ya reservadas: quedan 3 espacios (mismo escenario que UT-RN01).
    uow.datos.reservas.push({
      id: 'previa',
      destinoId: destino.id,
      fechaViaje: '2026-11-20',
      cantidadPersonas: 17,
      estadoReservaId: EstadoReserva.Aprobada,
      codigoConfirmacion: 'VY-PREV22',
    });
    codigos = ['VY-PREV22', 'VY-ABC234']; // el primero ya existe → se reintenta (flujo 8a)
    servicio = new ReservaService({
      uow,
      reloj: new RelojFijo(new Date('2026-11-01T10:00:00-06:00')),
      pasarela: new PagoSimuladoService(),
      generadorCodigo: { generar: () => codigos.shift() ?? 'VY-ZZZ999' },
    });
  });

  it('UT-RF03-a: con cupo y tarjeta par registra la reserva Pendiente, el pago Aprobado, el código único y la bitácora', async () => {
    const reserva = await servicio.crear(solicitud());

    expect(reserva.codigoConfirmacion).to.equal('VY-ABC234');
    expect(reserva.estadoReservaId).to.equal(EstadoReserva.Pendiente);
    expect(reserva.estadoPagoId).to.equal(EstadoPago.Aprobado);
    expect(reserva.totalCentimos).to.equal(13560); // RN-03: (40 × 3) × 1,13
    expect(reserva.tarjetaUltimos4).to.equal('1112'); // RNF-05: solo 4 dígitos
    expect(uow.datos.bitacora.map((b) => b.accion)).to.deep.equal(['CREADA']);
    expect(await uow.lectura.reservas.sumarPersonasActivas(destino.id, '2026-11-20')).to.equal(20);
    expect(uow.transaccionesAbiertas).to.equal(1);
  });

  it('UT-RF03-b: sin cupo suficiente (RN-01) responde 409, revierte la transacción y no guarda nada', async () => {
    const error = await esperarError(servicio.crear(solicitud({ personas: 4 })), CupoInsuficienteError);

    expect(error.disponibles).to.equal(3);
    expect(uow.transaccionesRevertidas).to.equal(1);
    expect(uow.datos.reservas.length).to.equal(1); // solo la previa
    expect(uow.datos.clientes.length).to.equal(0);
    expect(uow.datos.pagos.length).to.equal(0);
  });

  it('con tarjeta impar registra igual la reserva con el pago Rechazado (SUP-03)', async () => {
    const reserva = await servicio.crear(solicitud({ numeroTarjeta: '4111111111111117' }));
    expect(reserva.estadoPagoId).to.equal(EstadoPago.Rechazado);
    expect(reserva.estadoReservaId).to.equal(EstadoReserva.Pendiente);
  });

  it('rechaza fechas que no son futuras (RC-02, flujo 5b) sin abrir transacción', async () => {
    await esperarError(servicio.crear(solicitud({ fecha: '2026-11-01' })), ReglaNegocioError);
    expect(uow.transaccionesAbiertas).to.equal(0);
  });
});
