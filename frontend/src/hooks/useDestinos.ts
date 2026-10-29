import { useEffect, useState } from 'react';
import type { Destino } from '../servicios/contratos';
import { ErrorApi } from '../servicios/http';
import { useServicios } from '../servicios/ServiciosProvider';

/** CU-01 paso 2 · Destinos activos. */
export function useDestinos() {
  const { destinos: api } = useServicios();
  const [destinos, setDestinos] = useState<Destino[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    api
      .listarActivos()
      .then((lista) => vigente && setDestinos(lista))
      .catch((e: unknown) =>
        vigente && setError(e instanceof ErrorApi ? e.message : 'No pudimos cargar los destinos.'),
      )
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [api]);

  return { destinos, cargando, error };
}
