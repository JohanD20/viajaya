import { expect } from 'chai';
import { cuerpoCrearDestino } from '../../src/validation/esquemas';

describe('Imagen de portada del destino (validación de CU-08 y CU-10)', () => {
  const base = { nombre: 'Volcán Poás', precioBase: 35, capacidadMaximaDiaria: 30 };
  const validar = (imagenUrl: unknown) => cuerpoCrearDestino.safeParse({ ...base, imagenUrl });

  it('acepta una dirección https y la conserva', () => {
    const r = validar('  https://images.unsplash.com/photo-123?w=800  ');
    expect(r.success).to.equal(true);
    expect(r.data?.imagenUrl).to.equal('https://images.unsplash.com/photo-123?w=800');
  });

  it('la imagen es opcional: ausente, vacía o null queda en null', () => {
    for (const valor of [undefined, '', '   ', null]) {
      const r = validar(valor);
      expect(r.success).to.equal(true);
      expect(r.data?.imagenUrl).to.equal(null);
    }
  });

  it('rechaza http, javascript: y direcciones con espacios (S-03)', () => {
    for (const valor of ['http://ejemplo.cr/foto.jpg', 'javascript:alert(1)', 'https://ejemplo.cr/una foto.jpg', 'data:image/png;base64,AAAA']) {
      const r = validar(valor);
      expect(r.success, valor).to.equal(false);
      expect(r.error?.issues[0]?.path).to.deep.equal(['imagenUrl']);
    }
  });
});
