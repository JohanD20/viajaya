import { Router } from 'express';
import type { Contenedor } from '../container';
import { AdminController } from '../controllers/AdminController';
import { AuthController } from '../controllers/AuthController';
import { DestinosController } from '../controllers/DestinosController';
import { ReservasController } from '../controllers/ReservasController';
import { crearAutenticacionAdmin } from '../middlewares/autenticacion';
import {
  crearLimiteConsultaReserva,
  crearLimiteCreacionReserva,
  crearLimiteLogin,
} from '../middlewares/limites';

/**
 * Contrato de la API REST (SAD 3.1). Cada ruta indica su caso de uso.
 * Los controladores reciben sus servicios ya construidos desde el contenedor.
 */
export function crearRouterApi(c: Contenedor): Router {
  const destinos = new DestinosController(c.destinoService);
  const reservas = new ReservasController(c.reservaService);
  const auth = new AuthController(c.authService);
  const administracion = new AdminController(c.destinoService, c.adminReservaService);

  // ---------- Público (turista) ----------
  const api = Router();
  api.get('/destinos', destinos.listarActivos); // CU-01
  api.get('/destinos/:id/disponibilidad', destinos.disponibilidad); // CU-01
  api.post('/cotizaciones', reservas.cotizar); // CU-02
  api.post('/reservas', crearLimiteCreacionReserva(), reservas.crear); // CU-03 (envía correo: límite S-07)

  // Operaciones con código y correo: límite de intentos contra fuerza bruta (S-07).
  const limiteConsulta = crearLimiteConsultaReserva();
  api.post('/reservas/consulta', limiteConsulta, reservas.consultar); // CU-04
  api.patch('/reservas/:codigo/fecha', limiteConsulta, reservas.cambiarFecha); // CU-05
  api.patch('/reservas/:codigo/cancelacion', limiteConsulta, reservas.cancelar); // CU-06

  api.post('/auth/login', crearLimiteLogin(), auth.login); // CU-07

  // ---------- Administración: TODO lo que cuelga de aquí exige JWT (S-04) ----------
  const admin = Router();
  admin.use(crearAutenticacionAdmin(c.emisorToken));
  admin.get('/sesion', auth.sesion);
  admin.post('/destinos', administracion.crearDestino); // CU-08
  admin.get('/destinos', administracion.listarDestinos); // CU-09
  admin.put('/destinos/:id', administracion.editarDestino); // CU-10
  admin.patch('/destinos/:id/desactivacion', administracion.desactivarDestino); // CU-11
  admin.get('/reservas', administracion.listarReservas); // CU-12
  admin.patch('/reservas/:id/aprobacion', administracion.aprobarReserva); // CU-13
  admin.patch('/reservas/:id/cancelacion', administracion.cancelarReserva); // CU-14
  admin.delete('/reservas/:id', administracion.eliminarReserva); // CU-15
  admin.patch('/reservas/:id/pago', administracion.actualizarPago); // CU-16
  api.use('/admin', admin);

  return api;
}
