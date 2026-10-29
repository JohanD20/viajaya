import type { FechaISO } from '../models/dominio';

/**
 * Manejo de fechas en hora de Costa Rica (Visión 3.3, Glosario "Zona horaria").
 * Costa Rica usa UTC−6 todo el año (sin horario de verano desde 1992), por lo
 * que se usa un desfase fijo y no se depende de la zona horaria del servidor
 * (Render corre en UTC).
 */
export const DESFASE_COSTA_RICA = '-06:00';
const DESFASE_MS = 6 * 60 * 60 * 1000;

const FORMATO_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;

/** true si el texto es 'AAAA-MM-DD' y la fecha existe en el calendario (rechaza 2026-02-30). */
export function esFechaCalendarioValida(texto: string): boolean {
  const partes = FORMATO_FECHA.exec(texto);
  if (!partes) return false;
  const [anio, mes, dia] = [Number(partes[1]), Number(partes[2]), Number(partes[3])];
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  return (
    fecha.getUTCFullYear() === anio && fecha.getUTCMonth() === mes - 1 && fecha.getUTCDate() === dia
  );
}

/** Instante de las 00:00 (hora de Costa Rica) del día indicado. */
export function inicioDelDiaCostaRica(fecha: FechaISO): Date {
  return new Date(`${fecha}T00:00:00${DESFASE_COSTA_RICA}`);
}

/** Fecha de calendario de "hoy" en Costa Rica para el instante dado. */
export function hoyEnCostaRica(ahora: Date): FechaISO {
  return new Date(ahora.getTime() - DESFASE_MS).toISOString().slice(0, 10);
}

/** RC-02: la fecha agendada debe ser posterior a hoy (hora de Costa Rica). */
export function esFechaFutura(fecha: FechaISO, ahora: Date): boolean {
  return fecha > hoyEnCostaRica(ahora);
}
