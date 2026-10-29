/**
 * Conversión entre decimales de PostgreSQL (numeric, llega como texto "40.00")
 * y céntimos enteros. Nunca se usa parseFloat para montos.
 */

/** "40.00" | "40.5" | "40" | 40.5 → 4050 */
export function aCentimos(valor: string | number): number {
  const texto = typeof valor === 'number' ? valor.toFixed(2) : valor.trim();
  const coincidencia = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(texto);
  if (!coincidencia) {
    throw new Error(`Monto con formato inválido: "${texto}"`);
  }
  const [, signo, enteros, decimales = ''] = coincidencia;
  const centimos = Number(enteros) * 100 + Number(decimales.padEnd(2, '0'));
  return signo === '-' ? -centimos : centimos;
}

/** 13560 → 135.6 (número para JSON; la interfaz lo formatea con 2 decimales). */
export function aDecimal(centimos: number): number {
  return centimos / 100;
}

/** 13560 → "135.60" (para guardar en columnas numeric). */
export function aTextoDecimal(centimos: number): string {
  return (centimos / 100).toFixed(2);
}

/** 0.13 | "0.13" → 13 */
export function tasaAPorcentaje(tasa: string | number): number {
  return aCentimos(tasa);
}
