/**
 * Marcadores de carga con la forma del contenido que viene. La animación
 * respeta "reducir movimiento" (motion-safe). Para los lectores de pantalla
 * solo se anuncia el texto `etiqueta`.
 */
const bloque = 'rounded-md bg-linea/70 motion-safe:animate-pulse';

export function TarjetasEsqueleto({ cantidad = 6, etiqueta = 'Cargando destinos…' }: { cantidad?: number; etiqueta?: string }) {
  return (
    <div aria-busy="true">
      <span className="sr-only">{etiqueta}</span>
      <ul aria-hidden="true" className="grid gap-5 sm:grid-cols-2">
        {Array.from({ length: cantidad }, (_, i) => (
          <li key={i} className="overflow-hidden rounded-xl bg-white ring-1 ring-linea">
            <div className="aspect-[16/9] bg-linea/60 motion-safe:animate-pulse" />
            <div className="space-y-3 p-4">
              <div className={`${bloque} h-6 w-2/3`} />
              <div className={`${bloque} h-4 w-full`} />
              <div className={`${bloque} h-4 w-4/5`} />
              <div className="flex items-end justify-between pt-2">
                <div className={`${bloque} h-8 w-24`} />
                <div className={`${bloque} h-8 w-20`} />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function FilasEsqueleto({ filas = 5, etiqueta }: { filas?: number; etiqueta: string }) {
  return (
    <div aria-busy="true" className="py-2">
      <span className="sr-only">{etiqueta}</span>
      <div aria-hidden="true" className="divide-y divide-linea">
        {Array.from({ length: filas }, (_, i) => (
          <div key={i} className="flex items-center gap-4 py-4">
            <div className={`${bloque} h-5 w-28`} />
            <div className={`${bloque} h-5 flex-1`} />
            <div className={`${bloque} h-5 w-24`} />
            <div className={`${bloque} h-5 w-20`} />
          </div>
        ))}
      </div>
    </div>
  );
}
