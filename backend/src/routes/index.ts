import { Router } from 'express';
import type { Contenedor } from '../container';
import { AuthController } from '../controllers/AuthController';
import { DestinosController } from '../controllers/DestinosController';
import { ReservasController } from '../controllers/ReservasController';
import { crearAutenticacionAdmin } from '../middlewares/autenticacion';
import { crearLimiteLogin } from '../middlewares/limites';

/**
 * Contrato de la API REST (SAD 3.1). Cada ruta indica su caso de uso.
 * Los controladores reciben sus servicios ya construidos desde el contenedor.
 */
export function crearRouterApi(c: Contenedor): Router {
  const destinos = new DestinosController(c.destinoService);
  const reservas = new ReservasController(c.reservaService);
  const auth = new AuthController(c.authService);

  // ---------- Público (turista) ----------
  const api = Router();
  api.get('/destinos', destinos.listarActivos); // CU-01
  api.get('/destinos/:id/disponibilidad', destinos.disponibilidad); // CU-01
  api.post('/cotizaciones', reservas.cotizar); // CU-02
  // Sprint 2 (usar crearLimiteConsultaReserva() en las rutas con código y correo):
  // api.post('/reservas', reservas.crear);                                    // CU-03
  // api.post('/reservas/consulta', limiteConsulta, reservas.consultar);        // CU-04
  // api.patch('/reservas/:codigo/fecha', limiteConsulta, reservas.cambiarFecha);      // CU-05
  // api.patch('/reservas/:codigo/cancelacion', limiteConsulta, reservas.cancelar);    // CU-06

  api.post('/auth/login', crearLimiteLogin(), auth.login); // CU-07

  // ---------- Administración: TODO lo que cuelga de aquí exige JWT (S-04) ----------
  const admin = Router();
  admin.use(crearAutenticacionAdmin(c.emisorToken));
  admin.get('/sesion', auth.sesion);
  // HU-04 a HU-07: POST/GET /destinos, PUT /destinos/:id, PATCH /destinos/:id/desactivacion
  // HU-14 a HU-18: GET /reservas, PATCH /reservas/:id/aprobacion|cancelacion|pago, DELETE /reservas/:id
  api.use('/admin', admin);

  return api;
}
