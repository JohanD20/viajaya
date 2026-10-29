import type { ErrorRequestHandler, RequestHandler } from 'express';
import type { Logger } from 'pino';
import { ZodError } from 'zod';
import { ErrorDominio } from '../errors/errores';
import { enviarProblema } from './problema';

const CODIGOS_CONEXION = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ENOTFOUND',
  'ETIMEDOUT',
  'EAI_AGAIN',
  '57P01', // admin_shutdown
  '57P03', // cannot_connect_now
  '08000',
  '08001',
  '08003',
  '08006',
]);

function esErrorDeConexion(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const { code, message } = error as { code?: string; message?: string };
  return (
    (code !== undefined && CODIGOS_CONEXION.has(code)) ||
    /timeout exceeded when trying to connect|Connection terminated/i.test(message ?? '')
  );
}

/** 404 para rutas que no existen. */
export const rutaNoEncontrada: RequestHandler = (req, res) => {
  enviarProblema(req, res, 404, 'No encontrado', 'La ruta solicitada no existe.');
};

/**
 * Traduce cualquier error a problem+json. Nunca envía stack traces ni mensajes
 * internos al cliente (S-10); los errores inesperados se registran en el log.
 */
export function crearManejadorErrores(logger: Logger): ErrorRequestHandler {
  return (error, req, res, next) => {
    if (res.headersSent) {
      next(error);
      return;
    }

    if (error instanceof ZodError) {
      const errores = error.issues.map((i) => ({
        campo: i.path.map(String).join('.') || '(cuerpo)',
        mensaje: i.message,
      }));
      enviarProblema(req, res, 400, 'Datos inválidos', 'Revise los campos marcados.', { errores });
      return;
    }

    if (error instanceof ErrorDominio) {
      enviarProblema(req, res, error.estadoHttp, error.titulo, error.message, error.extras);
      return;
    }

    if (esErrorDeConexion(error)) {
      logger.error({ err: error }, 'Base de datos no disponible');
      enviarProblema(req, res, 503, 'Servicio no disponible', 'Servicio no disponible, intente de nuevo.');
      return;
    }

    const tipo = (error as { type?: string }).type;
    if (tipo === 'entity.parse.failed') {
      enviarProblema(req, res, 400, 'Datos inválidos', 'El cuerpo de la petición no es JSON válido.');
      return;
    }
    if (tipo === 'entity.too.large') {
      enviarProblema(req, res, 413, 'Petición demasiado grande', 'El cuerpo supera el tamaño permitido.');
      return;
    }

    logger.error({ err: error }, 'Error no controlado');
    enviarProblema(req, res, 500, 'Error interno', 'Ocurrió un error inesperado. Intente de nuevo.');
  };
}
