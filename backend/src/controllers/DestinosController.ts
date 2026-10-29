import type { RequestHandler } from 'express';
import type { DestinoService } from '../services/DestinoService';
import { consultaDisponibilidad, parametroId } from '../validation/esquemas';
import { destinoPublico } from './presentadores';

/**
 * Controlador: solo traduce HTTP ⇄ servicio (SAD 2.2). Valida el formato con
 * zod, llama al servicio y presenta la respuesta. No contiene reglas de negocio.
 */
export class DestinosController {
  constructor(private readonly destinos: DestinoService) {}

  /** GET /api/destinos · CU-01 */
  listarActivos: RequestHandler = async (_req, res) => {
    const destinos = await this.destinos.listarActivos();
    res.json(destinos.map(destinoPublico));
  };

  /** GET /api/destinos/:id/disponibilidad?fecha=&personas= · CU-01 */
  disponibilidad: RequestHandler = async (req, res) => {
    const { id } = parametroId.parse(req.params);
    const { fecha, personas } = consultaDisponibilidad.parse(req.query);
    res.json(await this.destinos.consultarDisponibilidad(id, fecha, personas));
  };
}
