/**
 * Logo de ViajaYa: pin de ubicación con una "V" que termina en camino y el
 * punto amarillo del sol. "Viaja" en tinta y "Ya" en caribe, como en el
 * diseño de marca. El mismo dibujo está en public/favicon.svg.
 */
export function MarcaViajaYa({ className = 'size-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 56" aria-hidden="true" className={className}>
      <path
        d="M24 2C12.4 2 3 11.2 3 22.6c0 14.3 17.6 29.3 19.6 31 .8.7 2 .7 2.8 0C27.4 51.9 45 36.9 45 22.6 45 11.2 35.6 2 24 2z"
        fill="#13302b"
      />
      <path d="M14 14.5l9.4 21.6c3.7-10.4 8.2-15.6 14.1-18" fill="none" stroke="#ffffff" strokeWidth="5.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="35.8" cy="10.6" r="4.6" fill="#e8b321" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="flex items-center gap-2">
      <MarcaViajaYa />
      <span className="font-display text-2xl font-extrabold tracking-tight">
        Viaja<span className="text-caribe">Ya</span>
      </span>
    </span>
  );
}
