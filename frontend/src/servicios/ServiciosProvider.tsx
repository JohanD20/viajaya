import { createContext, useContext, type ReactNode } from 'react';
import type { Servicios } from './contratos';

/**
 * Contenedor de IoC del frontend. Los componentes piden sus dependencias con
 * useServicios() en lugar de importar implementaciones concretas, así se
 * pueden sustituir por dobles en pruebas o en una demo sin backend.
 */
const ContextoServicios = createContext<Servicios | null>(null);

export function ServiciosProvider({ servicios, children }: { servicios: Servicios; children: ReactNode }) {
  return <ContextoServicios.Provider value={servicios}>{children}</ContextoServicios.Provider>;
}

export function useServicios(): Servicios {
  const servicios = useContext(ContextoServicios);
  if (!servicios) throw new Error('useServicios() debe usarse dentro de <ServiciosProvider>.');
  return servicios;
}
