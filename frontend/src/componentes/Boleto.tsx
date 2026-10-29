import type { ReactNode } from 'react';
import type { Cotizacion, Reserva } from '../servicios/contratos';
import { formatearFecha, formatearMonto, personasTexto } from '../utilidades/formato';

/**
 * Desglose del monto (RN-03) con forma de boleto de excursión.
 * - Con una cotización (CU-02) muestra "Total a pagar".
 * - Con una reserva (CU-03 a CU-06) muestra además el código de confirmación y los estados.
 */
export function Boleto({ datos, accion }: { datos: Cotizacion | Reserva; accion?: ReactNode }) {
  const reserva = 'codigo' in datos ? datos : null;
  const cancelada = reserva?.estadoReserva === 'Cancelada';

  return (
    <section aria-labelledby="boleto-destino" className={`boleto ${cancelada ? 'opacity-80' : ''}`}>
      <div className="p-6">
        <h2 id="boleto-destino" className="text-2xl font-bold leading-tight">
          {datos.destino.nombre}
        </h2>
        <p className="mt-1 text-tinta-suave first-letter:uppercase">{formatearFecha(datos.fecha)}</p>

        <dl className="cifra mt-5 grid grid-cols-[1fr_auto] gap-x-4 gap-y-2">
          <dt>Precio por persona</dt>
          <dd className="text-right">{formatearMonto(datos.precioBase)}</dd>
          <dt>Subtotal ({personasTexto(datos.personas)})</dt>
          <dd className="text-right">{formatearMonto(datos.subtotal)}</dd>
          <dt>IVA ({Math.round(datos.tasaIva * 100)} %)</dt>
          <dd className="text-right">{formatearMonto(datos.iva)}</dd>
          {reserva && (
            <>
              <div className="col-span-2 my-1 border-t border-linea" role="presentation" />
              <dt>Estado de la reserva</dt>
              <dd className="text-right font-bold">{reserva.estadoReserva}</dd>
              <dt>Pago{reserva.tarjetaUltimos4 ? ` (tarjeta terminada en ${reserva.tarjetaUltimos4})` : ''}</dt>
              <dd className={`text-right font-bold ${reserva.estadoPago === 'Rechazado' ? 'text-error' : ''}`}>
                {reserva.estadoPago ?? 'Sin pago'}
              </dd>
            </>
          )}
        </dl>
      </div>

      <div className="boleto-talon px-6 pb-6 pt-5">
        {reserva && (
          <p className="mb-3">
            <span className="block text-sm font-bold">Código de confirmación</span>
            <span className="cifra block font-display text-3xl font-extrabold">{reserva.codigo}</span>
          </p>
        )}
        <p className="flex items-baseline justify-between gap-4">
          <span className="font-bold">{reserva ? 'Monto total' : 'Total a pagar'}</span>
          <span className={`cifra font-display font-extrabold ${reserva ? 'text-2xl' : 'text-3xl'}`}>
            {formatearMonto(datos.montoTotal)}
          </span>
        </p>
        {accion && <div className="mt-4">{accion}</div>}
      </div>
    </section>
  );
}
