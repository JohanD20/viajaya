import { expect } from 'chai';
import { ConflictoError, NoEncontradoError } from '../../src/errors/errores';
import { EstadoReserva } from '../../src/models/estados';
import { DestinoService } from '../../src/services/DestinoService';
import { RelojFijo, UnidadDeTrabajoEnMemoria, destinoDePrueba } from '../fakes/memoria';
import { esperarError } from '../utilidades';

describe('RF-07 · CRUD de destinos (DestinoService, CU-08 a CU-11)', () => {
  const cahuita = destinoDePrueba(); // capacidad 20
  let uow: UnidadDeTrabajoEnMemoria;
  let servicio: DestinoService;

  beforeEach(() => {
    uow = new UnidadDeTrabajoEnMemoria();
    uow.datos.destinos.push({ ...cahuita });
    uow.datos.reservas.push(
      { id: 'r1', destinoId: cahuita.id, fechaViaje: '2026-11-20', cantidadPersonas: 12, estadoReservaId: EstadoReserva.Aprobada },
      { id: 'r2', destinoId: cahuita.id, fechaViaje: '2026-11-21', cantidadPersonas: 5, estadoReservaId: EstadoReserva.Pendiente },
      { id: 'r3', destinoId: cahuita.id, fechaViaje: '2026-10-01', cantidadPersonas: 19, estadoReservaId: EstadoReserva.Aprobada }, // pasada
    );
    servicio = new DestinoService(uow, new RelojFijo(new Date('2026-11-01T10:00:00-06:00')));
  });

  const datos = { nombre: 'Volcán Poás', descripcion: null, precioBaseCentimos: 3500, capacidadMaximaDiaria: 30 };

  it('CU-08: crea un destino activo y rechaza nombres duplicados sin distinguir mayúsculas', async () => {
    const creado = await servicio.crear(datos);
    expect(creado.activo).to.equal(true);
    await esperarError(servicio.crear({ ...datos, nombre: 'volcán poás' }), ConflictoError);
  });

  it('CU-09: lista activos e inactivos con sus reservas activas desde hoy', async () => {
    await servicio.crear(datos);
    await servicio.desactivar(cahuita.id);
    const todos = await servicio.listarParaAdmin({});
    expect(todos.length).to.equal(2);
    expect(todos.find((d) => d.id === cahuita.id)?.reservasActivasFuturas).to.equal(2); // la pasada no cuenta
    expect((await servicio.listarParaAdmin({ activo: true })).map((d) => d.nombre)).to.deep.equal(['Volcán Poás']);
  });

  it('CU-10 · RC-06: no deja bajar la capacidad por debajo de lo ya reservado en una fecha futura', async () => {
    const error = await esperarError(
      servicio.actualizar(cahuita.id, { ...cahuita, capacidadMaximaDiaria: 10, activo: true }),
      ConflictoError,
    );
    expect(error.message).to.equal('No se puede bajar la capacidad a 10: el 2026-11-20 ya hay 12 personas reservadas.');

    const editado = await servicio.actualizar(cahuita.id, { ...cahuita, capacidadMaximaDiaria: 12, activo: true });
    expect(editado.capacidadMaximaDiaria).to.equal(12);
  });

  it('CU-11: desactiva (borrado lógico) conservando las reservas; desactivar dos veces responde 409', async () => {
    await servicio.desactivar(cahuita.id);
    expect(uow.datos.destinos[0]?.activo).to.equal(false);
    expect(uow.datos.reservas.length).to.equal(3);
    await esperarError(servicio.desactivar(cahuita.id), ConflictoError);
    await esperarError(servicio.desactivar('99999999-9999-4999-8999-999999999999'), NoEncontradoError);
  });
});
