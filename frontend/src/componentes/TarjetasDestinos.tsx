import type { Destino } from '../servicios/contratos';
import { formatearMonto } from '../utilidades/formato';
import { IconoPersonas } from './Iconos';
import { PortadaDestino } from './PortadaDestino';

/**
 * CU-01 · Destinos activos como tarjetas con foto. Cada tarjeta es un radio
 * nativo (oculto visualmente): se elige con clic o con las flechas del teclado
 * y el lector de pantalla anuncia "Destino, grupo de opciones".
 */
export function TarjetasDestinos({
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
      <ul className="grid gap-5 sm:grid-cols-2">
        {destinos.map((d) => {
          const activo = d.id === elegido;
          return (
            <li key={d.id}>
              <label
                className={`group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-xl bg-white shadow-[0_1px_2px_rgb(19_48_43/0.08),0_4px_16px_rgb(19_48_43/0.06)] transition has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-caribe motion-safe:hover:-translate-y-0.5 ${
                  activo ? 'ring-3 ring-caribe' : 'ring-1 ring-linea hover:ring-caribe/50'
                }`}
              >
                <input
                  type="radio"
                  name="destino"
                  value={d.id}
                  checked={activo}
                  onChange={() => alElegir(d.id)}
                  className="sr-only"
                />
                <span className="block aspect-[16/9] overflow-hidden bg-superficie">
                  <PortadaDestino
                    nombre={d.nombre}
                    imagenUrl={d.imagenUrl}
                    className="transition-transform duration-500 motion-safe:group-hover:scale-[1.03]"
                  />
                </span>
                {activo && (
                  <span className="absolute top-3 right-3 rounded-full bg-caribe px-3 py-1 text-sm font-bold text-white shadow">
                    Elegido
                  </span>
                )}
                <span className="flex flex-1 flex-col gap-1 p-4">
                  <span className="font-display text-xl leading-tight font-bold">{d.nombre}</span>
                  {d.descripcion && <span className="line-clamp-2 text-sm text-tinta-suave">{d.descripcion}</span>}
                  <span className="mt-1 flex items-center gap-1.5 text-sm text-tinta-suave">
                    <IconoPersonas className="size-4 shrink-0" />
                    Hasta {d.capacidadMaximaDiaria} personas por día
                  </span>
                  <span className="mt-auto flex items-end justify-between gap-3 pt-3">
                    <span className="text-sm text-tinta-suave">
                      Desde
                      <span className="block">por persona, sin IVA</span>
                    </span>
                    <span className="cifra font-display text-2xl font-extrabold">{formatearMonto(d.precioBase)}</span>
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}
