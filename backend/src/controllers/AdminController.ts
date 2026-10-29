import type { RequestHandler } from 'express';
import { adminActual } from '../middlewares/autenticacion';
import { EstadoPago, EstadoReserva } from '../models/estados';
import type { AdminReservaService } from '../services/AdminReservaService';
import type { DestinoService } from '../services/DestinoService';
import { aCentimos } from '../shared/dinero';
import {
  cuerpoActualizarPago,
  cuerpoCrearDestino,
  cuerpoEditarDestino,
  cuerpoEliminarReserva,
  filtroDestinos,
  filtroReservas,
  parametroId,
} from '../validation/esquemas';
import { destinoAdmin, reservaAdmin } from './presentadores';

/**
 * Módulo de administración (CU-08 a CU-16). Todas sus rutas cuelgan de
 * /api/admin, protegido en bloque por el middleware JWT (S-04).
 */
export class AdminController {
  constructor(
    private readonly destinos: DestinoService,
    private readonly reservas: AdminReservaService,
  ) {}

  // ---------------------------------------------------------------- destinos

  /** GET /api/admin/destinos · CU-09 */
  listarDestinos: RequestHandler = async (req, res) => {
    const { estado, nombre } = filtroDestinos.parse(req.query);
    const lista = await this.destinos.listarParaAdmin({
      ...(estado === 'todos' ? {} : { activo: estado === 'activo' }),
      ...(nombre ? { nombre } : {}),
    });
    res.json(lista.map(destinoAdmin));
  };

  /** POST /api/admin/destinos · CU-08 */
  crearDestino: RequestHandler = async (req, res) => {
    const d = cuerpoCrearDestino.parse(req.body);
    const creado = await this.destinos.crear({
      nombre: d.nombre,
      descripcion: d.descripcion,
      precioBaseCentimos: aCentimos(d.precioBase),
      capacidadMaximaDiaria: d.capacidadMaximaDiaria,
    });
    res.status(201).json(destinoAdmin(creado));
  };

  /** PUT /api/admin/destinos/:id · CU-10 */
  editarDestino: RequestHandler = async (req, res) => {
    const { id } = parametroId.parse(req.params);
    const d = cuerpoEditarDestino.parse(req.body);
    const actualizado = await this.destinos.actualizar(id, {
      nombre: d.nombre,
      descripcion: d.descripcion,
      precioBaseCentimos: aCentimos(d.precioBase),
      capacidadMaximaDiaria: d.capacidadMaximaDiaria,
      activo: d.activo,
    });
    res.json(destinoAdmin(actualizado));
  };

  /** PATCH /api/admin/destinos/:id/desactivacion · CU-11 */
  desactivarDestino: RequestHandler = async (req, res) => {
    const { id } = parametroId.parse(req.params);
    await this.destinos.desactivar(id);
    res.status(204).end();
  };

  // ---------------------------------------------------------------- reservas

  /** GET /api/admin/reservas · CU-12 */
  listarReservas: RequestHandler = async (req, res) => {
    const f = filtroReservas.parse(req.query);
    const lista = await this.reservas.listar({
      ...(f.destinoId ? { destinoId: f.destinoId } : {}),
      ...(f.desde ? { desde: f.desde } : {}),
      ...(f.hasta ? { hasta: f.hasta } : {}),
      ...(f.estadoReserva ? { estadoReservaId: EstadoReserva[f.estadoReserva] } : {}),
      ...(f.estadoPago ? { estadoPagoId: EstadoPago[f.estadoPago] } : {}),
    });
    res.json(lista.map(reservaAdmin));
  };

  /** PATCH /api/admin/reservas/:id/aprobacion · CU-13 */
  aprobarReserva: RequestHandler = async (req, res) => {
    const { id } = parametroId.parse(req.params);
    res.json(reservaAdmin(await this.reservas.aprobar(id, adminActual(res))));
  };

  /** PATCH /api/admin/reservas/:id/cancelacion · CU-14 */
  cancelarReserva: RequestHandler = async (req, res) => {
    const { id } = parametroId.parse(req.params);
    res.json(reservaAdmin(await this.reservas.cancelar(id, adminActual(res))));
  };

  /** DELETE /api/admin/reservas/:id · CU-15 */
  eliminarReserva: RequestHandler = async (req, res) => {
    const { id } = parametroId.parse(req.params);
    const { codigoConfirmacion } = cuerpoEliminarReserva.parse(req.body ?? {});
    await this.reservas.eliminar(id, codigoConfirmacion);
    res.status(204).end();
  };

  /** PATCH /api/admin/reservas/:id/pago · CU-16 */
  actualizarPago: RequestHandler = async (req, res) => {
    const { id } = parametroId.parse(req.params);
    const { estadoPago } = cuerpoActualizarPago.parse(req.body);
    res.json(reservaAdmin(await this.reservas.actualizarPago(id, EstadoPago[estadoPago], adminActual(res))));
  };
}
