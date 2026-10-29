import { Pool, types } from 'pg';
import type { Config } from './env';

// Las columnas `date` se devuelven como texto 'AAAA-MM-DD'. Por defecto pg las
// convierte a Date en la zona del servidor, lo que puede correr el día.
types.setTypeParser(types.builtins.DATE, (valor: string) => valor);
// numeric se mantiene como texto (por defecto) y se convierte con shared/dinero.ts.

/** Pool de conexiones a Supabase por TLS (RNF-04). */
export function crearPool(config: Config): Pool {
  const { url, certificadoCa } = config.baseDatos;
  return new Pool({
    connectionString: url,
    // Con el certificado de Supabase se verifica el servidor; sin él la conexión
    // sigue cifrada pero sin verificar identidad (aceptable solo en desarrollo).
    ssl: certificadoCa ? { ca: certificadoCa, rejectUnauthorized: true } : { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });
}
