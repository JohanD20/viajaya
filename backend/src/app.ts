import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import type { Logger } from 'pino';
import { crearLoggerHttp } from './config/logger';
import type { Contenedor } from './container';
import { crearManejadorErrores, rutaNoEncontrada } from './middlewares/errores';
import { crearRouterApi } from './routes';

export interface OpcionesApp {
  origenesPermitidos: string[];
  logger: Logger;
}

/**
 * Arma la aplicación Express con sus dependencias ya resueltas. No lee
 * variables de entorno ni abre conexiones: eso lo hace server.ts. Así las
 * pruebas de integración pueden crear la app con un contenedor falso.
 */
export function crearApp(contenedor: Contenedor, opciones: OpcionesApp): Express {
  const app = express();

  app.set('trust proxy', 1); // Render pone un balanceador delante (IP real para S-07).
  app.disable('x-powered-by');
  app.use(helmet()); // S-08: cabeceras de seguridad
  app.use(
    cors({
      origin: opciones.origenesPermitidos, // S-08: solo el frontend
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      exposedHeaders: ['x-request-id'],
      maxAge: 600,
    }),
  );
  app.use(crearLoggerHttp(opciones.logger));
  app.use(express.json({ limit: '10kb' })); // S-03: cuerpos pequeños

  // Usado por Render como health check y para "despertar" el servicio antes de la demo.
  app.get('/api/salud', async (_req, res) => {
    await contenedor.verificarBaseDatos();
    res.json({ estado: 'ok' });
  });

  app.use('/api', crearRouterApi(contenedor));
  app.use(rutaNoEncontrada);
  app.use(crearManejadorErrores(opciones.logger));

  return app;
}
