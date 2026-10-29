import { almacenSesion } from './almacenSesion';
import type { Cotizacion, Destino, Disponibilidad, Reserva, Servicios, SesionAdmin } from './contratos';
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
      crear: (solicitud) => http.post<Reserva>('/api/reservas', solicitud),
      // RNF-06: el correo viaja en el cuerpo, nunca en la URL.
      consultar: (codigo, correo) => http.post<Reserva>('/api/reservas/consulta', { codigo, correo }),
      cambiarFecha: (codigo, correo, fecha) =>
        http.patch<Reserva>(`/api/reservas/${encodeURIComponent(codigo)}/fecha`, { correo, fecha }),
      cancelar: (codigo, correo) =>
        http.patch<Reserva>(`/api/reservas/${encodeURIComponent(codigo)}/cancelacion`, { correo }),
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
