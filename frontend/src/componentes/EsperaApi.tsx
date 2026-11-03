import { useEffect, useState } from 'react';
import { useTardanza } from '../hooks/useTardanza';

/** Frases para la espera mientras el servidor gratuito se despierta. */
export const FRASES_ESPERA = [
  'El servidor estaba dormido en una hamaca en Cahuita. Ya lo despertamos.',
  'Se está tomando un cafecito antes de atenderle. Ya casi.',
  'Un perezoso fue a traer los destinos. Va rápido… para ser perezoso.',
  'Esperando a que el servidor termine su gallo pinto.',
  'El servidor fue a ver tortugas a Tortuguero. Ya viene de vuelta.',
  'Subiendo la cuesta como bus a Monteverde. Paciencia, que ya llega.',
] as const;

const CAMBIO_MS = 4500;

/**
 * Aviso que aparece solo si una carga dura más de 3 segundos. Explica la
 * demora del plan gratuito de Render con una frase que cambia cada pocos
 * segundos. Lo anuncian los lectores de pantalla (role="status").
 */
export function EsperaApi({ activo }: { activo: boolean }) {
  const tarde = useTardanza(activo, 3000);
  const [indice, setIndice] = useState(0);

  useEffect(() => {
    if (!tarde) return;
    setIndice(Math.floor(Date.now() / 1000) % FRASES_ESPERA.length); // empieza en una frase distinta cada vez
    const intervalo = setInterval(() => setIndice((i) => (i + 1) % FRASES_ESPERA.length), CAMBIO_MS);
    return () => clearInterval(intervalo);
  }, [tarde]);

  if (!tarde) return null;
  return (
    <div role="status" className="flex items-start gap-3 rounded-xl border border-sol/60 bg-sol/15 px-4 py-3">
      <span aria-hidden="true" className="mt-1.5 size-2.5 shrink-0 rounded-full bg-sol motion-safe:animate-ping" />
      <p>
        <span className="block font-bold">{FRASES_ESPERA[indice]}</span>
        <span className="block text-sm text-tinta-suave">
          La primera visita después de un rato puede tardar hasta un minuto: el servidor se duerme cuando nadie lo usa.
        </span>
      </p>
    </div>
  );
}
