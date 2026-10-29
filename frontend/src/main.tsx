import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './estilos.css';
import { crearServicios } from './servicios/crearServicios';
import { ServiciosProvider } from './servicios/ServiciosProvider';

const urlApi = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
const raiz = document.getElementById('raiz');
if (!raiz) throw new Error('No se encontró el elemento #raiz');

createRoot(raiz).render(
  <StrictMode>
    <ServiciosProvider servicios={crearServicios(urlApi)}>
      <App />
    </ServiciosProvider>
  </StrictMode>,
);
