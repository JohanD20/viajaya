import { useState } from 'react';
import type { Reserva } from '../servicios/contratos';

/**
 * Descarga el comprobante de la reserva en PDF. pdf-lib se carga solo al hacer
 * clic (import dinámico), así no aumenta el tamaño inicial de la aplicación.
 */
export function BotonPdf({ reserva, className = 'boton-secundario' }: { reserva: Reserva; className?: string }) {
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState(false);

  async function descargar() {
    setGenerando(true);
    setError(false);
    try {
      const { descargarPdfReserva } = await import('../utilidades/pdfReserva');
      await descargarPdfReserva(reserva);
    } catch {
      setError(true);
    } finally {
      setGenerando(false);
    }
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <button type="button" className={className} onClick={descargar} disabled={generando}>
        {generando ? 'Generando PDF…' : 'Descargar PDF'}
      </button>
      {error && (
        <span role="alert" className="text-sm text-error">
          No pudimos generar el PDF. Intente de nuevo.
        </span>
      )}
    </span>
  );
}
