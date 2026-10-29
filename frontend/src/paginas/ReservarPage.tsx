import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Aviso } from '../componentes/Aviso';
import { Boleto } from '../componentes/Boleto';
import { Campo } from '../componentes/Campo';
import type { Cotizacion, Reserva, SolicitudCotizacion } from '../servicios/contratos';
import { ErrorApi } from '../servicios/http';
import { useServicios } from '../servicios/ServiciosProvider';

/** CU-03 · Crear reserva con pago simulado. Llega desde la cotización (CU-02). */
export function ReservarPage() {
  const { reservas } = useServicios();
  const solicitud = useLocation().state as SolicitudCotizacion | null;

  const [cotizacion, setCotizacion] = useState<Cotizacion | null>(null);
  const [errorCotizacion, setErrorCotizacion] = useState<string | null>(null);
  const [form, setForm] = useState({ nombre: '', correo: '', telefono: '', numeroTarjeta: '' });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<ErrorApi | null>(null);
  const [reserva, setReserva] = useState<Reserva | null>(null);

  // Vuelve a cotizar al entrar: el precio y el cupo pueden haber cambiado.
  useEffect(() => {
    if (!solicitud) return;
    let vigente = true;
    reservas
      .cotizar(solicitud)
      .then((c) => vigente && setCotizacion(c))
      .catch((e: unknown) => vigente && setErrorCotizacion(e instanceof ErrorApi ? e.message : 'No pudimos cotizar.'));
    return () => {
      vigente = false;
    };
  }, [reservas, solicitud]);

  if (!solicitud) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <h1 className="text-4xl font-extrabold">Elija primero su excursión</h1>
        <p className="mt-3 text-lg text-tinta-suave">Para reservar, elija un destino, una fecha y la cantidad de personas.</p>
        <Link to="/" className="boton-primario mt-8">
          Ver destinos
        </Link>
      </div>
    );
  }

  async function reservar(evento: FormEvent) {
    evento.preventDefault();
    if (!solicitud) return;
    setError(null);
    setEnviando(true);
    try {
      setReserva(await reservas.crear({ ...solicitud, ...form }));
      window.scrollTo({ top: 0 });
    } catch (e) {
      setError(e instanceof ErrorApi ? e : new ErrorApi(0, 'Error', 'Ocurrió un error inesperado. Intente de nuevo.'));
    } finally {
      setEnviando(false);
    }
  }

  const cambiar = (campo: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [campo]: e.target.value }));

  // ---------- Confirmación (CU-03 paso 9) ----------
  if (reserva) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10">
        <h1 className="text-4xl font-extrabold">Reserva registrada</h1>
        <p className="mt-3 text-lg text-tinta-suave">
          Guarde su código de confirmación. Con él y su correo puede consultar, cambiar la fecha o cancelar su reserva.
        </p>
        {reserva.estadoPago === 'Rechazado' && (
          <div className="mt-6">
            <Aviso tono="error">
              El pago fue rechazado. Su reserva quedó registrada y la agencia decidirá si la mantiene o la cancela.
            </Aviso>
          </div>
        )}
        <div className="mt-6">
          <Boleto datos={reserva} />
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/mi-reserva" className="boton-primario">
            Ir a Mi reserva
          </Link>
          <Link to="/" className="boton-secundario">
            Ver más destinos
          </Link>
        </div>
      </div>
    );
  }

  // ---------- Formulario (CU-03 pasos 2 y 3) ----------
  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:py-12">
      <section aria-labelledby="titulo-reservar">
        <h1 id="titulo-reservar" className="text-4xl font-extrabold">
          Complete su reserva
        </h1>
        <form onSubmit={reservar} noValidate className="mt-8 max-w-lg space-y-5">
          <Campo id="nombre" etiqueta="Nombre completo" autoComplete="name" required value={form.nombre} onChange={cambiar('nombre')} error={error?.errorDe('nombre')} />
          <Campo
            id="correo"
            etiqueta="Correo"
            type="email"
            autoComplete="email"
            required
            value={form.correo}
            onChange={cambiar('correo')}
            error={error?.errorDe('correo')}
            ayuda="Lo necesitará junto con el código para consultar su reserva."
          />
          <Campo id="telefono" etiqueta="Teléfono" type="tel" autoComplete="tel" required value={form.telefono} onChange={cambiar('telefono')} error={error?.errorDe('telefono')} />
          <Campo
            id="numeroTarjeta"
            etiqueta="Número de tarjeta"
            inputMode="numeric"
            autoComplete="off"
            required
            value={form.numeroTarjeta}
            onChange={cambiar('numeroTarjeta')}
            error={error?.errorDe('numeroTarjeta')}
            ayuda="Pago simulado: no se realiza ningún cobro. Solo guardamos los últimos 4 dígitos."
            className="cifra"
          />
          {error && error.errores.length === 0 && <Aviso tono="error">{error.message}</Aviso>}
          <button type="submit" className="boton-primario w-full sm:w-auto" disabled={enviando || !cotizacion}>
            {enviando ? 'Registrando reserva…' : 'Confirmar y pagar'}
          </button>
        </form>
      </section>

      <aside className="lg:sticky lg:top-6 lg:self-start">
        {errorCotizacion && <Aviso tono="error">{errorCotizacion}</Aviso>}
        {!cotizacion && !errorCotizacion && <p className="text-tinta-suave">Calculando el monto…</p>}
        {cotizacion && <Boleto datos={cotizacion} />}
      </aside>
    </div>
  );
}
