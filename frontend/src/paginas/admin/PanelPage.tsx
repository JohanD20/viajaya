import { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import type { SesionAdmin } from '../../servicios/contratos';
import { useServicios } from '../../servicios/ServiciosProvider';
import { DestinosAdmin } from './DestinosAdmin';
import { ReservasAdmin } from './ReservasAdmin';

type Seccion = 'reservas' | 'destinos';

/** Panel de administración: reservas y pagos (CU-12 a CU-16) y destinos (CU-08 a CU-11). */
export function PanelPage() {
  const sesion = useOutletContext<SesionAdmin>();
  const { auth } = useServicios();
  const navegar = useNavigate();
  const [seccion, setSeccion] = useState<Seccion>('reservas');

  const pestana = (id: Seccion, texto: string) => (
    <button
      type="button"
      role="tab"
      id={`pestana-${id}`}
      aria-selected={seccion === id}
      aria-controls={`panel-${id}`}
      onClick={() => setSeccion(id)}
      className={`border-b-4 px-1 pb-2 font-display text-xl font-bold ${seccion === id ? 'border-caribe text-tinta' : 'border-transparent text-tinta-suave hover:text-tinta'}`}
    >
      {texto}
    </button>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="text-4xl font-extrabold">Hola, {sesion.nombre}</h1>
        <button
          type="button"
          className="boton-secundario"
          onClick={() => {
            auth.cerrarSesion();
            navegar('/admin/login', { replace: true });
          }}
        >
          Cerrar sesión
        </button>
      </div>

      <div role="tablist" aria-label="Secciones de administración" className="mt-8 flex gap-6 border-b border-linea">
        {pestana('reservas', 'Reservas y pagos')}
        {pestana('destinos', 'Destinos')}
      </div>

      <div role="tabpanel" id={`panel-${seccion}`} aria-labelledby={`pestana-${seccion}`} className="mt-6">
        {seccion === 'reservas' ? <ReservasAdmin /> : <DestinosAdmin />}
      </div>
    </div>
  );
}
