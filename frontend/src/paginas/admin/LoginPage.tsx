import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Aviso } from '../../componentes/Aviso';
import { Campo } from '../../componentes/Campo';
import { EsperaApi } from '../../componentes/EsperaApi';
import { IconoCandado, IconoCorreo, IconoEntrar, IconoEscudo, IconoFlechaIzquierda } from '../../componentes/Iconos';
import { ErrorApi } from '../../servicios/http';
import { useServicios } from '../../servicios/ServiciosProvider';

/** CU-07 · Iniciar sesión. */
export function LoginPage() {
  const { auth } = useServicios();
  const navegar = useNavigate();
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function iniciar(evento: FormEvent) {
    evento.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await auth.iniciarSesion(correo, password);
      navegar('/admin', { replace: true });
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No pudimos iniciar sesión. Intente de nuevo.');
      setPassword('');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-[0_1px_2px_rgb(19_48_43/0.08),0_8px_28px_rgb(19_48_43/0.10)] ring-1 ring-linea">
        <span className="flex size-11 items-center justify-center rounded-xl bg-caribe/10 text-caribe">
          <IconoEscudo className="size-6" />
        </span>
        <h1 className="mt-4 text-2xl font-extrabold">Acceso de la agencia</h1>
        <p className="mt-1 text-tinta-suave">Gestione destinos y reservas.</p>
        <form onSubmit={iniciar} className="mt-6 space-y-4">
          <Campo
            id="correo"
            etiqueta="Correo"
            icono={<IconoCorreo />}
            type="email"
            autoComplete="username"
            required
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
          />
          <Campo
            id="password"
            etiqueta="Contraseña"
            icono={<IconoCandado />}
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <Aviso tono="error">{error}</Aviso>}
          <EsperaApi activo={enviando} />
          <button type="submit" className="boton-primario w-full" disabled={enviando}>
            <IconoEntrar />
            {enviando ? 'Verificando…' : 'Iniciar sesión'}
          </button>
        </form>
        <Link to="/" className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-caribe hover:underline">
          <IconoFlechaIzquierda className="size-4" />
          Volver al sitio
        </Link>
      </div>
    </div>
  );
}
