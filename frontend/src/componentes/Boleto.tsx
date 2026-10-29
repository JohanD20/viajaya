import type { ReactNode } from 'react';
import type { Cotizacion } from '../servicios/contratos';
import { formatearFecha, formatearMonto, personasTexto } from '../utilidades/formato';

/** CU-02 · Desglose de la cotización (RN-03) con forma de boleto de excursión. */
export function Boleto({ cotizacion, accion }: { cotizacion: Cotizacion; accion?: ReactNode }) {
  const c = cotizacion;
  return (
    <section aria-labelledby="boleto-destino" className="boleto">
      <div className="p-6">
        <h2 id="boleto-destino" className="text-2xl font-bold leading-tight">
          {c.destino.nombre}
        </h2>
        <p className="mt-1 text-tinta-suave first-letter:uppercase">
          {formatearFecha(c.fecha)}
        </p>

        <dl className="cifra mt-5 grid grid-cols-[1fr_auto] gap-x-4 gap-y-2">
          <dt>Precio por persona</dt>
          <dd className="text-right">{formatearMonto(c.precioBase)}</dd>
          <dt>Subtotal ({personasTexto(c.personas)})</dt>
          <dd className="text-right">{formatearMonto(c.subtotal)}</dd>
          <dt>IVA ({Math.round(c.tasaIva * 100)} %)</dt>
          <dd className="text-right">{formatearMonto(c.iva)}</dd>
        </dl>
      </div>

      <div className="boleto-talon px-6 pb-6 pt-5">
        <p className="flex items-baseline justify-between gap-4">
          <span className="font-bold">Total a pagar</span>
          <span className="cifra font-display text-3xl font-extrabold">{formatearMonto(c.montoTotal)}</span>
        </p>
        {accion && <div className="mt-4">{accion}</div>}
      </div>
    </section>
  );
}
