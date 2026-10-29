import { expect } from 'chai';
import { DatosInvalidosError } from '../../src/errors/errores';
import { EstadoPago } from '../../src/models/estados';
import { PagoSimuladoService } from '../../src/rules/PagoSimuladoService';
import { esperarError } from '../utilidades';

describe('RN-04 · Gateway de pago simulado (PagoSimuladoService)', () => {
  const pasarela = new PagoSimuladoService();

  it('UT-RN04-a: tarjeta que termina en 2 → pago Aprobado', async () => {
    const resultado = await pasarela.procesar('4111111111111112');
    expect(resultado.estadoPagoId).to.equal(EstadoPago.Aprobado);
    expect(resultado.ultimos4).to.equal('1112');
  });

  it('UT-RN04-b: tarjeta que termina en 7 → pago Rechazado', async () => {
    const resultado = await pasarela.procesar('4111111111111117');
    expect(resultado.estadoPagoId).to.equal(EstadoPago.Rechazado);
    expect(resultado.ultimos4).to.equal('1117');
  });

  it('rechaza tarjetas con formato inválido (RNF-08)', async () => {
    await esperarError(pasarela.procesar('4111-1111-1111-1112'), DatosInvalidosError);
    await esperarError(pasarela.procesar('123'), DatosInvalidosError);
  });
});
