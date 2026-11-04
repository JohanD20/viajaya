import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Logo } from './Logo';

const enlace = ({ isActive }: { isActive: boolean }) =>
  `rounded-control px-3 py-2 font-bold ${isActive ? 'text-caribe underline underline-offset-4' : 'text-tinta hover:text-caribe'}`;

/** El panel de la agencia usa más ancho para que sus tablas quepan en escritorio. */
export const ANCHO_PANEL = 'max-w-[90rem]';

export function Plantilla() {
  const { pathname } = useLocation();
  const ancho = pathname.startsWith('/admin') ? ANCHO_PANEL : 'max-w-6xl';
  return (
    // Columna de alto completo: el pie queda abajo aunque la página tenga poco contenido.
    <div className="flex min-h-dvh flex-col">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:bg-superficie focus:p-2">
        Saltar al contenido
      </a>
      <header className="border-b border-linea">
        <nav aria-label="Principal" className={`mx-auto flex ${ancho} items-center justify-between gap-4 px-4 py-4`}>
          <NavLink to="/" aria-label="ViajaYa, inicio">
            <Logo />
          </NavLink>
          <div className="flex items-center gap-1">
            <NavLink to="/mi-reserva" className={enlace}>
              Mi reserva
            </NavLink>
            <NavLink to="/admin" className={enlace}>
              Agencia
            </NavLink>
          </div>
        </nav>
      </header>
      <main id="contenido" className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-linea">
        <p className={`mx-auto ${ancho} px-4 py-6 text-center text-sm text-tinta-suave`}>
          © 2026 ViajaYa · Universidad de Costa Rica · Desarrollado por Johan Dávila Moya
        </p>
      </footer>
    </div>
  );
}
