import { formatearTarjeta, marcaTarjeta } from '../utilidades/tarjeta';

/**
 * Campo de número de tarjeta: agrupa los dígitos de 4 en 4 mientras se
 * escribe, muestra la marca y usa el teclado numérico en el celular.
 * `valor` y `alCambiar` trabajan con el texto formateado; para la API se usa
 * digitosTarjeta(). Mismo marcado accesible que Campo (RNF-09).
 */
export function CampoTarjeta({
  valor,
  alCambiar,
  error,
  ayuda,
}: {
  valor: string;
  alCambiar: (formateado: string) => void;
  error?: string | undefined;
  ayuda?: string;
}) {
  const id = 'numeroTarjeta';
  const marca = marcaTarjeta(valor);
  const descripcion = [error ? `${id}-error` : null, ayuda ? `${id}-ayuda` : null].filter(Boolean).join(' ');

  return (
    <div>
      <label htmlFor={id} className="etiqueta">
        Número de tarjeta
      </label>
      <div className="relative">
        <svg aria-hidden="true" viewBox="0 0 24 24" className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-tinta-suave">
          <rect x="2.5" y="5" width="19" height="14" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M2.5 9.5h19" stroke="currentColor" strokeWidth="2" />
          <path d="M6 15h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <input
          id={id}
          name={id}
          type="text"
          inputMode="numeric"
          autoComplete="cc-number"
          placeholder="0000 - 0000 - 0000 - 0000"
          maxLength={31}
          required
          value={valor}
          onChange={(e) => alCambiar(formatearTarjeta(e.target.value))}
          aria-invalid={error ? true : undefined}
          aria-describedby={descripcion || undefined}
          className="campo cifra pr-28 pl-11 tracking-wide"
        />
        {marca && (
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 rounded bg-superficie px-2 py-0.5 text-xs font-bold text-tinta-suave ring-1 ring-linea">
            {marca}
          </span>
        )}
      </div>
      {ayuda && (
        <p id={`${id}-ayuda`} className="mt-1 text-sm text-tinta-suave">
          {ayuda}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm text-error">
          {error}
        </p>
      )}
    </div>
  );
}
