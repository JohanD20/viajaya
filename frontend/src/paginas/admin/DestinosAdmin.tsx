import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Aviso } from '../../componentes/Aviso';
import { Campo } from '../../componentes/Campo';
import type { DestinoAdmin, FiltroDestinosAdmin } from '../../servicios/contratos';
import { ErrorApi } from '../../servicios/http';
import { useServicios } from '../../servicios/ServiciosProvider';
import { formatearMonto } from '../../utilidades/formato';

interface Formulario {
  id: string | null; // null = nuevo destino
  nombre: string;
  descripcion: string;
  precioBase: string;
  capacidadMaximaDiaria: string;
  activo: boolean;
}

const VACIO: Formulario = { id: null, nombre: '', descripcion: '', precioBase: '', capacidadMaximaDiaria: '', activo: true };
const aError = (e: unknown) => (e instanceof ErrorApi ? e : new ErrorApi(0, 'Error', 'Ocurrió un error inesperado.'));

/** CU-08 Crear, CU-09 Listar, CU-10 Editar/reactivar y CU-11 Desactivar destinos. */
export function DestinosAdmin() {
  const { admin } = useServicios();
  const [filtro, setFiltro] = useState<FiltroDestinosAdmin>({ estado: 'todos', nombre: '' });
  const [destinos, setDestinos] = useState<DestinoAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [form, setForm] = useState<Formulario | null>(null);
  const [porDesactivar, setPorDesactivar] = useState<DestinoAdmin | null>(null);
  const [error, setError] = useState<ErrorApi | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setDestinos(await admin.listarDestinos(filtro));
    } catch (e) {
      setError(aError(e));
    } finally {
      setCargando(false);
    }
  }, [admin, filtro]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function guardar(evento: FormEvent) {
    evento.preventDefault();
    if (!form) return;
    setError(null);
    const datos = {
      nombre: form.nombre,
      descripcion: form.descripcion.trim() || null,
      precioBase: Number(form.precioBase),
      capacidadMaximaDiaria: Number(form.capacidadMaximaDiaria),
    };
    try {
      if (form.id) await admin.editarDestino(form.id, { ...datos, activo: form.activo });
      else await admin.crearDestino(datos);
      setExito(form.id ? `Destino "${datos.nombre}" actualizado.` : `Destino "${datos.nombre}" creado.`);
      setForm(null);
      await cargar();
    } catch (e) {
      setError(aError(e));
    }
  }

  async function desactivar() {
    if (!porDesactivar) return;
    setError(null);
    try {
      await admin.desactivarDestino(porDesactivar.id);
      setExito(`Destino "${porDesactivar.nombre}" desactivado. Ya no aparece en la búsqueda.`);
      setPorDesactivar(null);
      await cargar();
    } catch (e) {
      setError(aError(e));
    }
  }

  const editar = (d: DestinoAdmin) => {
    setExito(null);
    setError(null);
    setForm({
      id: d.id,
      nombre: d.nombre,
      descripcion: d.descripcion ?? '',
      precioBase: String(d.precioBase),
      capacidadMaximaDiaria: String(d.capacidadMaximaDiaria),
      activo: d.activo,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label htmlFor="filtro-estado" className="etiqueta">
            Estado
          </label>
          <select
            id="filtro-estado"
            className="campo"
            value={filtro.estado}
            onChange={(e) => setFiltro((f) => ({ ...f, estado: e.target.value as FiltroDestinosAdmin['estado'] }))}
          >
            <option value="todos">Todos</option>
            <option value="activo">Activos</option>
            <option value="inactivo">Inactivos</option>
          </select>
        </div>
        <div className="min-w-56 flex-1">
          <label htmlFor="filtro-nombre" className="etiqueta">
            Buscar por nombre
          </label>
          <input
            id="filtro-nombre"
            className="campo"
            value={filtro.nombre}
            onChange={(e) => setFiltro((f) => ({ ...f, nombre: e.target.value }))}
          />
        </div>
        <button type="button" className="boton-primario" onClick={() => { setExito(null); setError(null); setForm({ ...VACIO }); }}>
          Nuevo destino
        </button>
      </div>

      {exito && <Aviso tono="exito">{exito}</Aviso>}
      {error && !form && <Aviso tono="error">{error.message}</Aviso>}

      {form && (
        <form onSubmit={guardar} noValidate className="space-y-4 rounded-xl bg-superficie p-6 shadow-[0_0_0_1px_var(--color-linea)]">
          <h3 className="text-xl font-bold">{form.id ? 'Editar destino' : 'Nuevo destino'}</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <Campo id="nombre" etiqueta="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} error={error?.errorDe('nombre')} required />
            <Campo id="precioBase" etiqueta="Precio base por persona (US$, sin IVA)" inputMode="decimal" value={form.precioBase} onChange={(e) => setForm({ ...form, precioBase: e.target.value })} error={error?.errorDe('precioBase')} className="cifra" required />
            <Campo id="capacidad" etiqueta="Capacidad máxima diaria" inputMode="numeric" value={form.capacidadMaximaDiaria} onChange={(e) => setForm({ ...form, capacidadMaximaDiaria: e.target.value })} error={error?.errorDe('capacidadMaximaDiaria')} className="cifra" required />
            {form.id && (
              <label className="flex items-center gap-3 self-end pb-3 font-bold">
                <input type="checkbox" className="size-5 accent-caribe" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} />
                Activo (visible para los turistas)
              </label>
            )}
          </div>
          <div>
            <label htmlFor="descripcion" className="etiqueta">
              Descripción
            </label>
            <textarea id="descripcion" rows={2} className="campo" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
          </div>
          {error && error.errores.length === 0 && <Aviso tono="error">{error.message}</Aviso>}
          <div className="flex gap-3">
            <button type="submit" className="boton-primario">
              {form.id ? 'Guardar cambios' : 'Crear destino'}
            </button>
            <button type="button" className="boton-secundario" onClick={() => { setForm(null); setError(null); }}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {porDesactivar && (
        <div role="alertdialog" aria-labelledby="titulo-desactivar" className="space-y-3 border-l-4 border-error bg-superficie p-5">
          <h3 id="titulo-desactivar" className="text-lg font-bold">
            ¿Desactivar {porDesactivar.nombre}?
          </h3>
          <p>
            Dejará de aparecer en la búsqueda y no admitirá reservas nuevas.
            {porDesactivar.reservasActivasFuturas
              ? ` Tiene ${porDesactivar.reservasActivasFuturas} reserva(s) activa(s) desde hoy, que se conservan.`
              : ' No tiene reservas activas desde hoy.'}
          </p>
          <div className="flex gap-3">
            <button type="button" className="inline-flex items-center justify-center rounded-control bg-error px-5 py-3 font-bold text-white hover:opacity-90" onClick={desactivar}>
              Sí, desactivar
            </button>
            <button type="button" className="boton-secundario" onClick={() => setPorDesactivar(null)}>
              No, volver
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left">
          <thead className="border-b-2 border-tinta text-sm">
            <tr>
              <th className="py-2 pr-4">Nombre</th>
              <th className="py-2 pr-4 text-right">Precio base</th>
              <th className="py-2 pr-4 text-right">Capacidad diaria</th>
              <th className="py-2 pr-4 text-right">Reservas activas</th>
              <th className="py-2 pr-4">Estado</th>
              <th className="py-2">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody className="cifra divide-y divide-linea">
            {destinos.map((d) => (
              <tr key={d.id} className={d.activo ? '' : 'text-tinta-suave'}>
                <td className="py-3 pr-4 font-bold">{d.nombre}</td>
                <td className="py-3 pr-4 text-right">{formatearMonto(d.precioBase)}</td>
                <td className="py-3 pr-4 text-right">{d.capacidadMaximaDiaria}</td>
                <td className="py-3 pr-4 text-right">{d.reservasActivasFuturas ?? 0}</td>
                <td className="py-3 pr-4">{d.activo ? 'Activo' : 'Inactivo'}</td>
                <td className="py-3 text-right whitespace-nowrap">
                  <button type="button" className="px-2 font-bold text-caribe hover:underline" onClick={() => editar(d)}>
                    Editar
                  </button>
                  {d.activo && (
                    <button type="button" className="px-2 font-bold text-error hover:underline" onClick={() => { setExito(null); setPorDesactivar(d); }}>
                      Desactivar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!cargando && destinos.length === 0 && <p className="py-6 text-tinta-suave">Sin coincidencias. Cambie el filtro o cree un destino nuevo.</p>}
        {cargando && <p className="py-6 text-tinta-suave">Cargando destinos…</p>}
      </div>
    </div>
  );
}
