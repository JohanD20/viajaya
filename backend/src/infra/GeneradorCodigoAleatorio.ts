import { randomInt } from 'node:crypto';
import type { GeneradorCodigo } from '../ports/servicios-externos';

/**
 * Código de confirmación VY-XXXXXX (Glosario). S-06: usa crypto.randomInt
 * (impredecible) y un alfabeto sin caracteres ambiguos (0/O, 1/I) para que el
 * turista lo pueda dictar o copiar sin errores. 32^6 ≈ 1.073 millones de códigos.
 */
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export class GeneradorCodigoAleatorio implements GeneradorCodigo {
  generar(): string {
    let codigo = 'VY-';
    for (let i = 0; i < 6; i++) codigo += ALFABETO[randomInt(ALFABETO.length)];
    return codigo;
  }
}
