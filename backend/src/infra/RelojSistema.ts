import type { Reloj } from '../ports/servicios-externos';

export class RelojSistema implements Reloj {
  ahora(): Date {
    return new Date();
  }
}
