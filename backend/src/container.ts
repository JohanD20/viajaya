import { crearPool } from './config/db';
import type { Config, ConfigCorreo } from './config/env';
import { NotificadorCorreo } from './infra/correo/NotificadorCorreo';
import {
  ProveedorBrevo,
  ProveedorConsola,
  ProveedorResend,
  type ProveedorCorreo,
  type Registro,
} from './infra/correo/proveedores';
import { EmisorTokenJwt } from './infra/EmisorTokenJwt';
import { GeneradorCodigoAleatorio } from './infra/GeneradorCodigoAleatorio';
import { HasherBcrypt } from './infra/HasherBcrypt';
import { RelojSistema } from './infra/RelojSistema';
import type { EmisorToken } from './ports/servicios-externos';
import { PgUnidadDeTrabajo } from './repositories/pg/PgUnidadDeTrabajo';
import { PagoSimuladoService } from './rules/PagoSimuladoService';
import { AdminReservaService } from './services/AdminReservaService';
import { AuthService } from './services/AuthService';
import { DestinoService } from './services/DestinoService';
import { ReservaService } from './services/ReservaService';

/**
 * Lo que la capa HTTP necesita. Las pruebas pueden construir un Contenedor con
 * dobles en memoria y pasarlo a crearApp() sin tocar la base de datos.
 */
export interface Contenedor {
  destinoService: DestinoService;
  reservaService: ReservaService;
  adminReservaService: AdminReservaService;
  authService: AuthService;
  emisorToken: EmisorToken;
  verificarBaseDatos(): Promise<void>;
  cerrar(): Promise<void>;
}

/**
 * RAÍZ DE COMPOSICIÓN (IoC). Es el ÚNICO archivo que conoce las clases concretas
 * (pg, bcrypt, jsonwebtoken, reloj del sistema). Todo lo demás recibe interfaces
 * por constructor. Para cambiar una implementación (por ejemplo, una pasarela de
 * pago real) se cambia una línea aquí y ningún servicio se modifica.
 */
export function crearContenedor(config: Config, registro: Registro): Contenedor {
  // ---- Infraestructura ----
  const pool = crearPool(config);
  const uow = new PgUnidadDeTrabajo(pool);
  const reloj = new RelojSistema();
  const pasarela = new PagoSimuladoService();
  const generadorCodigo = new GeneradorCodigoAleatorio();
  const hasher = new HasherBcrypt(config.bcryptCosto);
  const emisorToken = new EmisorTokenJwt(config.jwt.secreto, config.jwt.expiraSegundos);
  const notificador = new NotificadorCorreo(
    crearProveedorCorreo(config.correo, registro, config.entorno === 'development'),
    config.correo.sitioUrl,
    registro,
  );

  // ---- Servicios de casos de uso ----
  return {
    destinoService: new DestinoService(uow, reloj),
    reservaService: new ReservaService({ uow, reloj, pasarela, generadorCodigo, notificador }),
    adminReservaService: new AdminReservaService(uow, notificador),
    authService: new AuthService(uow.lectura.administradores, hasher, emisorToken),
    emisorToken,
    async verificarBaseDatos() {
      await pool.query('SELECT 1');
    },
    async cerrar() {
      await pool.end();
    },
  };
}

/** Elige el proveedor de correo según CORREO_PROVEEDOR (consola, brevo o resend). */
function crearProveedorCorreo(c: ConfigCorreo, registro: Registro, mostrarContenido: boolean): ProveedorCorreo {
  switch (c.proveedor) {
    case 'brevo':
      return new ProveedorBrevo(c.apiKey, c.remitente);
    case 'resend':
      return new ProveedorResend(c.apiKey, c.remitente);
    case 'consola':
      return new ProveedorConsola(registro, mostrarContenido);
  }
}
