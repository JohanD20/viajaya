import { almacenSesion } from './almacenSesion';
import type { Cotizacion, Destino, Disponibilidad, Servicios, SesionAdmin } from './contratos';
import { ClienteHttp } from './http';

/**
 * Raíz de composición del frontend: arma las implementaciones reales que se
 * entregan a <ServiciosProvider>. En pruebas se pasa otro objeto `Servicios`.
 */
export function crearServicios(urlBase: string): Servicios {
  const http = new ClienteHttp({
    urlBase,
    obtenerToken: almacenSesion.leer,
    alNoAutenticado: almacenSesion.borrar,
  });

  return {
    destinos: {
      listarActivos: () => http.get<Destino[]>('/api/destinos'),
      disponibilidad: (destinoId, fecha, personas) =>
        http.get<Disponibilidad>(
          `/api/destinos/${encodeURIComponent(destinoId)}/disponibilidad?` +
            new URLSearchParams({ fecha, personas: String(personas) }).toString(),
        ),
    },
    reservas: {
      cotizar: (solicitud) => http.post<Cotizacion>('/api/cotizaciones', solicitud),
    },
    auth: {
      async iniciarSesion(correo, password) {
        const r = await http.post<{ token: string; administrador: SesionAdmin }>(
          '/api/auth/login',
          { correo, password },
        );
        almacenSesion.guardar(r.token);
        return r.administrador;
      },
      sesionActual: () => http.get<SesionAdmin>('/api/admin/sesion'),
      cerrarSesion: almacenSesion.borrar,
    },
  };
}
