import { useState, type FormEvent } from 'react';
import { Aviso } from '../componentes/Aviso';
import { Boleto } from '../componentes/Boleto';
import { BotonPdf } from '../componentes/BotonPdf';
import { Campo } from '../componentes/Campo';
import type { Reserva } from '../servicios/contratos';
import { ErrorApi } from '../servicios/http';
import { useServicios } from '../servicios/ServiciosProvider';
import { formatearFecha, mananaEnCostaRica } from '../utilidades/formato';

const aError = (e: unknown) =>
  e instanceof ErrorApi ? e : new ErrorApi(0, 'Error', 'Ocurrió un error inesperado. Intente de nuevo.');

/** CU-04 Consultar reserva, con CU-05 Cambiar fecha y CU-06 Cancelar (extend). */
export function MiReservaPage() {
  const { reservas } = useServicios();
  const [credenciales, setCredenciales] = useState({ codigo: '', correo: '' });
  const [reserva, setReserva] = useState<Reserva | null>(null);
  const [error, setError] = useState<ErrorApi | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [nuevaFecha, setNuevaFecha] = useState('');
  const [confirmandoCancelacion, setConfirmandoCancelacion] = useState(false);

  async function ejecutar(accion: () => Promise<Reserva>, mensajeExito?: string) {
    setError(null);
    setExito(null);
    setOcupado(true);
    try {
      setReserva(await accion());
      if (mensajeExito) setExito(mensajeExito);
      setConfirmandoCancelacion(false);
      setNuevaFecha('');
    } catch (e) {
      setError(aError(e));
    } finally {
      setOcupado(false);
    }
  }

  const consultar = (e: FormEvent) => {
    e.preventDefault();
    setReserva(null);
    void ejecutar(() => reservas.consultar(credenciales.codigo, credenciales.correo));
  };

  const cambiarFecha = (e: FormEvent) => {
    e.preventDefault();
    if (!reserva) return;
    void ejecutar(
      () => reservas.cambiarFecha(reserva.codigo, credenciales.correo, nuevaFecha),
      `Listo: su reserva ahora es para el ${formatearFecha(nuevaFecha)}.`,
    );
  };

  const cancelar = () => {
    if (!reserva) return;
    void ejecutar(() => reservas.cancelar(reserva.codigo, credenciales.correo), 'Su reserva fue cancelada y los espacios quedaron libres.');
  };

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:py-12">
      <section aria-labelledby="titulo-mi-reserva">
        <h1 id="titulo-mi-reserva" className="text-4xl font-extrabold">
          Mi reserva
        </h1>
        <p className="mt-3 text-lg text-tinta-suave">Escriba el código que recibió al reservar y el correo que usó.</p>

        <form onSubmit={consultar} noValidate className="mt-8 space-y-5">
          <Campo
            id="codigo"
            etiqueta="Código de confirmación"
            placeholder="VY-XXXXXX"
            autoComplete="off"
            required
            value={credenciales.codigo}
            onChange={(e) => setCredenciales((c) => ({ ...c, codigo: e.target.value.toUpperCase() }))}
            error={!reserva ? error?.errorDe('codigo') : undefined}
            className="cifra uppercase"
          />
          <Campo
            id="correo"
            etiqueta="Correo"
            type="email"
            autoComplete="email"
            required
            value={credenciales.correo}
            onChange={(e) => setCredenciales((c) => ({ ...c, correo: e.target.value }))}
            error={!reserva ? error?.errorDe('correo') : undefined}
          />
          <button type="submit" className="boton-primario w-full" disabled={ocupado}>
            {ocupado && !reserva ? 'Buscando…' : 'Buscar reserva'}
          </button>
        </form>
        {!reserva && error && error.errores.length === 0 && (
          <div className="mt-4">
            <Aviso tono="error">{error.message}</Aviso>
          </div>
        )}
      </section>

      {reserva && (
        <section aria-label="Detalle de la reserva" className="space-y-6">
          {exito && <Aviso tono="exito">{exito}</Aviso>}
          {error && <Aviso tono="error">{error.errorDe('fecha') ?? error.message}</Aviso>}

          <Boleto datos={reserva} />
          <BotonPdf reserva={reserva} />

          {reserva.estadoReserva === 'Cancelada' && (
            <Aviso>Esta reserva está cancelada. Para viajar, haga una reserva nueva.</Aviso>
          )}
          {reserva.estadoReserva !== 'Cancelada' && !reserva.modificable && (
            <Aviso>
              Faltan 48 horas o menos para la excursión: ya no puede cambiar la fecha ni cancelar desde aquí. Si lo necesita,
              comuníquese con la agencia.
            </Aviso>
          )}

          {reserva.modificable && (
            <div className="grid gap-6 md:grid-cols-2">
              <form onSubmit={cambiarFecha} className="space-y-3 border-t-4 border-caribe pt-4">
                <h2 className="text-xl font-bold">Cambiar fecha</h2>
                <Campo
                  id="nuevaFecha"
                  etiqueta="Nueva fecha"
                  type="date"
                  required
                  min={mananaEnCostaRica()}
                  value={nuevaFecha}
                  onChange={(e) => setNuevaFecha(e.target.value)}
                />
                <button type="submit" className="boton-primario w-full" disabled={ocupado || !nuevaFecha}>
                  {ocupado ? 'Cambiando…' : 'Cambiar fecha'}
                </button>
              </form>

              <div className="space-y-3 border-t-4 border-error pt-4">
                <h2 className="text-xl font-bold">Cancelar reserva</h2>
                {!confirmandoCancelacion ? (
                  <>
                    <p className="text-tinta-suave">La cancelación es definitiva y libera los espacios reservados.</p>
                    <button type="button" className="boton-secundario w-full" onClick={() => setConfirmandoCancelacion(true)}>
                      Cancelar reserva
                    </button>
                  </>
                ) : (
                  <>
                    <p role="alert" className="font-bold">¿Seguro que desea cancelar {reserva.codigo}? No se puede deshacer.</p>
                    <button
                      type="button"
                      className="inline-flex w-full items-center justify-center rounded-control bg-error px-5 py-3 font-bold text-white hover:opacity-90"
                      onClick={cancelar}
                      disabled={ocupado}
                    >
                      {ocupado ? 'Cancelando…' : 'Sí, cancelar la reserva'}
                    </button>
                    <button type="button" className="boton-secundario w-full" onClick={() => setConfirmandoCancelacion(false)}>
                      No, conservarla
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
