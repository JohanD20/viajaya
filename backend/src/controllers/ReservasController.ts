import type { RequestHandler } from 'express';
import type { ReservaService } from '../services/ReservaService';
import { cuerpoCotizacion } from '../validation/esquemas';
import { cotizacionPublica } from './presentadores';

export class ReservasController {
  constructor(private readonly reservas: ReservaService) {}

  /** POST /api/cotizaciones · CU-02 */
  cotizar: RequestHandler = async (req, res) => {
    const solicitud = cuerpoCotizacion.parse(req.body);
    res.json(cotizacionPublica(await this.reservas.cotizar(solicitud)));
  };

  // Sprint 2: crear (CU-03), consultar (CU-04), cambiarFecha (CU-05), cancelar (CU-06).
}
