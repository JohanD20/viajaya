import type { RequestHandler } from 'express';
import { adminActual } from '../middlewares/autenticacion';
import type { AuthService } from '../services/AuthService';
import { cuerpoLogin } from '../validation/esquemas';

export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** POST /api/auth/login · CU-07 */
  login: RequestHandler = async (req, res) => {
    const { correo, password } = cuerpoLogin.parse(req.body);
    res.json(await this.auth.iniciarSesion(correo, password));
  };

  /** GET /api/admin/sesion · devuelve el administrador del token (la interfaz valida su sesión). */
  sesion: RequestHandler = (_req, res) => {
    res.json(adminActual(res));
  };
}
