import { NavLink, Outlet } from 'react-router-dom';

const enlace = ({ isActive }: { isActive: boolean }) =>
  `rounded-control px-3 py-2 font-bold ${isActive ? 'text-caribe underline underline-offset-4' : 'text-tinta hover:text-caribe'}`;

export function Plantilla() {
  return (
    <>
      <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:bg-superficie focus:p-2">
        Saltar al contenido
      </a>
      <header className="border-b border-linea">
        <nav aria-label="Principal" className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <NavLink to="/" className="font-display text-2xl font-extrabold tracking-tight">
            ViajaYa
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
      <main id="contenido">
        <Outlet />
      </main>
    </>
  );
}
