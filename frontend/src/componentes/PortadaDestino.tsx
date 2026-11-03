import { useState } from 'react';

/**
 * Portada de un destino: la foto (imagenUrl) si existe y carga; si no, una
 * ilustración propia según el tipo de lugar (volcán, playa, río o bosque).
 * Así la tarjeta nunca queda vacía aunque el administrador no haya puesto foto
 * o el enlace se rompa.
 */
export function PortadaDestino({ nombre, imagenUrl, className = '' }: { nombre: string; imagenUrl: string | null; className?: string }) {
  const [rota, setRota] = useState(false);
  if (imagenUrl && !rota) {
    return (
      <img
        src={imagenUrl}
        alt=""
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setRota(true)}
        className={`h-full w-full object-cover ${className}`}
      />
    );
  }
  return <Ilustracion escena={escenaPara(nombre)} className={className} />;
}

type Escena = 'volcan' | 'playa' | 'rio' | 'bosque';

/** Elige la escena por palabras del nombre; si no reconoce ninguna, usa bosque. */
export function escenaPara(nombre: string): Escena {
  const n = nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/volcan|arenal|poas|irazu|rincon/.test(n)) return 'volcan';
  if (/playa|cahuita|manuel antonio|bahia|isla|costa/.test(n)) return 'playa';
  if (/rio|pacuare|canal|tortuguero|catarata|lago/.test(n)) return 'rio';
  return 'bosque';
}

// Colores de la paleta (docs/CONVENCIONES.md, sección 8) y tonos derivados.
const CIELO: Record<Escena, [string, string]> = {
  volcan: ['#f6d58a', '#e8b321'],
  playa: ['#cfe8e3', '#8fcac0'],
  rio: ['#dbeee9', '#a9d4cb'],
  bosque: ['#e3efe9', '#bcd9cf'],
};

function Ilustracion({ escena, className }: { escena: Escena; className: string }) {
  const [arriba, abajo] = CIELO[escena];
  const id = `cielo-${escena}`;
  return (
    <svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true" className={`h-full w-full ${className}`}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={arriba} />
          <stop offset="1" stopColor={abajo} />
        </linearGradient>
      </defs>
      <rect width="320" height="180" fill={`url(#${id})`} />
      <circle cx="250" cy={escena === 'volcan' ? 52 : 46} r="20" fill="#fdf3d0" opacity="0.9" />
      {escena === 'volcan' && (
        <>
          <path d="M0 150 L110 70 L140 64 L168 72 L320 150 V180 H0 Z" fill="#4a625c" />
          <path d="M110 70 L140 64 L168 72 L150 82 L128 80 Z" fill="#13302b" />
          <path d="M138 60 q-8 -18 6 -30 q-4 14 10 20 q-6 6 -16 10" fill="#ffffff" opacity="0.7" />
          <path d="M0 162 Q80 140 160 158 T320 150 V180 H0 Z" fill="#0e6b61" />
        </>
      )}
      {escena === 'playa' && (
        <>
          <path d="M0 118 H320 V180 H0 Z" fill="#0e6b61" />
          <path d="M0 126 Q40 120 80 126 T160 126 T240 126 T320 126" stroke="#cfe8e3" strokeWidth="3" fill="none" opacity="0.7" />
          <path d="M0 150 Q120 128 320 146 V180 H0 Z" fill="#f2e3b3" />
          <path d="M60 148 Q64 110 54 84" stroke="#13302b" strokeWidth="5" fill="none" strokeLinecap="round" />
          <path d="M54 84 q-24 -2 -34 12 M54 84 q-6 -22 10 -30 M54 84 q20 -10 34 4 M54 84 q18 6 22 24" stroke="#13302b" strokeWidth="5" fill="none" strokeLinecap="round" />
        </>
      )}
      {escena === 'rio' && (
        <>
          <path d="M0 110 Q60 80 120 104 T240 96 T320 104 V180 H0 Z" fill="#4a625c" />
          <path d="M0 132 Q80 112 160 128 T320 122 V180 H0 Z" fill="#0e6b61" />
          <path d="M120 180 Q150 150 170 140 Q200 128 220 128 Q200 140 196 152 Q190 168 210 180 Z" fill="#a9d4cb" />
          <path d="M150 166 q10 -6 20 0 M176 150 q8 -4 16 0" stroke="#ffffff" strokeWidth="2" fill="none" opacity="0.8" />
        </>
      )}
      {escena === 'bosque' && (
        <>
          <path d="M0 120 Q80 90 160 112 T320 104 V180 H0 Z" fill="#4a625c" />
          {[20, 70, 120, 170, 220, 270].map((x, i) => (
            <path key={x} d={`M${x} ${150 - (i % 2) * 14} l26 -${56 + (i % 3) * 8} l26 ${56 + (i % 3) * 8} Z`} fill={i % 2 ? '#13302b' : '#0e6b61'} />
          ))}
          <path d="M0 160 Q160 146 320 160 V180 H0 Z" fill="#13302b" />
        </>
      )}
    </svg>
  );
}
