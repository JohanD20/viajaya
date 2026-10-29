import jwt from 'jsonwebtoken';
import { NoAutenticadoError } from '../errors/errores';
import type { SesionAdmin } from '../models/dominio';
import type { EmisorToken } from '../ports/servicios-externos';

const EMISOR = 'viajaya-api';
const AUDIENCIA = 'viajaya-admin';

/**
 * JWT firmado con HS256 (ADR-05, S-04). Al verificar se fija el algoritmo, el
 * emisor y la audiencia: un token firmado con otro algoritmo (por ejemplo
 * "none") o para otro sistema se rechaza.
 */
export class EmisorTokenJwt implements EmisorToken {
  constructor(
    private readonly secreto: string,
    private readonly expiraSegundos: number,
  ) {}

  emitir(sesion: SesionAdmin): string {
    return jwt.sign({ nombre: sesion.nombre, correo: sesion.correo }, this.secreto, {
      algorithm: 'HS256',
      subject: sesion.id,
      issuer: EMISOR,
      audience: AUDIENCIA,
      expiresIn: this.expiraSegundos,
    });
  }

  verificar(token: string): SesionAdmin {
    try {
      const datos = jwt.verify(token, this.secreto, {
        algorithms: ['HS256'],
        issuer: EMISOR,
        audience: AUDIENCIA,
      });
      if (typeof datos === 'string' || !datos.sub) throw new Error('Token sin sujeto');
      return {
        id: datos.sub,
        nombre: String(datos['nombre'] ?? ''),
        correo: String(datos['correo'] ?? ''),
      };
    } catch {
      throw new NoAutenticadoError('Sesión inválida o vencida. Inicie sesión de nuevo.');
    }
  }
}
