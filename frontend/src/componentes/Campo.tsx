import type { InputHTMLAttributes } from 'react';

interface PropsCampo extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  etiqueta: string;
  /** Mensaje de error del servidor para este campo (ErrorApi.errorDe). */
  error?: string | undefined;
  /** Texto de ayuda bajo el campo. */
  ayuda?: string;
}

/** Entrada con etiqueta, ayuda y error accesibles (RNF-09). */
export function Campo({ id, etiqueta, error, ayuda, className = '', ...props }: PropsCampo) {
  const descripcion = [error ? `${id}-error` : null, ayuda ? `${id}-ayuda` : null].filter(Boolean).join(' ');
  return (
    <div>
      <label htmlFor={id} className="etiqueta">
        {etiqueta}
      </label>
      <input
        id={id}
        name={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={descripcion || undefined}
        className={`campo ${className}`}
        {...props}
      />
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
