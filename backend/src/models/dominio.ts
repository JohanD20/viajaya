/**
 * Entidades del dominio (Glosario 1.0, SAD 3.5).
 * Los montos se manejan SIEMPRE en céntimos enteros dentro del backend para
 * evitar errores de punto flotante en RN-03; solo se convierten a decimales
 * al responder por HTTP (controllers/presentadores.ts).
 */

import type { EstadoPagoId, EstadoReservaId } from './estados';

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

/** Registro de cliente: datos de contacto del turista, sin cuenta ni contraseña (SAD 3.5). */
export interface DatosCliente {
  nombre: string;
  correo: string;
  telefono: string;
}

/** Fila de la tabla reservas (sin montos: se derivan, ADR-11). */
export interface Reserva {
  id: Uuid;
  codigoConfirmacion: string;
  clienteId: Uuid;
  destinoId: Uuid;
  estadoReservaId: EstadoReservaId;
  fechaViaje: FechaISO;
  cantidadPersonas: number;
  precioBaseAplicadoCentimos: number;
  tasaIvaPorcentaje: number;
}

/** Datos para insertar una reserva nueva (CU-03 paso 8). */
export type NuevaReserva = Omit<Reserva, 'id'>;

/** Reserva con montos, cliente, destino y pago (vista v_reservas_detalle). */
export interface ReservaDetalle {
  id: Uuid;
  codigoConfirmacion: string;
  fechaViaje: FechaISO;
  cantidadPersonas: number;
  precioBaseCentimos: number;
  subtotalCentimos: number;
  ivaCentimos: number;
  totalCentimos: number;
  tasaIvaPorcentaje: number;
  estadoReservaId: EstadoReservaId;
  estadoPagoId: EstadoPagoId | null;
  tarjetaUltimos4: string | null;
  cliente: DatosCliente;
  destino: { id: Uuid; nombre: string };
  creadoEn: string;
}

export type AccionBitacora =
  | 'CREADA'
  | 'FECHA_CAMBIADA'
  | 'CANCELADA'
  | 'APROBADA'
  | 'PAGO_ACTUALIZADO';

export interface EntradaBitacora {
  reservaId: Uuid;
  /** null cuando la acción la hizo el turista. */
  administradorId: Uuid | null;
  accion: AccionBitacora;
  valorAnterior?: string | null;
  valorNuevo?: string | null;
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
