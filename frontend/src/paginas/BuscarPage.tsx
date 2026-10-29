import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Aviso } from '../componentes/Aviso';
import { Boleto } from '../componentes/Boleto';
import { ListaDestinos } from '../componentes/ListaDestinos';
import { useDestinos } from '../hooks/useDestinos';
import type { Cotizacion } from '../servicios/contratos';
import { ErrorApi } from '../servicios/http';
import { useServicios } from '../servicios/ServiciosProvider';
import { espacios, mananaEnCostaRica } from '../utilidades/formato';

/** CU-01 Buscar destinos + CU-02 Cotizar reserva. */
export function BuscarPage() {
  const { destinos: apiDestinos, reservas: apiReservas } = useServicios();
  const { destinos, cargando, error: errorCarga } = useDestinos();

  const [destinoId, setDestinoId] = useState('');
  const [fecha, setFecha] = useState('');
  const [personas, setPersonas] = useState(1);
  const [consultando, setConsultando] = useState(false);
  const [cotizacion, setCotizacion] = useState<Cotizacion | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [errorApi, setErrorApi] = useState<ErrorApi | null>(null);

  const limpiarResultado = () => {
    setCotizacion(null);
    setAviso(null);
    setErrorApi(null);
  };

  async function consultar(evento: FormEvent) {
    evento.preventDefault();
    limpiarResultado();
    if (!destinoId) {
      setAviso('Elija un destino de la lista.');
      return;
    }
    setConsultando(true);
    try {
      const disponibilidad = await apiDestinos.disponibilidad(destinoId, fecha, personas);
      if (!disponibilidad.alcanza) {
        // Flujo 6a de CU-01: se informa el cupo y no se cotiza.
        setAviso(
          disponibilidad.disponibles === 0
            ? 'Cupo agotado para esa fecha. Pruebe con otra fecha.'
            : `Cupo insuficiente: quedan ${espacios(disponibilidad.disponibles)} para esa fecha. Pruebe con otra fecha o menos personas.`,
        );
        return;
      }
      setCotizacion(await apiReservas.cotizar({ destinoId, fecha, personas }));
    } catch (e) {
      if (e instanceof ErrorApi) setErrorApi(e);
      else setAviso('Ocurrió un error inesperado. Intente de nuevo.');
    } finally {
      setConsultando(false);
    }
  }

  const errorFecha = errorApi?.errorDe('fecha');
  const errorPersonas = errorApi?.errorDe('personas');

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:py-12">
      <section aria-labelledby="titulo-destinos">
        <h1 id="titulo-destinos" className="max-w-[18ch] text-4xl font-extrabold leading-[1.05] sm:text-5xl">
          Elija su próxima excursión
        </h1>
        <p className="mt-3 max-w-prose text-lg text-tinta-suave">
          Vea el cupo del día y el precio final con IVA antes de reservar.
        </p>

        {cargando && <p className="mt-8 text-tinta-suave">Cargando destinos…</p>}
        {errorCarga && (
          <div className="mt-8">
            <Aviso tono="error">{errorCarga}</Aviso>
          </div>
        )}
        {!cargando && !errorCarga && destinos.length === 0 && (
          <div className="mt-8">
            <Aviso>No hay destinos disponibles en este momento.</Aviso>
          </div>
        )}

        {destinos.length > 0 && (
          <div className="mt-8">
            <ListaDestinos
              destinos={destinos}
              elegido={destinoId}
              alElegir={(id) => {
                setDestinoId(id);
                limpiarResultado();
              }}
            />
          </div>
        )}
      </section>

      <aside className="lg:sticky lg:top-6 lg:self-start">
        <form onSubmit={consultar} noValidate className="space-y-4 rounded-xl bg-superficie p-6 shadow-[0_0_0_1px_var(--color-linea)]">
          <div>
            <label htmlFor="fecha" className="etiqueta">
              Fecha del viaje
            </label>
            <input
              id="fecha"
              type="date"
              required
              min={mananaEnCostaRica()}
              value={fecha}
              onChange={(e) => {
                setFecha(e.target.value);
                limpiarResultado();
              }}
              aria-invalid={errorFecha ? true : undefined}
              aria-describedby={errorFecha ? 'error-fecha' : undefined}
              className="campo"
            />
            {errorFecha && (
              <p id="error-fecha" className="mt-1 text-sm text-error">
                {errorFecha}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="personas" className="etiqueta">
              Personas
            </label>
            <input
              id="personas"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              required
              value={personas}
              onChange={(e) => {
                setPersonas(Number(e.target.value));
                limpiarResultado();
              }}
              aria-invalid={errorPersonas ? true : undefined}
              aria-describedby={errorPersonas ? 'error-personas' : undefined}
              className="campo cifra"
            />
            {errorPersonas && (
              <p id="error-personas" className="mt-1 text-sm text-error">
                {errorPersonas}
              </p>
            )}
          </div>

          <button type="submit" className="boton-primario w-full" disabled={consultando}>
            {consultando ? 'Consultando cupo…' : 'Ver cupo y precio'}
          </button>
        </form>

        <div className="mt-6 space-y-4" aria-live="polite">
          {aviso && <Aviso tono="error">{aviso}</Aviso>}
          {errorApi && !errorFecha && !errorPersonas && <Aviso tono="error">{errorApi.message}</Aviso>}
          {cotizacion && (
            <Boleto
              cotizacion={cotizacion}
              accion={
                <Link
                  to="/reservar"
                  state={{ destinoId, fecha, personas }}
                  className="inline-flex w-full items-center justify-center rounded-control bg-tinta px-5 py-3 font-bold text-white hover:opacity-90"
                >
                  Reservar
                </Link>
              }
            />
          )}
        </div>
      </aside>
    </div>
  );
}
