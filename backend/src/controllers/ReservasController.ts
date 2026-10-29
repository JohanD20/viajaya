import type { RequestHandler } from 'express';
import type { ReservaService } from '../services/ReservaService';
import {
  cuerpoCambioFecha,
  cuerpoCancelacion,
  cuerpoConsultaReserva,
  cuerpoCotizacion,
  cuerpoReserva,
  parametroCodigo,
} from '../validation/esquemas';
import { cotizacionPublica, reservaPublica } from './presentadores';

export class ReservasController {
  constructor(private readonly reservas: ReservaService) {}

  /** POST /api/cotizaciones · CU-02 */
  cotizar: RequestHandler = async (req, res) => {
    const solicitud = cuerpoCotizacion.parse(req.body);
    res.json(cotizacionPublica(await this.reservas.cotizar(solicitud)));
  };

  /** POST /api/reservas · CU-03 · 201 con el código de confirmación */
  crear: RequestHandler = async (req, res) => {
    const d = cuerpoReserva.parse(req.body);
    const reserva = await this.reservas.crear({
      destinoId: d.destinoId,
      fecha: d.fecha,
      personas: d.personas,
      cliente: { nombre: d.nombre, correo: d.correo, telefono: d.telefono },
      numeroTarjeta: d.numeroTarjeta,
    });
    res.status(201).json(reservaPublica(reserva, true));
  };

  /** POST /api/reservas/consulta · CU-04 */
  consultar: RequestHandler = async (req, res) => {
    const { codigo, correo } = cuerpoConsultaReserva.parse(req.body);
    const { reserva, modificable } = await this.reservas.consultar(codigo, correo);
    res.json(reservaPublica(reserva, modificable));
  };

  /** PATCH /api/reservas/:codigo/fecha · CU-05 */
  cambiarFecha: RequestHandler = async (req, res) => {
    const { codigo } = parametroCodigo.parse(req.params);
    const { correo, fecha } = cuerpoCambioFecha.parse(req.body);
    res.json(reservaPublica(await this.reservas.cambiarFecha(codigo, correo, fecha), true));
  };

  /** PATCH /api/reservas/:codigo/cancelacion · CU-06 */
  cancelar: RequestHandler = async (req, res) => {
    const { codigo } = parametroCodigo.parse(req.params);
    const { correo } = cuerpoCancelacion.parse(req.body);
    res.json(reservaPublica(await this.reservas.cancelar(codigo, correo), false));
  };
}
