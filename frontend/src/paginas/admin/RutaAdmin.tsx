import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import type { SesionAdmin } from '../../servicios/contratos';
import { useServicios } from '../../servicios/ServiciosProvider';

/**
 * Protege las pantallas de administración: valida el token con la API
 * (GET /api/admin/sesion). Si no hay sesión o venció (401), va al login.
 * La protección real está en el backend (S-04); esto solo mejora la experiencia.
 */
export function RutaAdmin() {
  const { auth } = useServicios();
  const [estado, setEstado] = useState<'verificando' | 'sin-sesion' | SesionAdmin>('verificando');

  useEffect(() => {
    let vigente = true;
    auth
      .sesionActual()
      .then((sesion) => vigente && setEstado(sesion))
      .catch(() => vigente && setEstado('sin-sesion'));
    return () => {
      vigente = false;
    };
  }, [auth]);

  if (estado === 'verificando') return <p className="px-4 py-16 text-center text-tinta-suave">Verificando sesión…</p>;
  if (estado === 'sin-sesion') return <Navigate to="/admin/login" replace />;
  return <Outlet context={estado} />;
}
