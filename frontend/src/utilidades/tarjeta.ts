/** Máximo de dígitos de una tarjeta (ISO/IEC 7812). La API acepta de 13 a 19. */
const MAX_DIGITOS = 19;

/** Solo los dígitos, como los recibe la API. */
export const digitosTarjeta = (texto: string) => texto.replace(/\D/g, '').slice(0, MAX_DIGITOS);

/** "4111111111111112" → "4111 - 1111 - 1111 - 1112" (grupos de 4, como el placeholder). */
export const formatearTarjeta = (texto: string) => digitosTarjeta(texto).match(/.{1,4}/g)?.join(' - ') ?? '';

/** Marca por los primeros dígitos; solo es una ayuda visual (el pago es simulado). */
export function marcaTarjeta(texto: string): 'Visa' | 'Mastercard' | 'American Express' | null {
  const d = digitosTarjeta(texto);
  if (/^4/.test(d)) return 'Visa';
  if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(d)) return 'Mastercard';
  if (/^3[47]/.test(d)) return 'American Express';
  return null;
}
