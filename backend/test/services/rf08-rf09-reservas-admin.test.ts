import { expect } from 'chai';
import { ConflictoError, DatosInvalidosError, ReservaNoActivaError } from '../../src/errors/errores';
import type { SesionAdmin } from '../../src/models/dominio';
import { EstadoPago, EstadoReserva } from '../../src/models/estados';
import { AdminReservaService } from '../../src/services/AdminReservaService';
import { UnidadDeTrabajoEnMemoria, destinoDePrueba, sembrarReserva, type ReservaEnMemoria } from '../fakes/memoria';
import { esperarError } from '../utilidades';

describe('RF-08 y RF-09 · Gestión de reservas y pagos (AdminReservaService, CU-12 a CU-16)', () => {
  const admin: SesionAdmin = { id: 'admin-1', nombre: 'Gestora', correo: 'gestora@viajaya.cr' };
  let uow: UnidadDeTrabajoEnMemoria;
  let servicio: AdminReservaService;
  let reserva: ReservaEnMemoria;

  beforeEach(() => {
    uow = new UnidadDeTrabajoEnMemoria();
    uow.datos.destinos.push(destinoDePrueba());
    reserva = sembrarReserva(uow.datos, { codigoConfirmacion: 'VY-ABC234', fechaViaje: '2026-11-20' });
    uow.datos.pagos.push({ reservaId: reserva.id, estadoPagoId: EstadoPago.Rechazado, ultimos4: '1117' });
    servicio = new AdminReservaService(uow);
  });

  it('CU-12: lista las reservas filtrando por estado de pago', async () => {
    expect((await servicio.listar({ estadoPagoId: EstadoPago.Rechazado })).length).to.equal(1);
    expect((await servicio.listar({ estadoPagoId: EstadoPago.Aprobado })).length).to.equal(0);
  });

  it('CU-13: aprueba una reserva pendiente y deja la acción en la bitácora con el administrador', async () => {
    const aprobada = await servicio.aprobar(reserva.id, admin);
    expect(aprobada.estadoReservaId).to.equal(EstadoReserva.Aprobada);
    expect(uow.datos.bitacora[0]?.administradorId).to.equal('admin-1');
    await esperarError(servicio.aprobar(reserva.id, admin), ReservaNoActivaError); // ya no está Pendiente
  });

  it('CU-14: la agencia cancela sin la restricción de 48 horas (SUP-04) y no puede cancelar dos veces', async () => {
    const cancelada = await servicio.cancelar(reserva.id, admin);
    expect(cancelada.estadoReservaId).to.equal(EstadoReserva.Cancelada);
    await esperarError(servicio.cancelar(reserva.id, admin), ReservaNoActivaError);
  });

  it('CU-15: elimina solo si se escribe el código correcto, junto con su pago (cascada)', async () => {
    await esperarError(servicio.eliminar(reserva.id, 'VY-OTRO22'), DatosInvalidosError);
    expect(uow.datos.reservas.length).to.equal(1);
    await servicio.eliminar(reserva.id, 'vy-abc234');
    expect(uow.datos.reservas.length).to.equal(0);
    expect(uow.datos.pagos.length).to.equal(0);
  });

  it('CU-16: cambia el estado del pago con bitácora; mismo estado → 409; reserva cancelada → 409', async () => {
    const r = await servicio.actualizarPago(reserva.id, EstadoPago.Aprobado, admin);
    expect(r.estadoPagoId).to.equal(EstadoPago.Aprobado);
    expect(uow.datos.bitacora.at(-1)).to.deep.equal({
      reservaId: reserva.id,
      administradorId: 'admin-1',
      accion: 'PAGO_ACTUALIZADO',
      valorAnterior: 'Rechazado',
      valorNuevo: 'Aprobado',
    });
    await esperarError(servicio.actualizarPago(reserva.id, EstadoPago.Aprobado, admin), ConflictoError);
    await servicio.cancelar(reserva.id, admin);
    await esperarError(servicio.actualizarPago(reserva.id, EstadoPago.Pendiente, admin), ReservaNoActivaError);
  });
});
