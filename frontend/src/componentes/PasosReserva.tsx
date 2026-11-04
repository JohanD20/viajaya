const PASOS = ['Cotización', 'Datos y pago', 'Confirmación'] as const;

/** Indicador de avance del flujo de reserva (CU-02 → CU-03). `actual` va de 1 a 3. */
export function PasosReserva({ actual }: { actual: 1 | 2 | 3 }) {
  return (
    <nav aria-label="Pasos de la reserva" className="mb-8">
      <ol className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
        {PASOS.map((paso, i) => {
          const numero = i + 1;
          const hecho = numero < actual;
          const enCurso = numero === actual;
          return (
            <li key={paso} className="flex items-center gap-3" aria-current={enCurso ? 'step' : undefined}>
              {i > 0 && <span aria-hidden="true" className={`h-px w-8 ${hecho || enCurso ? 'bg-caribe' : 'bg-linea'}`} />}
              <span className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className={`flex size-7 items-center justify-center rounded-full text-xs font-bold ${
                    hecho ? 'bg-caribe text-white' : enCurso ? 'bg-tinta text-white' : 'bg-linea text-tinta-suave'
                  }`}
                >
                  {hecho ? '✓' : numero}
                </span>
                <span className={enCurso ? 'font-bold' : hecho ? 'text-tinta' : 'text-tinta-suave'}>
                  {paso}
                  {hecho && <span className="sr-only"> (completado)</span>}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
