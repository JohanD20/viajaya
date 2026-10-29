import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Plantilla } from './componentes/Plantilla';
import { LoginPage } from './paginas/admin/LoginPage';
import { PanelPage } from './paginas/admin/PanelPage';
import { RutaAdmin } from './paginas/admin/RutaAdmin';
import { BuscarPage } from './paginas/BuscarPage';
import { EnConstruccion } from './paginas/EnConstruccion';
import { MiReservaPage } from './paginas/MiReservaPage';
import { ReservarPage } from './paginas/ReservarPage';

const enrutador = createBrowserRouter([
  {
    element: <Plantilla />,
    children: [
      { path: '/', element: <BuscarPage /> }, // CU-01, CU-02
      { path: '/reservar', element: <ReservarPage /> }, // CU-03
      { path: '/mi-reserva', element: <MiReservaPage /> }, // CU-04, CU-05, CU-06
      { path: '/admin/login', element: <LoginPage /> }, // CU-07
      {
        path: '/admin',
        element: <RutaAdmin />,
        children: [{ index: true, element: <PanelPage /> }], // CU-08 a CU-16
      },
      { path: '*', element: <EnConstruccion titulo="Página no encontrada" historia="ningún sprint: la dirección no existe" /> },
    ],
  },
]);

export function App() {
  return <RouterProvider router={enrutador} />;
}
