import type { RequestHandler, Response } from 'express';
import { NoAutenticadoError } from '../errors/errores';
import type { SesionAdmin } from '../models/dominio';
import type { EmisorToken } from '../ports/servicios-externos';

/**
 * Verifica el JWT del administrador (RNF-03, S-04). Se monta UNA vez sobre todo
 * el router /api/admin, de modo que ninguna ruta de administración pueda quedar
 * sin protección por olvido. Responde 401 si el token falta, venció o es inválido.
 */
export function crearAutenticacionAdmin(emisor: EmisorToken): RequestHandler {
  return (req, res, next) => {
    const encabezado = req.get('authorization') ?? '';
    const [esquema, token] = encabezado.split(' ');
    if (esquema !== 'Bearer' || !token) {
      throw new NoAutenticadoError('Debe iniciar sesión para continuar.');
    }
    res.locals['admin'] = emisor.verificar(token);
    next();
  };
}

/** Administrador autenticado de la petición actual (para la bitácora). */
export function adminActual(res: Response): SesionAdmin {
  const admin = res.locals['admin'] as SesionAdmin | undefined;
  if (!admin) throw new NoAutenticadoError('Debe iniciar sesión para continuar.');
  return admin;
}
