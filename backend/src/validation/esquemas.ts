import { z } from 'zod';
import { esFechaCalendarioValida } from '../shared/fechas';

/**
 * Esquemas de validación de entradas (RNF-08, S-03). Los controladores hacen
 * `esquema.parse(req.body | req.query | req.params)`; si falla, el ZodError se
 * convierte en un 400 con la lista de campos (middlewares/errores.ts).
 * `.strict()` rechaza campos que no estén en el contrato.
 */

// ---------- Piezas reutilizables ----------
export const uuid = z.string().uuid('Identificador inválido.');

export const fechaISO = z
  .string({ required_error: 'La fecha es obligatoria.' })
  .refine(esFechaCalendarioValida, 'Use una fecha válida con formato AAAA-MM-DD.');

const MAX_PERSONAS = 1000;

/** Para cuerpos JSON (ya llega como número). */
export const personas = z
  .number({ required_error: 'La cantidad de personas es obligatoria.', invalid_type_error: 'Debe ser un número.' })
  .int('Debe ser un número entero.')
  .min(1, 'Debe ser al menos 1 persona.')
  .max(MAX_PERSONAS, `No puede superar ${MAX_PERSONAS} personas.`);

/** Para la query string (llega como texto). */
export const personasEnQuery = z.coerce
  .number({ invalid_type_error: 'Debe ser un número.' })
  .int('Debe ser un número entero.')
  .min(1, 'Debe ser al menos 1 persona.')
  .max(MAX_PERSONAS, `No puede superar ${MAX_PERSONAS} personas.`);

export const correo = z
  .string({ required_error: 'El correo es obligatorio.' })
  .trim()
  .toLowerCase()
  .email('Correo inválido.')
  .max(120, 'Máximo 120 caracteres.');

// ---------- Por ruta ----------
export const parametroId = z.object({ id: uuid });

/** GET /api/destinos/:id/disponibilidad?fecha=&personas= (CU-01) */
export const consultaDisponibilidad = z
  .object({ fecha: fechaISO, personas: personasEnQuery })
  .strict();

/** POST /api/cotizaciones (CU-02) */
export const cuerpoCotizacion = z
  .object({ destinoId: uuid, fecha: fechaISO, personas })
  .strict();

/** Código de confirmación VY-XXXXXX (acepta minúsculas y espacios alrededor). */
export const codigoConfirmacion = z
  .string({ required_error: 'El código es obligatorio.' })
  .trim()
  .toUpperCase()
  .regex(/^VY-[A-Z0-9]{6}$/, 'El código tiene el formato VY-XXXXXX.');

/** POST /api/reservas (CU-03) · RNF-07: solo nombre, correo y teléfono. */
export const cuerpoReserva = z
  .object({
    destinoId: uuid,
    fecha: fechaISO,
    personas,
    nombre: z
      .string({ required_error: 'El nombre es obligatorio.' })
      .trim()
      .min(3, 'Escriba su nombre completo.')
      .max(100, 'Máximo 100 caracteres.'),
    correo,
    telefono: z
      .string({ required_error: 'El teléfono es obligatorio.' })
      .trim()
      .regex(/^\+?[0-9 ()-]{8,20}$/, 'Teléfono inválido: use solo números, espacios, guiones o +.'),
    // S-05: solo dígitos; el número completo nunca se guarda ni se registra.
    numeroTarjeta: z
      .string({ required_error: 'El número de tarjeta es obligatorio.' })
      .transform((t) => t.replace(/[\s-]/g, ''))
      .pipe(z.string().regex(/^\d{13,19}$/, 'La tarjeta debe tener entre 13 y 19 dígitos.')),
  })
  .strict();

/** POST /api/reservas/consulta (CU-04) · el correo va en el cuerpo, no en la URL (RNF-06). */
export const cuerpoConsultaReserva = z.object({ codigo: codigoConfirmacion, correo }).strict();

export const parametroCodigo = z.object({ codigo: codigoConfirmacion });

/** PATCH /api/reservas/:codigo/fecha (CU-05) */
export const cuerpoCambioFecha = z.object({ correo, fecha: fechaISO }).strict();

/** PATCH /api/reservas/:codigo/cancelacion (CU-06) */
export const cuerpoCancelacion = z.object({ correo }).strict();

/** POST /api/auth/login (CU-07) */
export const cuerpoLogin = z
  .object({
    correo,
    password: z.string({ required_error: 'La contraseña es obligatoria.' }).min(1).max(200),
  })
  .strict();
