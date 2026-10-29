import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Aviso } from '../../componentes/Aviso';
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
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-3xl font-extrabold">Acceso de la agencia</h1>
      <form onSubmit={iniciar} className="mt-8 space-y-4">
        <div>
          <label htmlFor="correo" className="etiqueta">
            Correo
          </label>
          <input
            id="correo"
            type="email"
            autoComplete="username"
            required
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            className="campo"
          />
        </div>
        <div>
          <label htmlFor="password" className="etiqueta">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="campo"
          />
        </div>
        {error && <Aviso tono="error">{error}</Aviso>}
        <button type="submit" className="boton-primario w-full" disabled={enviando}>
          {enviando ? 'Verificando…' : 'Iniciar sesión'}
        </button>
      </form>
    </div>
  );
}
