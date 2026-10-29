/** Moneda única de la agencia (SUP-05). */
const MONEDA = new Intl.NumberFormat('es-CR', {
  style: 'currency',
  currency: 'USD',
  currencyDisplay: 'narrowSymbol',
});
const FECHA_LARGA = new Intl.DateTimeFormat('es-CR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

export const formatearMonto = (monto: number) => MONEDA.format(monto);

/** '2026-11-20' → 'viernes, 20 de noviembre de 2026' (sin correr el día por zona horaria). */
export const formatearFecha = (fechaIso: string) => FECHA_LARGA.format(new Date(`${fechaIso}T00:00:00Z`));

/** Mañana en hora de Costa Rica, para el atributo min del selector de fecha (RC-02). */
export function mananaEnCostaRica(): string {
  const ahoraCr = new Date(Date.now() - 6 * 3_600_000);
  ahoraCr.setUTCDate(ahoraCr.getUTCDate() + 1);
  return ahoraCr.toISOString().slice(0, 10);
}

export const espacios = (n: number) => (n === 1 ? '1 espacio' : `${n} espacios`);
export const personasTexto = (n: number) => (n === 1 ? '1 persona' : `${n} personas`);
