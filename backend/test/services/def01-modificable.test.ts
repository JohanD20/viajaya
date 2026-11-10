import { expect } from 'chai';
import { PagoSimuladoService } from '../../src/rules/PagoSimuladoService';
import { ReservaService, type SolicitudReserva } from '../../src/services/ReservaService';
import { RelojFijo, UnidadDeTrabajoEnMemoria, destinoDePrueba } from '../fakes/memoria';

/**
 * DEF-01 · "modificable" (RN-02) debe calcularse en cada respuesta, no fijarse.
 * Antes, al crear o cambiar la fecha, la API devolvía siempre true aunque la
 * excursión fuera dentro de 48 horas.
 */
describe('DEF-01 · modificable según la ventana de 48 horas (ReservaService.esModificable)', () => {
  const destino = destinoDePrueba();
  // Domingo 1 de noviembre de 2026, 10:00 en Costa Rica.
  const reloj = new RelojFijo(new Date('2026-11-01T10:00:00-06:00'));
  let servicio: ReservaService;

  const solicitud = (fecha: string): SolicitudReserva => ({
    destinoId: destino.id,
    fecha,
    personas: 2,
    cliente: { nombre: 'Ana Mora', correo: 'ana@correo.cr', telefono: '8888-0000' },
    numeroTarjeta: '4111111111111112',
  });

  beforeEach(() => {
    const uow = new UnidadDeTrabajoEnMemoria();
    uow.datos.destinos.push(destino);
    let n = 0;
    servicio = new ReservaService({
      uow,
      reloj,
      pasarela: new PagoSimuladoService(),
      generadorCodigo: { generar: () => `VY-ABC23${n++}` },
    });
  });

  it('UT-DEF01-a: una reserva para mañana (48 h o menos) no es modificable al crearla', async () => {
    const reserva = await servicio.crear(solicitud('2026-11-02'));
    expect(servicio.esModificable(reserva)).to.equal(false);
  });

  it('UT-DEF01-b: una reserva con más de 48 h de anticipación sí es modificable', async () => {
    const reserva = await servicio.crear(solicitud('2026-11-20'));
    expect(servicio.esModificable(reserva)).to.equal(true);
  });

  it('UT-DEF01-c: al mover la fecha a mañana deja de ser modificable; cancelada nunca lo es', async () => {
    const r = await servicio.crear(solicitud('2026-11-20'));

    const movida = await servicio.cambiarFecha(r.codigoConfirmacion, 'ana@correo.cr', '2026-11-02');
    expect(servicio.esModificable(movida)).to.equal(false);

    const otra = await servicio.crear(solicitud('2026-11-25'));
    const cancelada = await servicio.cancelar(otra.codigoConfirmacion, 'ana@correo.cr');
    expect(servicio.esModificable(cancelada)).to.equal(false);
  });

  it('UT-DEF01-d: consultar usa el mismo cálculo', async () => {
    const r = await servicio.crear(solicitud('2026-11-02'));
    const { modificable } = await servicio.consultar(r.codigoConfirmacion, 'ana@correo.cr');
    expect(modificable).to.equal(servicio.esModificable(r));
  });
});
