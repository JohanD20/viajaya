import type { FechaISO, NuevaReserva, Reserva, ReservaDetalle, Uuid } from '../../models/dominio';
import { EstadoReserva, type EstadoPagoId, type EstadoReservaId } from '../../models/estados';
import type { ReservaRepository } from '../../ports/repositorios';
import { aCentimos, aTextoDecimal, tasaAPorcentaje } from '../../shared/dinero';
import type { Consultor } from './consultor';

interface FilaReserva {
  id: string;
  codigo_confirmacion: string;
  cliente_id: string;
  destino_id: string;
  estado_reserva_id: number;
  fecha_viaje: string;
  cantidad_personas: number;
  precio_base_aplicado: string;
  tasa_iva_aplicada: string;
}

interface FilaDetalle {
  id: string;
  codigo_confirmacion: string;
  fecha_viaje: string;
  cantidad_personas: number;
  precio_base_aplicado: string;
  tasa_iva_aplicada: string;
  subtotal: string;
  iva: string;
  monto_total: string;
  estado_reserva_id: number;
  estado_pago_id: number | null;
  tarjeta_ultimos4: string | null;
  cliente_nombre: string;
  cliente_correo: string;
  cliente_telefono: string;
  destino_id: string;
  destino_nombre: string;
  creado_en: Date;
}

function aReserva(f: FilaReserva): Reserva {
  return {
    id: f.id,
    codigoConfirmacion: f.codigo_confirmacion,
    clienteId: f.cliente_id,
    destinoId: f.destino_id,
    estadoReservaId: f.estado_reserva_id as EstadoReservaId,
    fechaViaje: f.fecha_viaje,
    cantidadPersonas: f.cantidad_personas,
    precioBaseAplicadoCentimos: aCentimos(f.precio_base_aplicado),
    tasaIvaPorcentaje: tasaAPorcentaje(f.tasa_iva_aplicada),
  };
}

function aDetalle(f: FilaDetalle): ReservaDetalle {
  return {
    id: f.id,
    codigoConfirmacion: f.codigo_confirmacion,
    fechaViaje: f.fecha_viaje,
    cantidadPersonas: f.cantidad_personas,
    precioBaseCentimos: aCentimos(f.precio_base_aplicado),
    subtotalCentimos: aCentimos(f.subtotal),
    ivaCentimos: aCentimos(f.iva),
    totalCentimos: aCentimos(f.monto_total),
    tasaIvaPorcentaje: tasaAPorcentaje(f.tasa_iva_aplicada),
    estadoReservaId: f.estado_reserva_id as EstadoReservaId,
    estadoPagoId: (f.estado_pago_id ?? null) as EstadoPagoId | null,
    tarjetaUltimos4: f.tarjeta_ultimos4,
    cliente: { nombre: f.cliente_nombre, correo: f.cliente_correo, telefono: f.cliente_telefono },
    destino: { id: f.destino_id, nombre: f.destino_nombre },
    creadoEn: new Date(f.creado_en).toISOString(),
  };
}

export class PgReservaRepository implements ReservaRepository {
  constructor(private readonly db: Consultor) {}

  async sumarPersonasActivas(
    destinoId: Uuid,
    fecha: FechaISO,
    excluirReservaId?: Uuid,
  ): Promise<number> {
    const rows = await this.db.query<{ total: number }>(
      `SELECT COALESCE(SUM(cantidad_personas), 0)::int AS total
         FROM reservas
        WHERE destino_id = $1
          AND fecha_viaje = $2
          AND estado_reserva_id <> $3
          AND ($4::uuid IS NULL OR id <> $4::uuid)`,
      [destinoId, fecha, EstadoReserva.Cancelada, excluirReservaId ?? null],
    );
    return rows[0]?.total ?? 0;
  }

  async existeCodigo(codigo: string): Promise<boolean> {
    const rows = await this.db.query<{ existe: boolean }>(
      'SELECT EXISTS (SELECT 1 FROM reservas WHERE codigo_confirmacion = $1) AS existe',
      [codigo],
    );
    return rows[0]?.existe ?? false;
  }

  async crear(d: NuevaReserva): Promise<Uuid> {
    const rows = await this.db.query<{ id: string }>(
      `INSERT INTO reservas (codigo_confirmacion, cliente_id, destino_id, estado_reserva_id,
                             fecha_viaje, cantidad_personas, precio_base_aplicado, tasa_iva_aplicada)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        d.codigoConfirmacion,
        d.clienteId,
        d.destinoId,
        d.estadoReservaId,
        d.fechaViaje,
        d.cantidadPersonas,
        aTextoDecimal(d.precioBaseAplicadoCentimos),
        aTextoDecimal(d.tasaIvaPorcentaje),
      ],
    );
    const fila = rows[0];
    if (!fila) throw new Error('La inserción de la reserva no devolvió un id.');
    return fila.id;
  }

  async buscarDetallePorCodigoYCorreo(codigo: string, correo: string): Promise<ReservaDetalle | null> {
    const rows = await this.db.query<FilaDetalle>(
      `SELECT * FROM v_reservas_detalle
        WHERE codigo_confirmacion = $1 AND cliente_correo = $2`,
      [codigo, correo],
    );
    return rows[0] ? aDetalle(rows[0]) : null;
  }

  async bloquearPorCodigoYCorreo(codigo: string, correo: string): Promise<Reserva | null> {
    const rows = await this.db.query<FilaReserva>(
      `SELECT r.id, r.codigo_confirmacion, r.cliente_id, r.destino_id, r.estado_reserva_id,
              r.fecha_viaje, r.cantidad_personas, r.precio_base_aplicado, r.tasa_iva_aplicada
         FROM reservas r
         JOIN clientes c ON c.id = r.cliente_id
        WHERE r.codigo_confirmacion = $1 AND c.correo = $2
          FOR UPDATE OF r`,
      [codigo, correo],
    );
    return rows[0] ? aReserva(rows[0]) : null;
  }

  async obtenerDetalle(id: Uuid): Promise<ReservaDetalle | null> {
    const rows = await this.db.query<FilaDetalle>(
      'SELECT * FROM v_reservas_detalle WHERE id = $1',
      [id],
    );
    return rows[0] ? aDetalle(rows[0]) : null;
  }

  async cambiarFecha(id: Uuid, fecha: FechaISO): Promise<void> {
    await this.db.query('UPDATE reservas SET fecha_viaje = $2 WHERE id = $1', [id, fecha]);
  }

  async cambiarEstado(id: Uuid, estado: EstadoReservaId): Promise<void> {
    await this.db.query('UPDATE reservas SET estado_reserva_id = $2 WHERE id = $1', [id, estado]);
  }
}
