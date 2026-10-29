import { expect } from 'chai';
import { DatosInvalidosError, ReglaNegocioError } from '../../src/errors/errores';
import { EstadoReserva } from '../../src/models/estados';
import { DestinoService } from '../../src/services/DestinoService';
import { RelojFijo, UnidadDeTrabajoEnMemoria, destinoDePrueba } from '../fakes/memoria';
import { esperarError } from '../utilidades';

describe('RF-01 · Búsqueda de destinos y disponibilidad (DestinoService, CU-01)', () => {
  const hoy = new Date('2026-11-01T10:00:00-06:00');
  const destino = destinoDePrueba();
  let uow: UnidadDeTrabajoEnMemoria;
  let servicio: DestinoService;

  beforeEach(() => {
    uow = new UnidadDeTrabajoEnMemoria();
    uow.datos.destinos.push(
      destino,
      destinoDePrueba({ id: '22222222-2222-4222-8222-222222222222', nombre: 'Inactivo', activo: false }),
    );
    uow.datos.reservas.push(
      { id: 'r1', destinoId: destino.id, fechaViaje: '2026-11-20', cantidadPersonas: 10, estadoReservaId: EstadoReserva.Pendiente },
      { id: 'r2', destinoId: destino.id, fechaViaje: '2026-11-20', cantidadPersonas: 7, estadoReservaId: EstadoReserva.Aprobada },
      { id: 'r3', destinoId: destino.id, fechaViaje: '2026-11-20', cantidadPersonas: 5, estadoReservaId: EstadoReserva.Cancelada },
    );
    // Inyección de dependencias: el servicio recibe dobles en memoria.
    servicio = new DestinoService(uow, new RelojFijo(hoy));
  });

  it('UT-RF01: lista solo destinos activos y calcula el cupo sin contar reservas canceladas', async () => {
    const activos = await servicio.listarActivos();
    expect(activos.map((d) => d.nombre)).to.deep.equal(['Parque Nacional Cahuita']);

    const disponibilidad = await servicio.consultarDisponibilidad(destino.id, '2026-11-20', 3);
    expect(disponibilidad.personasReservadas).to.equal(17); // 10 + 7; la cancelada no cuenta
    expect(disponibilidad.disponibles).to.equal(3);
    expect(disponibilidad.alcanza).to.equal(true);

    const sinCupo = await servicio.consultarDisponibilidad(destino.id, '2026-11-20', 4);
    expect(sinCupo.alcanza).to.equal(false);
  });

  it('rechaza fechas que no son futuras (RC-02) y destinos inactivos (RC-01)', async () => {
    await esperarError(servicio.consultarDisponibilidad(destino.id, '2026-11-01', 2), DatosInvalidosError);
    await esperarError(
      servicio.consultarDisponibilidad('22222222-2222-4222-8222-222222222222', '2026-11-20', 2),
      ReglaNegocioError,
    );
  });
});
