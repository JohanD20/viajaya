/**
 * Contrato de la API REST (SAD 3.1) visto desde el frontend, y las INTERFACES
 * de los servicios que usan los componentes. Los componentes y hooks dependen
 * de estas interfaces, nunca de fetch directamente (IoC en el frontend).
 */

// ---------- Datos ----------
export interface Destino {
  id: string;
  nombre: string;
  descripcion: string | null;
  precioBase: number;
  capacidadMaximaDiaria: number;
}

export interface Disponibilidad {
  destinoId: string;
  fecha: string;
  capacidadMaximaDiaria: number;
  personasReservadas: number;
  disponibles: number;
  personasSolicitadas: number;
  alcanza: boolean;
}

export interface SolicitudCotizacion {
  destinoId: string;
  fecha: string;
  personas: number;
}

export interface Cotizacion {
  destino: { id: string; nombre: string };
  fecha: string;
  personas: number;
  precioBase: number;
  subtotal: number;
  tasaIva: number;
  iva: number;
  montoTotal: number;
}

export interface SolicitudReserva extends SolicitudCotizacion {
  nombre: string;
  correo: string;
  telefono: string;
  numeroTarjeta: string;
}

export type EstadoReserva = 'Pendiente' | 'Aprobada' | 'Cancelada';
export type EstadoPago = 'Pendiente' | 'Aprobado' | 'Rechazado';

/** Reserva vista por el turista (CU-03 a CU-06). */
export interface Reserva extends Cotizacion {
  codigo: string;
  estadoReserva: EstadoReserva;
  estadoPago: EstadoPago | null;
  tarjetaUltimos4: string | null;
  cliente: { nombre: string };
  /** true si aún se puede cambiar la fecha o cancelar (activa y con más de 48 h). */
  modificable?: boolean;
}

// ---------- Administración (CU-08 a CU-16) ----------
export interface DestinoAdmin extends Destino {
  activo: boolean;
  reservasActivasFuturas?: number;
}

export interface DatosDestino {
  nombre: string;
  descripcion: string | null;
  precioBase: number;
  capacidadMaximaDiaria: number;
}

export interface FiltroDestinosAdmin {
  estado?: 'activo' | 'inactivo' | 'todos';
  nombre?: string;
}

export interface ReservaAdmin extends Reserva {
  id: string;
  cliente: { nombre: string; correo: string; telefono: string };
  creadaEn: string;
}

export interface FiltroReservasAdmin {
  destinoId?: string;
  desde?: string;
  hasta?: string;
  estadoReserva?: EstadoReserva;
  estadoPago?: EstadoPago;
}

export interface SesionAdmin {
  id: string;
  nombre: string;
  correo: string;
}

// ---------- Servicios inyectables ----------
export interface DestinosApi {
  listarActivos(): Promise<Destino[]>;
  disponibilidad(destinoId: string, fecha: string, personas: number): Promise<Disponibilidad>;
}

export interface ReservasApi {
  cotizar(solicitud: SolicitudCotizacion): Promise<Cotizacion>;
  crear(solicitud: SolicitudReserva): Promise<Reserva>;
  consultar(codigo: string, correo: string): Promise<Reserva>;
  cambiarFecha(codigo: string, correo: string, fecha: string): Promise<Reserva>;
  cancelar(codigo: string, correo: string): Promise<Reserva>;
}

export interface AuthApi {
  iniciarSesion(correo: string, password: string): Promise<SesionAdmin>;
  sesionActual(): Promise<SesionAdmin>;
  cerrarSesion(): void;
}

export interface AdminApi {
  listarDestinos(filtro: FiltroDestinosAdmin): Promise<DestinoAdmin[]>;
  crearDestino(datos: DatosDestino): Promise<DestinoAdmin>;
  editarDestino(id: string, datos: DatosDestino & { activo: boolean }): Promise<DestinoAdmin>;
  desactivarDestino(id: string): Promise<void>;
  listarReservas(filtro: FiltroReservasAdmin): Promise<ReservaAdmin[]>;
  aprobarReserva(id: string): Promise<ReservaAdmin>;
  cancelarReserva(id: string): Promise<ReservaAdmin>;
  eliminarReserva(id: string, codigoConfirmacion: string): Promise<void>;
  actualizarPago(id: string, estadoPago: EstadoPago): Promise<ReservaAdmin>;
}

export interface Servicios {
  destinos: DestinosApi;
  reservas: ReservasApi;
  auth: AuthApi;
  admin: AdminApi;
}
