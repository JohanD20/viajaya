import { z } from 'zod';
import { esFechaCalendarioValida } from '../shared/fechas';

// Mensajes por defecto de zod en español (RNF-09: la interfaz y sus errores en español).
z.config(z.locales.es());

/**
 * Esquemas de validación de entradas con zod 4 (RNF-08, S-03). Los controladores
 * hacen `esquema.parse(req.body | req.query | req.params)`; si falla, el
 * ZodError se convierte en un 400 con la lista de campos (middlewares/errores.ts).
 * `z.strictObject` rechaza campos que no estén en el contrato.
 */

/** Mensaje distinto si el campo falta o si tiene el tipo equivocado. */
const mensajes = (obligatorio: string, tipoInvalido: string) => ({
  error: (issue: { input?: unknown }) => (issue.input === undefined ? obligatorio : tipoInvalido),
});

// ---------- Piezas reutilizables ----------
export const uuid = z.uuid('Identificador inválido.');

export const fechaISO = z
  .string(mensajes('La fecha es obligatoria.', 'La fecha debe ser texto AAAA-MM-DD.'))
  .refine(esFechaCalendarioValida, 'Use una fecha válida con formato AAAA-MM-DD.');

const MAX_PERSONAS = 1000;

/** Para cuerpos JSON (ya llega como número). */
export const personas = z
  .number(mensajes('La cantidad de personas es obligatoria.', 'Debe ser un número.'))
  .int('Debe ser un número entero.')
  .min(1, 'Debe ser al menos 1 persona.')
  .max(MAX_PERSONAS, `No puede superar ${MAX_PERSONAS} personas.`);

/** Para la query string (llega como texto). */
export const personasEnQuery = z.coerce
  .number({ error: 'Debe ser un número.' })
  .int('Debe ser un número entero.')
  .min(1, 'Debe ser al menos 1 persona.')
  .max(MAX_PERSONAS, `No puede superar ${MAX_PERSONAS} personas.`);

export const correo = z
  .string(mensajes('El correo es obligatorio.', 'El correo debe ser texto.'))
  .trim()
  .toLowerCase()
  .max(120, 'Máximo 120 caracteres.')
  .pipe(z.email('Correo inválido.'));

// ---------- Por ruta ----------
export const parametroId = z.object({ id: uuid });

/** GET /api/destinos/:id/disponibilidad?fecha=&personas= (CU-01) */
export const consultaDisponibilidad = z.strictObject({ fecha: fechaISO, personas: personasEnQuery });

/** POST /api/cotizaciones (CU-02) */
export const cuerpoCotizacion = z.strictObject({ destinoId: uuid, fecha: fechaISO, personas });

/** Código de confirmación VY-XXXXXX (acepta minúsculas y espacios alrededor). */
export const codigoConfirmacion = z
  .string(mensajes('El código es obligatorio.', 'El código debe ser texto.'))
  .trim()
  .toUpperCase()
  .regex(/^VY-[A-Z0-9]{6}$/, 'El código tiene el formato VY-XXXXXX.');

/** POST /api/reservas (CU-03) · RNF-07: solo nombre, correo y teléfono. */
export const cuerpoReserva = z.strictObject({
  destinoId: uuid,
  fecha: fechaISO,
  personas,
  nombre: z
    .string(mensajes('El nombre es obligatorio.', 'El nombre debe ser texto.'))
    .trim()
    .min(3, 'Escriba su nombre completo.')
    .max(100, 'Máximo 100 caracteres.'),
  correo,
  telefono: z
    .string(mensajes('El teléfono es obligatorio.', 'El teléfono debe ser texto.'))
    .trim()
    .regex(/^\+?[0-9 ()-]{8,20}$/, 'Teléfono inválido: use solo números, espacios, guiones o +.'),
  // S-05: solo dígitos; el número completo nunca se guarda ni se registra.
  numeroTarjeta: z
    .string(mensajes('El número de tarjeta es obligatorio.', 'La tarjeta debe ser texto.'))
    .transform((t) => t.replace(/[\s-]/g, ''))
    .pipe(z.string().regex(/^\d{13,19}$/, 'La tarjeta debe tener entre 13 y 19 dígitos.')),
});

/** POST /api/reservas/consulta (CU-04) · el correo va en el cuerpo, no en la URL (RNF-06). */
export const cuerpoConsultaReserva = z.strictObject({ codigo: codigoConfirmacion, correo });

export const parametroCodigo = z.object({ codigo: codigoConfirmacion });

/** PATCH /api/reservas/:codigo/fecha (CU-05) */
export const cuerpoCambioFecha = z.strictObject({ correo, fecha: fechaISO });

/** PATCH /api/reservas/:codigo/cancelacion (CU-06) */
export const cuerpoCancelacion = z.strictObject({ correo });

// ---------- Administración (CU-08 a CU-16) ----------

/** Monto positivo con máximo 2 decimales. */
const montoPositivo = z
  .number(mensajes('El precio es obligatorio.', 'Debe ser un número.'))
  .positive('El precio base debe ser mayor que 0.')
  .max(99_999_999.99, 'El precio es demasiado alto.')
  .refine((v) => Math.abs(Math.round(v * 100) - v * 100) < 1e-6, 'Use como máximo 2 decimales.');

const datosDestino = {
  nombre: z
    .string(mensajes('El nombre es obligatorio.', 'El nombre debe ser texto.'))
    .trim()
    .min(2, 'El nombre es obligatorio.')
    .max(100, 'Máximo 100 caracteres.'),
  descripcion: z
    .string()
    .trim()
    .max(1000, 'Máximo 1000 caracteres.')
    .nullish()
    .transform((d) => (d ? d : null)),
  precioBase: montoPositivo,
  capacidadMaximaDiaria: z
    .number(mensajes('La capacidad es obligatoria.', 'Debe ser un número.'))
    .int('Debe ser un número entero.')
    .min(1, 'La capacidad debe ser al menos 1.')
    .max(10_000, 'La capacidad es demasiado alta.'),
};

/** POST /api/admin/destinos (CU-08) */
export const cuerpoCrearDestino = z.strictObject(datosDestino);

/** PUT /api/admin/destinos/:id (CU-10, incluye reactivar) */
export const cuerpoEditarDestino = z.strictObject({
  ...datosDestino,
  activo: z.boolean({ error: 'Indique si el destino está activo (true o false).' }),
});

/** GET /api/admin/destinos?estado=&nombre= (CU-09) */
export const filtroDestinos = z.strictObject({
  estado: z.enum(['activo', 'inactivo', 'todos']).default('todos'),
  nombre: z.string().trim().max(100).optional(),
});

const estadoReservaTexto = z.enum(['Pendiente', 'Aprobada', 'Cancelada'], {
  error: 'Estado de reserva inválido: use Pendiente, Aprobada o Cancelada.',
});
const estadoPagoTexto = z.enum(['Pendiente', 'Aprobado', 'Rechazado'], {
  error: 'Estado de pago inválido: use Pendiente, Aprobado o Rechazado.',
});

/** GET /api/admin/reservas?destinoId=&desde=&hasta=&estadoReserva=&estadoPago= (CU-12) */
export const filtroReservas = z.strictObject({
  destinoId: uuid.optional(),
  desde: fechaISO.optional(),
  hasta: fechaISO.optional(),
  estadoReserva: estadoReservaTexto.optional(),
  estadoPago: estadoPagoTexto.optional(),
});

/** DELETE /api/admin/reservas/:id (CU-15): confirmación escribiendo el código. */
export const cuerpoEliminarReserva = z.strictObject({
  codigoConfirmacion: z.string({ error: 'Escriba el código de la reserva.' }),
});

/** PATCH /api/admin/reservas/:id/pago (CU-16) */
export const cuerpoActualizarPago = z.strictObject({ estadoPago: estadoPagoTexto });

/** POST /api/auth/login (CU-07) */
export const cuerpoLogin = z.strictObject({
  correo,
  password: z
    .string(mensajes('La contraseña es obligatoria.', 'La contraseña debe ser texto.'))
    .min(1, 'La contraseña es obligatoria.')
    .max(200),
});
