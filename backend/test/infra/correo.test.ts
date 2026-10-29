import { expect } from 'chai';
import { cargarConfig } from '../../src/config/env';
import type { ReservaDetalle } from '../../src/models/dominio';
import { EstadoPago, EstadoReserva } from '../../src/models/estados';
import { NotificadorCorreo } from '../../src/infra/correo/NotificadorCorreo';
import { componerCorreo, escaparHtml, type CorreoSaliente } from '../../src/infra/correo/plantillas';
import {
  ProveedorBrevo,
  ProveedorResend,
  ocultarCorreos,
  type Fetch,
  type ProveedorCorreo,
  type Registro,
} from '../../src/infra/correo/proveedores';

function detalle(cambios: Partial<ReservaDetalle> = {}): ReservaDetalle {
  return {
    id: 'r-1',
    codigoConfirmacion: 'VY-ABC234',
    fechaViaje: '2026-11-20',
    cantidadPersonas: 3,
    precioBaseCentimos: 4000,
    subtotalCentimos: 12000,
    ivaCentimos: 1560,
    totalCentimos: 13560,
    tasaIvaPorcentaje: 13,
    estadoReservaId: EstadoReserva.Pendiente,
    estadoPagoId: EstadoPago.Aprobado,
    tarjetaUltimos4: '1112',
    cliente: { nombre: 'Ana Mora', correo: 'ana@correo.cr', telefono: '8888-0000' },
    destino: { id: 'd-1', nombre: 'Parque Nacional Cahuita' },
    creadoEn: '2026-11-01T16:00:00.000Z',
    ...cambios,
  };
}

/** fetch falso: guarda la petición y responde con el estado indicado. */
function fetchFalso(estado = 201, cuerpo = '{}') {
  const llamadas: Array<{ url: string; init: RequestInit }> = [];
  const fn: Fetch = async (url, init) => {
    llamadas.push({ url, init });
    return new Response(cuerpo, { status: estado });
  };
  return { fn, llamadas };
}

function registroFalso() {
  const lineas: Array<{ nivel: 'info' | 'error'; datos: object; mensaje: string }> = [];
  const registro: Registro = {
    info: (datos, mensaje) => lineas.push({ nivel: 'info', datos, mensaje }),
    error: (datos, mensaje) => lineas.push({ nivel: 'error', datos, mensaje }),
  };
  return { registro, lineas };
}

describe('Correos al turista · plantillas y proveedores (infra/correo)', () => {
  const remitente = { correo: 'reservas@viajaya.cr', nombre: 'ViajaYa' };

  it('UT-COR-08: el correo de confirmación lleva el código, el desglose con IVA y el enlace a Mi reserva', () => {
    const c = componerCorreo({ evento: 'CREADA', reserva: detalle() }, 'https://viajaya.giize.com/');

    expect(c.para).to.deep.equal({ correo: 'ana@correo.cr', nombre: 'Ana Mora' });
    expect(c.asunto).to.equal('Reserva VY-ABC234 registrada · ViajaYa');
    for (const parte of ['VY-ABC234', '$135,60', '$15,60', 'IVA (13 %)', 'Pendiente', 'Aprobado']) {
      expect(c.texto).to.include(parte);
      expect(c.html).to.include(parte);
    }
    expect(c.html).to.include('href="https://viajaya.giize.com/mi-reserva"');
  });

  it('UT-COR-09: avisa del pago rechazado (RN-04) y del cambio de fecha con ambas fechas', () => {
    const rechazado = componerCorreo(
      { evento: 'CREADA', reserva: detalle({ estadoPagoId: EstadoPago.Rechazado, tarjetaUltimos4: '1117' }) },
      'https://viajaya.giize.com',
    );
    expect(rechazado.texto).to.include('terminada en 1117 fue rechazado');

    const cambio = componerCorreo(
      { evento: 'FECHA_CAMBIADA', reserva: detalle({ fechaViaje: '2026-11-25' }), fechaAnterior: '2026-11-20' },
      'https://viajaya.giize.com',
    );
    expect(cambio.texto).to.match(/del viernes, 20 de noviembre de 2026 al miércoles, 25 de noviembre de 2026/);
  });

  it('UT-COR-10: escapa el HTML de los datos del turista (S-03)', () => {
    const c = componerCorreo(
      { evento: 'APROBADA', reserva: detalle({ cliente: { nombre: '<img src=x onerror=alert(1)>', correo: 'a@b.cr', telefono: '1' } }) },
      'https://viajaya.giize.com',
    );
    expect(c.html).not.to.include('<img');
    expect(c.html).to.include('&lt;img src=x onerror=alert(1)&gt;');
    expect(escaparHtml(`"'&`)).to.equal('&quot;&#39;&amp;');
  });

  it('UT-COR-11: Brevo recibe la API key en el encabezado y el correo en el formato de su API', async () => {
    const { fn, llamadas } = fetchFalso(201);
    const correo: CorreoSaliente = componerCorreo({ evento: 'CREADA', reserva: detalle() }, 'https://x.cr');

    await new ProveedorBrevo('clave-brevo', remitente, fn).enviar(correo);

    expect(llamadas[0]?.url).to.equal('https://api.brevo.com/v3/smtp/email');
    expect((llamadas[0]?.init.headers as Record<string, string>)['api-key']).to.equal('clave-brevo');
    const cuerpo = JSON.parse(String(llamadas[0]?.init.body));
    expect(cuerpo.sender).to.deep.equal({ name: 'ViajaYa', email: 'reservas@viajaya.cr' });
    expect(cuerpo.to).to.deep.equal([{ email: 'ana@correo.cr', name: 'Ana Mora' }]);
    expect(cuerpo).to.have.keys('sender', 'to', 'subject', 'htmlContent', 'textContent');
  });

  it('UT-COR-12: Resend usa Bearer; una respuesta de error lanza sin exponer direcciones (S-11)', async () => {
    const ok = fetchFalso(200);
    const correo = componerCorreo({ evento: 'CREADA', reserva: detalle() }, 'https://x.cr');
    await new ProveedorResend('clave-resend', remitente, ok.fn).enviar(correo);
    expect((ok.llamadas[0]?.init.headers as Record<string, string>).authorization).to.equal('Bearer clave-resend');
    expect(JSON.parse(String(ok.llamadas[0]?.init.body)).from).to.equal('ViajaYa <reservas@viajaya.cr>');

    const falla = fetchFalso(422, '{"message":"Invalid `to` field: ana@correo.cr"}');
    try {
      await new ProveedorResend('clave-resend', remitente, falla.fn).enviar(correo);
      expect.fail('debió lanzar');
    } catch (error) {
      expect((error as Error).message).to.include('Resend respondió 422');
      expect((error as Error).message).not.to.include('ana@correo.cr');
    }
    expect(ocultarCorreos('para ana@correo.cr y luis@x.com')).to.equal('para [correo] y [correo]');
  });

  it('UT-COR-13: NotificadorCorreo nunca rechaza; registra el fallo sin el correo del turista', async () => {
    const caido: ProveedorCorreo = {
      nombre: 'brevo',
      enviar: async () => {
        throw new Error('Brevo respondió 401: Key not found');
      },
    };
    const { registro, lineas } = registroFalso();

    await new NotificadorCorreo(caido, 'https://x.cr', registro).notificar({ evento: 'CREADA', reserva: detalle() });

    expect(lineas).to.have.length(1);
    expect(lineas[0]?.nivel).to.equal('error');
    expect(lineas[0]?.datos).to.deep.equal({
      evento: 'CREADA',
      codigo: 'VY-ABC234',
      proveedor: 'brevo',
      motivo: 'Brevo respondió 401: Key not found',
    });
    expect(JSON.stringify(lineas)).not.to.include('ana@correo.cr');
  });

  describe('Configuración (config/env.ts)', () => {
    const base = {
      DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
      JWT_SECRET: 'x'.repeat(32),
    };

    it('UT-COR-14: por omisión usa "consola" (no envía) y acepta variables vacías', () => {
      const config = cargarConfig({ ...base, CORREO_API_KEY: '', CORREO_REMITENTE: '' });
      expect(config.correo).to.deep.equal({ proveedor: 'consola', sitioUrl: 'http://localhost:5173' });
    });

    it('UT-COR-15: con Brevo exige la API key y el remitente; la API no arranca sin ellos', () => {
      expect(() => cargarConfig({ ...base, CORREO_PROVEEDOR: 'brevo' })).to.throw(/CORREO_API_KEY.*\n.*CORREO_REMITENTE/);

      const config = cargarConfig({
        ...base,
        CORREO_PROVEEDOR: 'brevo',
        CORREO_API_KEY: 'k',
        CORREO_REMITENTE: 'reservas@viajaya.cr',
        SITIO_URL: 'https://viajaya.giize.com/',
      });
      expect(config.correo).to.deep.equal({
        proveedor: 'brevo',
        apiKey: 'k',
        remitente: { correo: 'reservas@viajaya.cr', nombre: 'ViajaYa' },
        sitioUrl: 'https://viajaya.giize.com',
      });
    });
  });
});
