import { z } from 'zod';

/** Una variable vacía en el .env (CLAVE=) cuenta como no definida. */
const opcional = <T extends z.ZodType>(esquema: T) =>
  z.preprocess((v) => (v === '' ? undefined : v), esquema.optional());

/**
 * Configuración leída de variables de entorno (SAD 4 "Configuración", S-01).
 * Si falta un valor obligatorio o es inseguro, la API NO arranca: es preferible
 * fallar al iniciar que correr con un secreto débil.
 */
const esquemaEntorno = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    DATABASE_URL: z.url({ error: 'DATABASE_URL falta o no es una URL postgresql:// válida' }),
    DATABASE_CA: z.string().optional(),
    JWT_SECRET: z
      .string({ error: 'JWT_SECRET es obligatorio' })
      .min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
    JWT_EXPIRA_SEGUNDOS: z.coerce.number().int().positive().default(8 * 60 * 60),
    CORS_ORIGENES: z.string().default('http://localhost:5173'),
    BCRYPT_COSTO: z.coerce.number().int().min(10).max(14).default(12),
    LOG_NIVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    // Correos al turista (infra/correo). "consola" no envía nada: solo registra en el log.
    CORREO_PROVEEDOR: z.enum(['consola', 'brevo', 'resend']).default('consola'),
    CORREO_API_KEY: opcional(z.string()),
    CORREO_REMITENTE: opcional(z.email({ error: 'CORREO_REMITENTE debe ser un correo válido' })),
    CORREO_REMITENTE_NOMBRE: z.string().min(1).default('ViajaYa'),
    SITIO_URL: z.url({ error: 'SITIO_URL debe ser una URL https:// válida' }).default('http://localhost:5173'),
  })
  .superRefine((e, ctx) => {
    if (e.CORREO_PROVEEDOR === 'consola') return;
    if (!e.CORREO_API_KEY) {
      ctx.addIssue({ code: 'custom', path: ['CORREO_API_KEY'], message: `es obligatorio con CORREO_PROVEEDOR=${e.CORREO_PROVEEDOR}` });
    }
    if (!e.CORREO_REMITENTE) {
      ctx.addIssue({ code: 'custom', path: ['CORREO_REMITENTE'], message: `es obligatorio con CORREO_PROVEEDOR=${e.CORREO_PROVEEDOR}` });
    }
  });

export interface Config {
  entorno: 'development' | 'test' | 'production';
  puerto: number;
  baseDatos: { url: string; certificadoCa?: string };
  jwt: { secreto: string; expiraSegundos: number };
  origenesPermitidos: string[];
  bcryptCosto: number;
  logNivel: string;
  correo: ConfigCorreo;
}

export type ConfigCorreo =
  | { proveedor: 'consola'; sitioUrl: string }
  | {
      proveedor: 'brevo' | 'resend';
      apiKey: string;
      remitente: { correo: string; nombre: string };
      sitioUrl: string;
    };

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
    correo: configCorreo(e),
  };
}

function configCorreo(e: z.infer<typeof esquemaEntorno>): ConfigCorreo {
  const sitioUrl = e.SITIO_URL.replace(/\/+$/, '');
  if (e.CORREO_PROVEEDOR === 'consola' || !e.CORREO_API_KEY || !e.CORREO_REMITENTE) {
    return { proveedor: 'consola', sitioUrl };
  }
  return {
    proveedor: e.CORREO_PROVEEDOR,
    apiKey: e.CORREO_API_KEY,
    remitente: { correo: e.CORREO_REMITENTE, nombre: e.CORREO_REMITENTE_NOMBRE },
    sitioUrl,
  };
}
