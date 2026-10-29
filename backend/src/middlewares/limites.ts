import { rateLimit } from 'express-rate-limit';
import { enviarProblema } from './problema';

/**
 * Límites de intentos por IP (S-07) contra fuerza bruta. Requiere
 * app.set('trust proxy', 1) para leer la IP real detrás del balanceador de Render.
 */
function crearLimite(
  maximo: number,
  ventanaMs: number,
  detalle = 'Hizo demasiados intentos seguidos. Espere un minuto e intente de nuevo.',
) {
  return rateLimit({
    windowMs: ventanaMs,
    limit: maximo,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res) => {
      enviarProblema(req, res, 429, 'Demasiados intentos', detalle);
    },
  });
}

/** POST /api/auth/login: 5 intentos por minuto. */
export const crearLimiteLogin = () => crearLimite(5, 60_000);

/** Operaciones con código y correo (CU-04 a CU-06): 10 por minuto. */
export const crearLimiteConsultaReserva = () => crearLimite(10, 60_000);

/**
 * POST /api/reservas: 10 cada 10 minutos. Cada reserva envía un correo a la
 * dirección escrita, así que se limita para que nadie use el sitio para enviar
 * correos masivos a terceros.
 */
export const crearLimiteCreacionReserva = () =>
  crearLimite(10, 10 * 60_000, 'Hizo demasiadas reservas seguidas. Espere unos minutos e intente de nuevo.');
