import { expect } from 'chai';
import { TarifaService } from '../../src/rules/TarifaService';

describe('RN-03 · Cálculo de tarifa (TarifaService)', () => {
  it('UT-RN03: precio base 40,00 y 3 personas → subtotal 120,00; IVA 15,60; total 135,60', () => {
    const tarifa = TarifaService.calcular({ precioBaseCentimos: 4000, personas: 3 });
    expect(tarifa).to.deep.equal({
      subtotalCentimos: 12000,
      ivaCentimos: 1560,
      totalCentimos: 13560,
      tasaIvaPorcentaje: 13,
    });
  });

  it('redondeo: 19,99 × 3 = 59,97; IVA 7,7961 → 7,80; total 67,77 (sin error de punto flotante)', () => {
    const tarifa = TarifaService.calcular({ precioBaseCentimos: 1999, personas: 3 });
    expect(tarifa.subtotalCentimos).to.equal(5997);
    expect(tarifa.ivaCentimos).to.equal(780);
    expect(tarifa.totalCentimos).to.equal(6777);
  });

  it('rechaza cantidades de personas menores que 1 (RC-03)', () => {
    expect(() => TarifaService.calcular({ precioBaseCentimos: 4000, personas: 0 })).to.throw(
      RangeError,
    );
  });
});
