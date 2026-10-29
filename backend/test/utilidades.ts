import { expect } from 'chai';

/** Verifica que la promesa falle con un error de la clase indicada y lo devuelve. */
export async function esperarError<E extends Error>(
  promesa: Promise<unknown>,
  Clase: abstract new (...args: never[]) => E,
): Promise<E> {
  try {
    await promesa;
  } catch (error) {
    expect(error).to.be.instanceOf(Clase);
    return error as E;
  }
  throw new Error(`Se esperaba un ${Clase.name} y la operación terminó sin error.`);
}
