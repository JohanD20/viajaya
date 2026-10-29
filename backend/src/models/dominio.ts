/**
 * Entidades del dominio (Glosario 1.0, SAD 3.5).
 * Los montos se manejan SIEMPRE en céntimos enteros dentro del backend para
 * evitar errores de punto flotante en RN-03; solo se convierten a decimales
 * al responder por HTTP (controllers/presentadores.ts).
 */

export type Uuid = string;

/** Fecha de calendario sin hora, formato 'AAAA-MM-DD' (tipo `date` de PostgreSQL). */
export type FechaISO = string;

export interface Destino {
  id: Uuid;
  nombre: string;
  descripcion: string | null;
  precioBaseCentimos: number;
  capacidadMaximaDiaria: number;
  activo: boolean;
}

export interface Administrador {
  id: Uuid;
  nombre: string;
  correo: string;
  passwordHash: string;
  activo: boolean;
}

/** Datos del administrador que viajan dentro del token JWT (sin secretos). */
export interface SesionAdmin {
  id: Uuid;
  nombre: string;
  correo: string;
}
