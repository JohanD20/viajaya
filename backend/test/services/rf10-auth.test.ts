import { expect } from 'chai';
import { NoAutenticadoError } from '../../src/errors/errores';
import { AuthService } from '../../src/services/AuthService';
import { EmisorTokenFalso, HasherFalso, UnidadDeTrabajoEnMemoria } from '../fakes/memoria';
import { esperarError } from '../utilidades';

describe('RF-10 · Inicio de sesión del administrador (AuthService, CU-07)', () => {
  let servicio: AuthService;

  beforeEach(() => {
    const uow = new UnidadDeTrabajoEnMemoria();
    uow.datos.administradores.push(
      { id: 'a1', nombre: 'Gestora', correo: 'gestora@viajaya.cr', passwordHash: 'hash:clave-segura-123', activo: true },
      { id: 'a2', nombre: 'Inactivo', correo: 'inactivo@viajaya.cr', passwordHash: 'hash:clave-segura-123', activo: false },
    );
    servicio = new AuthService(uow.lectura.administradores, new HasherFalso(), new EmisorTokenFalso());
  });

  it('emite un token con credenciales válidas (ignora mayúsculas en el correo)', async () => {
    const resultado = await servicio.iniciarSesion('Gestora@ViajaYa.cr', 'clave-segura-123');
    expect(resultado.token).to.equal('token-de-a1');
    expect(resultado.administrador).to.deep.equal({ id: 'a1', nombre: 'Gestora', correo: 'gestora@viajaya.cr' });
  });

  it('responde el mismo mensaje genérico para contraseña errónea, correo inexistente o cuenta inactiva', async () => {
    const intentos: Array<[string, string]> = [
      ['gestora@viajaya.cr', 'otra-clave'],
      ['nadie@viajaya.cr', 'clave-segura-123'],
      ['inactivo@viajaya.cr', 'clave-segura-123'],
    ];
    for (const [correo, password] of intentos) {
      const error = await esperarError(servicio.iniciarSesion(correo, password), NoAutenticadoError);
      expect(error.message).to.equal('Credenciales inválidas.');
    }
  });
});
