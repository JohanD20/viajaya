import { expect } from 'chai';
import { CupoService } from '../../src/rules/CupoService';

describe('RN-01 · Control de cupo (CupoService)', () => {
  it('UT-RN01-a: capacidad 20, reservadas 17, solicitud de 3 → se acepta', () => {
    const resultado = CupoService.verificar({
      capacidadMaximaDiaria: 20,
      personasReservadas: 17,
      personasSolicitadas: 3,
    });
    expect(resultado.aceptado).to.equal(true);
    expect(resultado.disponibles).to.equal(3);
  });

  it('UT-RN01-b: capacidad 20, reservadas 17, solicitud de 4 → se rechaza por cupo insuficiente', () => {
    const resultado = CupoService.verificar({
      capacidadMaximaDiaria: 20,
      personasReservadas: 17,
      personasSolicitadas: 4,
    });
    expect(resultado.aceptado).to.equal(false);
    expect(resultado.disponibles).to.equal(3);
  });
});
