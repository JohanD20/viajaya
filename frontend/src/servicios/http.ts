/** Error de la API con el formato problem+json (SAD 4). */
export class ErrorApi extends Error {
  constructor(
    readonly estado: number,
    readonly titulo: string,
    detalle: string,
    readonly errores: { campo: string; mensaje: string }[] = [],
    readonly extras: Record<string, unknown> = {},
  ) {
    super(detalle);
    this.name = 'ErrorApi';
  }

  /** Mensaje de un campo concreto (para marcarlo en el formulario). */
  errorDe(campo: string): string | undefined {
    return this.errores.find((e) => e.campo === campo)?.mensaje;
  }
}

export interface OpcionesHttp {
  urlBase: string;
  obtenerToken: () => string | null;
  /** Se llama ante un 401 en una ruta de administración (S-11: cerrar sesión). */
  alNoAutenticado: () => void;
}

/** Cliente HTTP mínimo. Es el ÚNICO lugar del frontend que usa fetch. */
export class ClienteHttp {
  constructor(private readonly opciones: OpcionesHttp) {}

  get<T>(ruta: string): Promise<T> {
    return this.enviar<T>('GET', ruta);
  }

  post<T>(ruta: string, cuerpo: unknown): Promise<T> {
    return this.enviar<T>('POST', ruta, cuerpo);
  }

  patch<T>(ruta: string, cuerpo: unknown): Promise<T> {
    return this.enviar<T>('PATCH', ruta, cuerpo);
  }

  put<T>(ruta: string, cuerpo: unknown): Promise<T> {
    return this.enviar<T>('PUT', ruta, cuerpo);
  }

  delete<T>(ruta: string): Promise<T> {
    return this.enviar<T>('DELETE', ruta);
  }

  private async enviar<T>(metodo: string, ruta: string, cuerpo?: unknown): Promise<T> {
    const encabezados: Record<string, string> = {};
    if (cuerpo !== undefined) encabezados['Content-Type'] = 'application/json';
    const token = this.opciones.obtenerToken();
    if (token && ruta.startsWith('/api/admin')) encabezados['Authorization'] = `Bearer ${token}`;

    let respuesta: Response;
    try {
      respuesta = await fetch(`${this.opciones.urlBase}${ruta}`, {
        method: metodo,
        headers: encabezados,
        body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
      });
    } catch {
      throw new ErrorApi(0, 'Sin conexión', 'No pudimos contactar al servidor. Revise su conexión e intente de nuevo.');
    }

    if (respuesta.status === 204) return undefined as T;
    const datos: unknown = await respuesta.json().catch(() => null);

    if (!respuesta.ok) {
      const p = (datos ?? {}) as {
        title?: string;
        detail?: string;
        errores?: { campo: string; mensaje: string }[];
        [k: string]: unknown;
      };
      if (respuesta.status === 401 && ruta.startsWith('/api/admin')) this.opciones.alNoAutenticado();
      throw new ErrorApi(
        respuesta.status,
        p.title ?? 'Error',
        p.detail ?? 'Ocurrió un error inesperado. Intente de nuevo.',
        p.errores ?? [],
        p,
      );
    }
    return datos as T;
  }
}
