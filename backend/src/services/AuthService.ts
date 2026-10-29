import { randomBytes } from 'node:crypto';
import { NoAutenticadoError } from '../errors/errores';
import type { SesionAdmin } from '../models/dominio';
import type { AdministradorRepository } from '../ports/repositorios';
import type { EmisorToken, HasherContrasena } from '../ports/servicios-externos';

export interface ResultadoLogin {
  token: string;
  administrador: SesionAdmin;
}

/** Mensaje único para cualquier fallo de login (flujos 4a y 4b de CU-07). */
const CREDENCIALES_INVALIDAS = 'Credenciales inválidas.';

/** CU-07 · RF-10 · RNF-03. */
export class AuthService {
  /**
   * Hash de una contraseña aleatoria que nadie conoce. Cuando el correo no existe
   * se compara contra este hash para que la respuesta tarde lo mismo que con un
   * correo real (evita adivinar correos por el tiempo de respuesta).
   */
  private hashSenuelo?: Promise<string>;

  constructor(
    private readonly administradores: AdministradorRepository,
    private readonly hasher: HasherContrasena,
    private readonly emisorToken: EmisorToken,
  ) {}

  async iniciarSesion(correo: string, password: string): Promise<ResultadoLogin> {
    const admin = await this.administradores.buscarPorCorreo(correo.trim().toLowerCase());
    const hash = admin?.passwordHash ?? (await this.obtenerHashSenuelo());
    const coincide = await this.hasher.comparar(password, hash);

    if (!admin || !admin.activo || !coincide) {
      throw new NoAutenticadoError(CREDENCIALES_INVALIDAS);
    }

    const sesion: SesionAdmin = { id: admin.id, nombre: admin.nombre, correo: admin.correo };
    return { token: this.emisorToken.emitir(sesion), administrador: sesion };
  }

  private obtenerHashSenuelo(): Promise<string> {
    this.hashSenuelo ??= this.hasher.hash(randomBytes(32).toString('hex'));
    return this.hashSenuelo;
  }
}
