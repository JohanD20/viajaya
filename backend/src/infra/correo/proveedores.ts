import type { CorreoSaliente } from './plantillas';

/**
 * Proveedores de correo por API HTTPS. No se usa SMTP porque el plan gratuito de
 * Render bloquea los puertos 25, 465 y 587. Se usa el fetch nativo de Node (sin
 * dependencias nuevas) y se puede inyectar uno falso en las pruebas.
 */
export interface ProveedorCorreo {
  readonly nombre: string;
  /** Lanza un error si el proveedor no aceptó el correo. */
  enviar(correo: CorreoSaliente): Promise<void>;
}

export interface Remitente {
  correo: string;
  nombre: string;
}

/** Mínimo que se usa de fetch; permite inyectar un doble en las pruebas. */
export type Fetch = (url: string, init: RequestInit) => Promise<Response>;

const TIEMPO_MAXIMO_MS = 10_000;

/** S-11: los mensajes de error del proveedor pueden traer direcciones; se ocultan. */
export function ocultarCorreos(texto: string): string {
  return texto.replace(/[^\s@"'<>]+@[^\s@"'<>]+/g, '[correo]');
}

async function exigirExito(respuesta: Response, proveedor: string): Promise<void> {
  if (respuesta.ok) return;
  const detalle = ocultarCorreos((await respuesta.text().catch(() => '')).slice(0, 300));
  throw new Error(`${proveedor} respondió ${respuesta.status}: ${detalle}`);
}

/** Brevo (antes Sendinblue): plan gratuito de 300 correos al día con un remitente verificado. */
export class ProveedorBrevo implements ProveedorCorreo {
  readonly nombre = 'brevo';

  constructor(
    private readonly apiKey: string,
    private readonly remitente: Remitente,
    private readonly fetchFn: Fetch = fetch,
  ) {}

  async enviar(c: CorreoSaliente): Promise<void> {
    const respuesta = await this.fetchFn('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': this.apiKey, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { name: this.remitente.nombre, email: this.remitente.correo },
        to: [{ email: c.para.correo, name: c.para.nombre }],
        subject: c.asunto,
        htmlContent: c.html,
        textContent: c.texto,
      }),
      signal: AbortSignal.timeout(TIEMPO_MAXIMO_MS),
    });
    await exigirExito(respuesta, 'Brevo');
  }
}

/** Resend: plan gratuito de 3000 correos al mes; exige verificar el dominio del remitente. */
export class ProveedorResend implements ProveedorCorreo {
  readonly nombre = 'resend';

  constructor(
    private readonly apiKey: string,
    private readonly remitente: Remitente,
    private readonly fetchFn: Fetch = fetch,
  ) {}

  async enviar(c: CorreoSaliente): Promise<void> {
    const respuesta = await this.fetchFn('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${this.apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from: `${this.remitente.nombre} <${this.remitente.correo}>`,
        to: [c.para.correo],
        subject: c.asunto,
        html: c.html,
        text: c.texto,
      }),
      signal: AbortSignal.timeout(TIEMPO_MAXIMO_MS),
    });
    await exigirExito(respuesta, 'Resend');
  }
}

/** Mínimo que se usa del logger (pino lo cumple). */
export interface Registro {
  info(datos: object, mensaje: string): void;
  error(datos: object, mensaje: string): void;
}

/**
 * Modo de desarrollo: no envía nada, solo deja el correo en el log. El contenido
 * (con el nombre del turista) solo se muestra si se pide, nunca en producción.
 */
export class ProveedorConsola implements ProveedorCorreo {
  readonly nombre = 'consola';

  constructor(
    private readonly registro: Registro,
    private readonly mostrarContenido = false,
  ) {}

  async enviar(c: CorreoSaliente): Promise<void> {
    this.registro.info(
      { asunto: c.asunto, ...(this.mostrarContenido ? { texto: c.texto } : {}) },
      'Correo NO enviado (CORREO_PROVEEDOR=consola)',
    );
  }
}
