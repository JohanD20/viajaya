import { expect } from 'chai';
import { CupoInsuficienteError } from '../../src/errors/errores';
import type { SesionAdmin } from '../../src/models/dominio';
import { EstadoReserva } from '../../src/models/estados';
import { PagoSimuladoService } from '../../src/rules/PagoSimuladoService';
import { AdminReservaService } from '../../src/services/AdminReservaService';
import { ReservaService, type SolicitudReserva } from '../../src/services/ReservaService';
import {
  NotificadorEnMemoria,
  RelojFijo,
  UnidadDeTrabajoEnMemoria,
  destinoDePrueba,
  sembrarReserva,
} from '../fakes/memoria';
import { esperarError } from '../utilidades';

describe('Correos al turista · cuándo se avisa (ReservaService y AdminReservaService)', () => {
  const destino = destinoDePrueba(); // capacidad 20
  const admin: SesionAdmin = { id: 'admin-1', nombre: 'Gestora', correo: 'gestora@viajaya.cr' };
  let uow: UnidadDeTrabajoEnMemoria;
  let notificador: NotificadorEnMemoria;
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
    notificador = new NotificadorEnMemoria(uow);
    servicio = new ReservaService({
      uow,
      reloj: new RelojFijo(new Date('2026-11-01T10:00:00-06:00')),
      pasarela: new PagoSimuladoService(),
      generadorCodigo: { generar: () => 'VY-ABC234' },
      notificador,
    });
  });

  it('UT-COR-01: al crear la reserva envía UN aviso CREADA al correo del turista, después del COMMIT', async () => {
    const reserva = await servicio.crear(solicitud());

    expect(notificador.enviados).to.have.length(1);
    const [aviso] = notificador.enviados;
    expect(aviso?.evento).to.equal('CREADA');
    expect(aviso?.reserva.codigoConfirmacion).to.equal(reserva.codigoConfirmacion);
    expect(aviso?.reserva.cliente.correo).to.equal('ana@correo.cr');
    expect(aviso?.dentroDeTransaccion).to.equal(false);
  });

  it('UT-COR-02: si la reserva se revierte por falta de cupo (RN-01), no se envía ningún correo', async () => {
    await esperarError(servicio.crear(solicitud({ personas: 21 })), CupoInsuficienteError);

    expect(uow.transaccionesRevertidas).to.equal(1);
    expect(notificador.enviados).to.have.length(0);
  });

  it('UT-COR-03: si el proveedor de correo falla, la reserva igual queda registrada y se responde con éxito', async () => {
    notificador.fallar = true;

    const reserva = await servicio.crear(solicitud());

    expect(reserva.codigoConfirmacion).to.equal('VY-ABC234');
    expect(uow.datos.reservas).to.have.length(1);
    expect(uow.transaccionesRevertidas).to.equal(0);
    expect(notificador.enviados).to.have.length(1); // se intentó
  });

  it('UT-COR-04: un notificador que falla de forma síncrona tampoco rompe la operación', async () => {
    servicio = new ReservaService({
      uow,
      reloj: new RelojFijo(new Date('2026-11-01T10:00:00-06:00')),
      pasarela: new PagoSimuladoService(),
      generadorCodigo: { generar: () => 'VY-ABC234' },
      notificador: {
        notificar: () => {
          throw new Error('error síncrono');
        },
      },
    });

    const reserva = await servicio.crear(solicitud());
    expect(reserva.codigoConfirmacion).to.equal('VY-ABC234');
  });

  it('UT-COR-05: al cambiar la fecha avisa con la fecha anterior y la nueva', async () => {
    sembrarReserva(uow.datos, { codigoConfirmacion: 'VY-XYZ789', fechaViaje: '2026-11-20' });

    await servicio.cambiarFecha('VY-XYZ789', 'ana@correo.cr', '2026-11-25');

    expect(notificador.enviados.map((n) => n.evento)).to.deep.equal(['FECHA_CAMBIADA']);
    expect(notificador.enviados[0]?.fechaAnterior).to.equal('2026-11-20');
    expect(notificador.enviados[0]?.reserva.fechaViaje).to.equal('2026-11-25');
  });

  it('UT-COR-06: distingue la cancelación del turista de la de la agencia, y avisa la aprobación', async () => {
    sembrarReserva(uow.datos, { codigoConfirmacion: 'VY-TUR234', fechaViaje: '2026-11-20' });
    const deAgencia = sembrarReserva(uow.datos, { codigoConfirmacion: 'VY-AGE234', fechaViaje: '2026-11-21' });
    const aAprobar = sembrarReserva(uow.datos, { codigoConfirmacion: 'VY-APR234', fechaViaje: '2026-11-22' });
    const adminServicio = new AdminReservaService(uow, notificador);

    await servicio.cancelar('VY-TUR234', 'ana@correo.cr');
    await adminServicio.cancelar(deAgencia.id, admin);
    await adminServicio.aprobar(aAprobar.id, admin);

    expect(notificador.enviados.map((n) => [n.evento, n.reserva.codigoConfirmacion])).to.deep.equal([
      ['CANCELADA_POR_TURISTA', 'VY-TUR234'],
      ['CANCELADA_POR_AGENCIA', 'VY-AGE234'],
      ['APROBADA', 'VY-APR234'],
    ]);
    expect(notificador.enviados.every((n) => !n.dentroDeTransaccion)).to.equal(true);
  });

  it('UT-COR-07: sin notificador inyectado los servicios funcionan igual (no se envía nada)', async () => {
    const sinCorreo = new AdminReservaService(uow);
    const r = sembrarReserva(uow.datos, { codigoConfirmacion: 'VY-SIN234', fechaViaje: '2026-11-20' });

    const aprobada = await sinCorreo.aprobar(r.id, admin);

    expect(aprobada.estadoReservaId).to.equal(EstadoReserva.Aprobada);
    expect(notificador.enviados).to.have.length(0);
  });
});
