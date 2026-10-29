/**
 * Crea o actualiza un administrador (sin versionar contraseñas ni hashes).
 * Uso:  npm run crear-admin -w backend
 * Lee ADMIN_NOMBRE, ADMIN_CORREO y ADMIN_PASSWORD de backend/.env.
 * Después de usarlo, borre ADMIN_PASSWORD del .env.
 */
import { crearPool } from '../src/config/db';
import { cargarConfig } from '../src/config/env';
import { HasherBcrypt } from '../src/infra/HasherBcrypt';
import { consultorDePool } from '../src/repositories/pg/consultor';
import { PgAdministradorRepository } from '../src/repositories/pg/PgAdministradorRepository';
import { correo as esquemaCorreo } from '../src/validation/esquemas';

async function principal(): Promise<void> {
  const nombre = process.env['ADMIN_NOMBRE']?.trim();
  const correo = esquemaCorreo.safeParse(process.env['ADMIN_CORREO']);
  const password = process.env['ADMIN_PASSWORD'] ?? '';

  if (!nombre || !correo.success) {
    throw new Error('Defina ADMIN_NOMBRE y un ADMIN_CORREO válido en backend/.env');
  }
  if (password.length < 12) {
    throw new Error('ADMIN_PASSWORD debe tener al menos 12 caracteres.');
  }

  const config = cargarConfig();
  const pool = crearPool(config);
  try {
    const hasher = new HasherBcrypt(config.bcryptCosto);
    const repo = new PgAdministradorRepository(consultorDePool(pool));
    await repo.guardar({ nombre, correo: correo.data, passwordHash: await hasher.hash(password) });
    console.error(`Administrador listo: ${correo.data}. Borre ADMIN_PASSWORD de backend/.env.`);
  } finally {
    await pool.end();
  }
}

principal().catch((error: unknown) => {
  console.error((error as Error).message);
  process.exit(1);
});
