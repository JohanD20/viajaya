import { useNavigate, useOutletContext } from 'react-router-dom';
import type { SesionAdmin } from '../../servicios/contratos';
import { useServicios } from '../../servicios/ServiciosProvider';

/** Panel de administración. Las secciones se completan en HU-04 a HU-07 y HU-14 a HU-18. */
export function PanelPage() {
  const admin = useOutletContext<SesionAdmin>();
  const { auth } = useServicios();
  const navegar = useNavigate();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="text-4xl font-extrabold">Hola, {admin.nombre}</h1>
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
      <div className="mt-10 grid gap-8 md:grid-cols-2">
        <section className="border-t-4 border-caribe pt-4">
          <h2 className="text-2xl font-bold">Destinos</h2>
          <p className="mt-2 text-tinta-suave">Crear, editar, desactivar y reactivar destinos (HU-04 a HU-07).</p>
        </section>
        <section className="border-t-4 border-caribe pt-4">
          <h2 className="text-2xl font-bold">Reservas</h2>
          <p className="mt-2 text-tinta-suave">Aprobar, cancelar, eliminar y actualizar pagos (HU-14 a HU-18).</p>
        </section>
      </div>
    </div>
  );
}
