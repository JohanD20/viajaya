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
  // Sprint 2: crear, consultar, cambiarFecha, cancelar.
}

export interface AuthApi {
  iniciarSesion(correo: string, password: string): Promise<SesionAdmin>;
  sesionActual(): Promise<SesionAdmin>;
  cerrarSesion(): void;
}

export interface Servicios {
  destinos: DestinosApi;
  reservas: ReservasApi;
  auth: AuthApi;
}
