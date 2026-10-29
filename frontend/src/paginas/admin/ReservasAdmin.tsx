import { useCallback, useEffect, useState } from 'react';
import { Aviso } from '../../componentes/Aviso';
import type { DestinoAdmin, EstadoPago, FiltroReservasAdmin, ReservaAdmin } from '../../servicios/contratos';
import { ErrorApi } from '../../servicios/http';
import { useServicios } from '../../servicios/ServiciosProvider';
import { formatearMonto } from '../../utilidades/formato';

type Accion =
  | { tipo: 'aprobar' | 'cancelar' | 'eliminar'; reserva: ReservaAdmin }
  | { tipo: 'pago'; reserva: ReservaAdmin; estadoPago: EstadoPago };

const aError = (e: unknown) => (e instanceof ErrorApi ? e : new ErrorApi(0, 'Error', 'Ocurrió un error inesperado.'));
const PAGOS: EstadoPago[] = ['Pendiente', 'Aprobado', 'Rechazado'];

/** CU-12 Listar, CU-13 Aprobar, CU-14 Cancelar, CU-15 Eliminar y CU-16 Actualizar pago. */
export function ReservasAdmin() {
  const { admin } = useServicios();
  const [filtro, setFiltro] = useState<FiltroReservasAdmin>({});
  const [reservas, setReservas] = useState<ReservaAdmin[]>([]);
  const [destinos, setDestinos] = useState<DestinoAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [accion, setAccion] = useState<Accion | null>(null);
  const [codigoEscrito, setCodigoEscrito] = useState('');
  const [error, setError] = useState<ErrorApi | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setReservas(await admin.listarReservas(filtro));
    } catch (e) {
      setError(aError(e));
    } finally {
      setCargando(false);
    }
  }, [admin, filtro]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  useEffect(() => {
    admin.listarDestinos({ estado: 'todos' }).then(setDestinos).catch(() => setDestinos([]));
  }, [admin]);

  const abrir = (a: Accion) => {
    setError(null);
    setExito(null);
    setCodigoEscrito('');
    setAccion(a);
  };

  async function confirmar() {
    if (!accion) return;
    const { reserva } = accion;
    setError(null);
    try {
      if (accion.tipo === 'aprobar') await admin.aprobarReserva(reserva.id);
      if (accion.tipo === 'cancelar') await admin.cancelarReserva(reserva.id);
      if (accion.tipo === 'eliminar') await admin.eliminarReserva(reserva.id, codigoEscrito);
      if (accion.tipo === 'pago') await admin.actualizarPago(reserva.id, accion.estadoPago);
      setExito(
        {
          aprobar: `Reserva ${reserva.codigo} aprobada.`,
          cancelar: `Reserva ${reserva.codigo} cancelada; el cupo quedó libre.`,
          eliminar: `Reserva ${reserva.codigo} eliminada.`,
          pago: `Pago de ${reserva.codigo} actualizado.`,
        }[accion.tipo],
      );
      setAccion(null);
      await cargar();
    } catch (e) {
      setError(aError(e));
    }
  }

  const cambiarFiltro = (clave: keyof FiltroReservasAdmin, valor: string) =>
    setFiltro((f) => ({ ...f, [clave]: valor || undefined }));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <label htmlFor="f-destino" className="etiqueta">Destino</label>
          <select id="f-destino" className="campo" value={filtro.destinoId ?? ''} onChange={(e) => cambiarFiltro('destinoId', e.target.value)}>
            <option value="">Todos</option>
            {destinos.map((d) => (
              <option key={d.id} value={d.id}>{d.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="f-desde" className="etiqueta">Desde</label>
          <input id="f-desde" type="date" className="campo" value={filtro.desde ?? ''} onChange={(e) => cambiarFiltro('desde', e.target.value)} />
        </div>
        <div>
          <label htmlFor="f-hasta" className="etiqueta">Hasta</label>
          <input id="f-hasta" type="date" className="campo" value={filtro.hasta ?? ''} onChange={(e) => cambiarFiltro('hasta', e.target.value)} />
        </div>
        <div>
          <label htmlFor="f-reserva" className="etiqueta">Estado de reserva</label>
          <select id="f-reserva" className="campo" value={filtro.estadoReserva ?? ''} onChange={(e) => cambiarFiltro('estadoReserva', e.target.value)}>
            <option value="">Todos</option>
            <option>Pendiente</option>
            <option>Aprobada</option>
            <option>Cancelada</option>
          </select>
        </div>
        <div>
          <label htmlFor="f-pago" className="etiqueta">Estado de pago</label>
          <select id="f-pago" className="campo" value={filtro.estadoPago ?? ''} onChange={(e) => cambiarFiltro('estadoPago', e.target.value)}>
            <option value="">Todos</option>
            {PAGOS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      {exito && <Aviso tono="exito">{exito}</Aviso>}
      {error && !accion && <Aviso tono="error">{error.message}</Aviso>}

      {accion && (
        <div role="alertdialog" aria-labelledby="titulo-accion" className={`space-y-3 border-l-4 bg-superficie p-5 ${accion.tipo === 'aprobar' || accion.tipo === 'pago' ? 'border-caribe' : 'border-error'}`}>
          <h3 id="titulo-accion" className="text-lg font-bold">
            {accion.tipo === 'aprobar' && `¿Aprobar la reserva ${accion.reserva.codigo}?`}
            {accion.tipo === 'cancelar' && `¿Cancelar la reserva ${accion.reserva.codigo}?`}
            {accion.tipo === 'eliminar' && `¿Eliminar definitivamente la reserva ${accion.reserva.codigo}?`}
            {accion.tipo === 'pago' && `¿Cambiar el pago de ${accion.reserva.codigo} a ${accion.estadoPago}?`}
          </h3>
          {accion.tipo === 'aprobar' && accion.reserva.estadoPago !== 'Aprobado' && (
            <p className="font-bold text-error">Atención: el pago de esta reserva está {accion.reserva.estadoPago ?? 'sin registrar'}.</p>
          )}
          {accion.tipo === 'cancelar' && <p>La cancelación es definitiva y libera el cupo de esa fecha.</p>}
          {accion.tipo === 'eliminar' && (
            <>
              <p>Esta acción no se puede deshacer y borra también el pago y la bitácora. Si la reserva es real, mejor cancélela.</p>
              <div className="max-w-xs">
                <label htmlFor="codigo-eliminar" className="etiqueta">
                  Escriba {accion.reserva.codigo} para confirmar
                </label>
                <input id="codigo-eliminar" className="campo cifra uppercase" value={codigoEscrito} onChange={(e) => setCodigoEscrito(e.target.value.toUpperCase())} />
              </div>
            </>
          )}
          {error && <Aviso tono="error">{error.errorDe('codigoConfirmacion') ?? error.message}</Aviso>}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={confirmar}
              disabled={accion.tipo === 'eliminar' && codigoEscrito !== accion.reserva.codigo}
              className={accion.tipo === 'aprobar' || accion.tipo === 'pago' ? 'boton-primario' : 'inline-flex items-center justify-center rounded-control bg-error px-5 py-3 font-bold text-white hover:opacity-90 disabled:opacity-50'}
            >
              {{ aprobar: 'Sí, aprobar', cancelar: 'Sí, cancelar', eliminar: 'Eliminar', pago: 'Sí, cambiar pago' }[accion.tipo]}
            </button>
            <button type="button" className="boton-secundario" onClick={() => setAccion(null)}>
              No, volver
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left">
          <thead className="border-b-2 border-tinta text-sm">
            <tr>
              <th className="py-2 pr-3">Código</th>
              <th className="py-2 pr-3">Cliente</th>
              <th className="py-2 pr-3">Destino</th>
              <th className="py-2 pr-3">Fecha</th>
              <th className="py-2 pr-3 text-right">Personas</th>
              <th className="py-2 pr-3 text-right">Monto total</th>
              <th className="py-2 pr-3">Reserva</th>
              <th className="py-2 pr-3">Pago</th>
              <th className="py-2"><span className="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody className="cifra divide-y divide-linea align-top">
            {reservas.map((r) => {
              const activa = r.estadoReserva !== 'Cancelada';
              return (
                <tr key={r.id} className={activa ? '' : 'text-tinta-suave'}>
                  <td className="py-3 pr-3 font-bold">{r.codigo}</td>
                  <td className="py-3 pr-3">
                    <span className="block">{r.cliente.nombre}</span>
                    <span className="block text-sm text-tinta-suave">{r.cliente.correo}</span>
                    <span className="block text-sm text-tinta-suave">{r.cliente.telefono}</span>
                  </td>
                  <td className="py-3 pr-3">{r.destino.nombre}</td>
                  <td className="py-3 pr-3 whitespace-nowrap">{r.fecha}</td>
                  <td className="py-3 pr-3 text-right">{r.personas}</td>
                  <td className="py-3 pr-3 text-right">{formatearMonto(r.montoTotal)}</td>
                  <td className="py-3 pr-3">{r.estadoReserva}</td>
                  <td className="py-3 pr-3">
                    {activa && r.estadoPago ? (
                      <select
                        aria-label={`Estado de pago de ${r.codigo}`}
                        className={`campo py-1.5 ${r.estadoPago === 'Rechazado' ? 'text-error' : ''}`}
                        value={r.estadoPago}
                        onChange={(e) => abrir({ tipo: 'pago', reserva: r, estadoPago: e.target.value as EstadoPago })}
                      >
                        {PAGOS.map((p) => (
                          <option key={p}>{p}</option>
                        ))}
                      </select>
                    ) : (
                      (r.estadoPago ?? 'Sin pago')
                    )}
                  </td>
                  <td className="py-3 text-right whitespace-nowrap">
                    {r.estadoReserva === 'Pendiente' && (
                      <button type="button" className="px-2 font-bold text-caribe hover:underline" onClick={() => abrir({ tipo: 'aprobar', reserva: r })}>
                        Aprobar
                      </button>
                    )}
                    {activa && (
                      <button type="button" className="px-2 font-bold text-error hover:underline" onClick={() => abrir({ tipo: 'cancelar', reserva: r })}>
                        Cancelar
                      </button>
                    )}
                    <button type="button" className="px-2 text-tinta-suave hover:underline" onClick={() => abrir({ tipo: 'eliminar', reserva: r })}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!cargando && reservas.length === 0 && <p className="py-6 text-tinta-suave">No hay reservas con esos filtros.</p>}
        {cargando && <p className="py-6 text-tinta-suave">Cargando reservas…</p>}
      </div>
    </div>
  );
}
