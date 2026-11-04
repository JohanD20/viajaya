import type { SVGProps } from 'react';

/**
 * Íconos de línea de ViajaYa (24 × 24, trazo de 2 px, color = currentColor),
 * en el estilo del diseño de marca. Son decorativos: aria-hidden siempre.
 */
type Props = SVGProps<SVGSVGElement>;

function Base({ children, className = 'size-5', ...props }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...props}
    >
      {children}
    </svg>
  );
}

export const IconoCalendario = (p: Props) => (
  <Base {...p}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
    <path d="M3.5 10h17M8 3v4M16 3v4M8 14h2M14 14h2M8 17.5h2" />
  </Base>
);

export const IconoPersonas = (p: Props) => (
  <Base {...p}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3.5 19c.6-3.3 2.8-5 5.5-5s4.9 1.7 5.5 5" />
    <circle cx="17" cy="9" r="2.4" />
    <path d="M16.5 14c2.2.1 3.7 1.6 4 4.4" />
  </Base>
);

export const IconoBoleto = (p: Props) => (
  <Base {...p}>
    <path d="M3.5 7.5A1.5 1.5 0 0 1 5 6h14a1.5 1.5 0 0 1 1.5 1.5V10a2 2 0 0 0 0 4v2.5A1.5 1.5 0 0 1 19 18H5a1.5 1.5 0 0 1-1.5-1.5V14a2 2 0 0 0 0-4z" />
    <path d="M14 6v12" strokeDasharray="2 2.2" />
  </Base>
);

export const IconoEscudo = (p: Props) => (
  <Base {...p}>
    <path d="M12 3l7.5 3v5.5c0 4.6-3.2 8-7.5 9.5-4.3-1.5-7.5-4.9-7.5-9.5V6z" />
    <path d="M9 12l2 2 4-4" />
  </Base>
);

export const IconoCorreo = (p: Props) => (
  <Base {...p}>
    <rect x="3" y="5.5" width="18" height="13" rx="2" />
    <path d="M3.5 7l8.5 6 8.5-6" />
  </Base>
);

export const IconoTelefono = (p: Props) => (
  <Base {...p}>
    <path d="M6.6 3.5h2.6l1.4 4-2 1.3a11 11 0 0 0 6.6 6.6l1.3-2 4 1.4v2.6a2 2 0 0 1-2.1 2A16.5 16.5 0 0 1 4.6 5.6a2 2 0 0 1 2-2.1z" />
  </Base>
);

export const IconoUsuario = (p: Props) => (
  <Base {...p}>
    <circle cx="12" cy="8.5" r="3.8" />
    <path d="M4.5 20c.9-3.8 3.8-5.8 7.5-5.8s6.6 2 7.5 5.8" />
  </Base>
);

export const IconoCandado = (p: Props) => (
  <Base {...p}>
    <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
    <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3M12 14.5v2.5" />
  </Base>
);

export const IconoCodigo = (p: Props) => (
  <Base {...p}>
    <path d="M5 9h14M5 15h14M10 4l-2 16M16 4l-2 16" />
  </Base>
);

export const IconoBuscar = (p: Props) => (
  <Base {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M20 20l-4.2-4.2" />
  </Base>
);

export const IconoFlechaIzquierda = (p: Props) => (
  <Base {...p}>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </Base>
);

export const IconoEntrar = (p: Props) => (
  <Base {...p}>
    <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 16l4-4-4-4M14 12H4" />
  </Base>
);

export const IconoDescargar = (p: Props) => (
  <Base {...p}>
    <path d="M12 4v11M7 10.5l5 5 5-5M5 20h14" />
  </Base>
);
