import { crearApp } from './app';
import { cargarConfig } from './config/env';
import { crearLogger } from './config/logger';
import { crearContenedor } from './container';

function iniciar(): void {
  let config;
  try {
    config = cargarConfig();
  } catch (error) {
    console.error((error as Error).message);
    process.exit(1);
  }

  const logger = crearLogger(config);
  if (config.entorno === 'production' && !config.baseDatos.certificadoCa) {
    logger.warn('DATABASE_CA no está definido: la conexión TLS no verifica el certificado del servidor.');
  }

  if (config.correo.proveedor === 'consola') {
    const aviso = 'CORREO_PROVEEDOR=consola: los correos al turista solo se registran en el log, no se envían.';
    if (config.entorno === 'production') logger.warn(aviso);
    else logger.info(aviso);
  } else {
    logger.info(`Correos al turista por ${config.correo.proveedor}.`);
  }

  const contenedor = crearContenedor(config, logger);
  const app = crearApp(contenedor, { origenesPermitidos: config.origenesPermitidos, logger });

  const servidor = app.listen(config.puerto, () => {
    logger.info(`API de ViajaYa escuchando en el puerto ${config.puerto} (${config.entorno})`);
  });

  const apagar = (senal: string) => {
    logger.info(`${senal} recibido, cerrando…`);
    servidor.close(() => {
      contenedor.cerrar().finally(() => process.exit(0));
    });
  };
  process.on('SIGTERM', () => apagar('SIGTERM'));
  process.on('SIGINT', () => apagar('SIGINT'));
}

iniciar();
