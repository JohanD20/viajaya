import type { Destino } from '../servicios/contratos';
import { formatearMonto } from '../utilidades/formato';

/**
 * CU-01 · Destinos activos como filas de un tablero (no tarjetas): nombre a la
 * izquierda, precio por persona alineado a la derecha. Es un grupo de radios
 * nativos, así funciona con teclado y lector de pantalla sin código extra.
 */
export function ListaDestinos({
  destinos,
  elegido,
  alElegir,
}: {
  destinos: Destino[];
  elegido: string;
  alElegir: (id: string) => void;
}) {
  return (
    <fieldset>
      <legend className="sr-only">Destino</legend>
      <ul className="divide-y divide-linea border-y border-linea">
        {destinos.map((d) => {
          const activo = d.id === elegido;
          return (
            <li key={d.id}>
              <label
                className={`flex cursor-pointer items-start gap-4 border-l-4 px-4 py-4 transition-colors ${
                  activo ? 'border-caribe bg-superficie' : 'border-transparent hover:bg-superficie/60'
                }`}
              >
                <input
                  type="radio"
                  name="destino"
                  value={d.id}
                  checked={activo}
                  onChange={() => alElegir(d.id)}
                  className="mt-1.5 size-4 accent-caribe"
                />
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-xl font-bold">{d.nombre}</span>
                  {d.descripcion && <span className="mt-0.5 block text-tinta-suave">{d.descripcion}</span>}
                </span>
                <span className="cifra shrink-0 text-right">
                  <span className="block font-bold">{formatearMonto(d.precioBase)}</span>
                  <span className="block text-sm text-tinta-suave">por persona</span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}
