import { useEffect, useState } from 'react';

/**
 * true cuando `activo` lleva más de `ms` milisegundos encendido. Sirve para
 * mostrar un aviso solo si la API tarda (por ejemplo, cuando el plan gratuito
 * de Render la está despertando), sin parpadeos en cargas rápidas.
 */
export function useTardanza(activo: boolean, ms = 3000): boolean {
  const [tarde, setTarde] = useState(false);
  useEffect(() => {
    if (!activo) return;
    const temporizador = setTimeout(() => setTarde(true), ms);
    return () => {
      clearTimeout(temporizador);
      setTarde(false);
    };
  }, [activo, ms]);
  return activo && tarde;
}
