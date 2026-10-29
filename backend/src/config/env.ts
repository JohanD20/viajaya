import { z } from 'zod';

/**
 * Configuración leída de variables de entorno (SAD 4 "Configuración", S-01).
 * Si falta un valor obligatorio o es inseguro, la API NO arranca: es preferible
 * fallar al iniciar que correr con un secreto débil.
 */
const esquemaEntorno = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().url('DATABASE_URL debe ser una URL postgresql://'),
  DATABASE_CA: z.string().optional(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
  JWT_EXPIRA_SEGUNDOS: z.coerce.number().int().positive().default(8 * 60 * 60),
  CORS_ORIGENES: z.string().default('http://localhost:5173'),
  BCRYPT_COSTO: z.coerce.number().int().min(10).max(14).default(12),
  LOG_NIVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

export interface Config {
  entorno: 'development' | 'test' | 'production';
  puerto: number;
  baseDatos: { url: string; certificadoCa?: string };
  jwt: { secreto: string; expiraSegundos: number };
  origenesPermitidos: string[];
  bcryptCosto: number;
  logNivel: string;
}

export function cargarConfig(entorno: NodeJS.ProcessEnv = process.env): Config {
  const resultado = esquemaEntorno.safeParse(entorno);
  if (!resultado.success) {
    const detalle = resultado.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Configuración inválida. Revise backend/.env:\n${detalle}`);
  }
  const e = resultado.data;
  return {
    entorno: e.NODE_ENV,
    puerto: e.PORT,
    baseDatos: {
      url: e.DATABASE_URL,
      ...(e.DATABASE_CA ? { certificadoCa: e.DATABASE_CA.replace(/\\n/g, '\n') } : {}),
    },
    jwt: { secreto: e.JWT_SECRET, expiraSegundos: e.JWT_EXPIRA_SEGUNDOS },
    origenesPermitidos: e.CORS_ORIGENES.split(',')
      .map((o) => o.trim())
      .filter(Boolean),
    bcryptCosto: e.BCRYPT_COSTO,
    logNivel: e.LOG_NIVEL,
  };
}
