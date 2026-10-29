import { expect } from 'chai';
import { VentanaService } from '../../src/rules/VentanaService';

/** Instantes expresados en hora de Costa Rica (UTC−6). */
const cr = (fechaHora: string) => new Date(`${fechaHora}-06:00`);

describe('RN-02 · Ventana de 48 horas (VentanaService)', () => {
  const excursion = '2026-11-20';

  it('UT-RN02-a: excursión el 20/11; cambio el 17/11 a las 23:00 (faltan 49 h) → se permite', () => {
    const ahora = cr('2026-11-17T23:00:00');
    expect(VentanaService.horasRestantes(excursion, ahora)).to.equal(49);
    expect(VentanaService.permiteCambio(excursion, ahora)).to.equal(true);
  });

  it('UT-RN02-b: misma excursión; cambio el 18/11 a la 01:00 (faltan 47 h) → se rechaza', () => {
    const ahora = cr('2026-11-18T01:00:00');
    expect(VentanaService.horasRestantes(excursion, ahora)).to.equal(47);
    expect(VentanaService.permiteCambio(excursion, ahora)).to.equal(false);
  });

  it('borde: exactamente 48 h antes (18/11 00:00) → se rechaza ("más de 48 horas")', () => {
    expect(VentanaService.permiteCambio(excursion, cr('2026-11-18T00:00:00'))).to.equal(false);
  });

  it('zona horaria: 18/11 05:59 UTC equivale al 17/11 23:59 en Costa Rica → se permite', () => {
    expect(VentanaService.permiteCambio(excursion, new Date('2026-11-18T05:59:00Z'))).to.equal(true);
  });
});
