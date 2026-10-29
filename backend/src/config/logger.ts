import { randomUUID } from 'node:crypto';
import pino, { type Logger } from 'pino';
import pinoHttp from 'pino-http';
import type { Config } from './env';

/**
 * Logs en JSON con nivel, ruta, código, duración e id de correlación (SAD 4).
 * S-11: nunca se registran contraseñas, tarjetas, tokens ni correos.
 */
export function crearLogger(config: Pick<Config, 'logNivel' | 'entorno'>): Logger {
  return pino({
    level: config.entorno === 'test' ? 'silent' : config.logNivel,
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        '*.password',
        '*.numeroTarjeta',
        '*.correo',
        '*.token',
      ],
      censor: '[oculto]',
    },
    ...(config.entorno === 'development'
      ? { transport: { target: 'pino-pretty', options: { colorize: true } } }
      : {}),
  });
}

export function crearLoggerHttp(logger: Logger) {
  return pinoHttp({
    logger,
    genReqId: (req, res) => {
      const recibido = req.headers['x-request-id'];
      const id = typeof recibido === 'string' && recibido.length <= 64 ? recibido : randomUUID();
      res.setHeader('x-request-id', id);
      return id;
    },
    customLogLevel: (_req, res, error) =>
      error || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
    serializers: {
      // Solo método y ruta: la query de esta API no lleva datos personales (RNF-06).
      req: (req: { id: string; method: string; url: string }) => ({
        id: req.id,
        metodo: req.method,
        ruta: req.url,
      }),
      res: (res: { statusCode: number }) => ({ estado: res.statusCode }),
    },
  });
}
