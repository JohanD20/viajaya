import type { ReactNode } from 'react';

type Tono = 'error' | 'exito' | 'info';

const ESTILOS: Record<Tono, string> = {
  error: 'border-error text-error',
  exito: 'border-exito text-exito',
  info: 'border-caribe text-tinta',
};

/**
 * Mensaje de estado. Los errores usan role="alert" para que los lectores de
 * pantalla los anuncien (RNF-09). El texto debe nombrar la regla incumplida.
 */
export function Aviso({ tono = 'info', children }: { tono?: Tono; children: ReactNode }) {
  return (
    <div
      role={tono === 'error' ? 'alert' : 'status'}
      className={`border-l-4 bg-superficie px-4 py-3 ${ESTILOS[tono]}`}
    >
      {children}
    </div>
  );
}
