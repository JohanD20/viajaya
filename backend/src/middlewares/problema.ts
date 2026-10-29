import type { Request, Response } from 'express';

/** Respuesta de error con formato application/problem+json (RFC 7807, SAD 4). */
export function enviarProblema(
  req: Request,
  res: Response,
  estado: number,
  titulo: string,
  detalle: string,
  extras: Record<string, unknown> = {},
): void {
  res
    .status(estado)
    .type('application/problem+json')
    .json({
      type: 'about:blank',
      title: titulo,
      status: estado,
      detail: detalle,
      instance: req.originalUrl,
      ...extras,
    });
}
