import { crearPool } from './config/db';
import type { Config } from './config/env';
import { EmisorTokenJwt } from './infra/EmisorTokenJwt';
import { GeneradorCodigoAleatorio } from './infra/GeneradorCodigoAleatorio';
import { HasherBcrypt } from './infra/HasherBcrypt';
import { RelojSistema } from './infra/RelojSistema';
import type { EmisorToken } from './ports/servicios-externos';
import { PgUnidadDeTrabajo } from './repositories/pg/PgUnidadDeTrabajo';
import { PagoSimuladoService } from './rules/PagoSimuladoService';
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
export function crearContenedor(config: Config): Contenedor {
  // ---- Infraestructura ----
  const pool = crearPool(config);
  const uow = new PgUnidadDeTrabajo(pool);
  const reloj = new RelojSistema();
  const pasarela = new PagoSimuladoService();
  const generadorCodigo = new GeneradorCodigoAleatorio();
  const hasher = new HasherBcrypt(config.bcryptCosto);
  const emisorToken = new EmisorTokenJwt(config.jwt.secreto, config.jwt.expiraSegundos);

  // ---- Servicios de casos de uso ----
  return {
    destinoService: new DestinoService(uow, reloj),
    reservaService: new ReservaService({ uow, reloj, pasarela, generadorCodigo }),
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
