import bcrypt from 'bcryptjs';
import type { HasherContrasena } from '../ports/servicios-externos';

/**
 * Hash de contraseñas con bcrypt (RNF-03, ADR-05). Se usa bcryptjs (misma
 * especificación que bcrypt, en JavaScript puro) para evitar compilar módulos
 * nativos en Windows y en Render.
 */
export class HasherBcrypt implements HasherContrasena {
  constructor(private readonly costo: number) {}

  hash(texto: string): Promise<string> {
    return bcrypt.hash(texto, this.costo);
  }

  comparar(texto: string, hash: string): Promise<boolean> {
    return bcrypt.compare(texto, hash);
  }
}
