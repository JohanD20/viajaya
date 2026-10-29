-- =====================================================================
-- ViajaYa · Migración 001 · Esquema base (SAD 1.1, sección 3.5)
-- 8 tablas en 4FN + vista v_reservas_detalle + índices + RLS (ADR-09, ADR-11)
-- Ejecutar una sola vez, en orden, desde pgAdmin o el editor SQL de Supabase.
-- =====================================================================

-- ---------- Catálogos de estado ----------
CREATE TABLE estados_reserva (
  id     smallint    PRIMARY KEY,
  nombre varchar(20) NOT NULL UNIQUE
);

CREATE TABLE estados_pago (
  id     smallint    PRIMARY KEY,
  nombre varchar(20) NOT NULL UNIQUE
);

-- Los ids son fijos: el backend los referencia como constantes (models/estados.ts).
INSERT INTO estados_reserva (id, nombre) VALUES (1, 'Pendiente'), (2, 'Aprobada'), (3, 'Cancelada');
INSERT INTO estados_pago    (id, nombre) VALUES (1, 'Pendiente'), (2, 'Aprobado'), (3, 'Rechazado');

-- ---------- Entidades ----------
CREATE TABLE clientes (
  id        uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre    varchar(100) NOT NULL,
  correo    varchar(120) NOT NULL UNIQUE CHECK (correo = lower(correo)),
  telefono  varchar(20)  NOT NULL,
  creado_en timestamptz  NOT NULL DEFAULT now()
);

CREATE TABLE destinos (
  id                       uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre                   varchar(100)  NOT NULL UNIQUE,
  descripcion              text,
  precio_base              numeric(10,2) NOT NULL CHECK (precio_base > 0),
  capacidad_maxima_diaria  integer       NOT NULL CHECK (capacidad_maxima_diaria >= 1),
  activo                   boolean       NOT NULL DEFAULT true,
  creado_en                timestamptz   NOT NULL DEFAULT now(),
  actualizado_en           timestamptz   NOT NULL DEFAULT now()
);

CREATE TABLE administradores (
  id            uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre        varchar(100) NOT NULL,
  correo        varchar(120) NOT NULL UNIQUE CHECK (correo = lower(correo)),
  password_hash varchar(100) NOT NULL,
  activo        boolean      NOT NULL DEFAULT true,
  creado_en     timestamptz  NOT NULL DEFAULT now()
);

CREATE TABLE reservas (
  id                    uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_confirmacion   varchar(9)    NOT NULL UNIQUE CHECK (codigo_confirmacion ~ '^VY-[A-Z0-9]{6}$'),
  cliente_id            uuid          NOT NULL REFERENCES clientes(id),
  destino_id            uuid          NOT NULL REFERENCES destinos(id),
  estado_reserva_id     smallint      NOT NULL REFERENCES estados_reserva(id) DEFAULT 1,
  fecha_viaje           date          NOT NULL,
  cantidad_personas     integer       NOT NULL CHECK (cantidad_personas >= 1),
  precio_base_aplicado  numeric(10,2) NOT NULL CHECK (precio_base_aplicado > 0),
  tasa_iva_aplicada     numeric(4,2)  NOT NULL DEFAULT 0.13 CHECK (tasa_iva_aplicada >= 0),
  creado_en             timestamptz   NOT NULL DEFAULT now(),
  actualizado_en        timestamptz   NOT NULL DEFAULT now()
);

CREATE TABLE pagos (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  reserva_id        uuid        NOT NULL UNIQUE REFERENCES reservas(id) ON DELETE CASCADE,
  estado_pago_id    smallint    NOT NULL REFERENCES estados_pago(id),
  tarjeta_ultimos4  char(4)     NOT NULL CHECK (tarjeta_ultimos4 ~ '^[0-9]{4}$'),  -- RNF-05
  procesado_en      timestamptz NOT NULL DEFAULT now(),
  actualizado_en    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE bitacora_reservas (
  id                bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  reserva_id        uuid        NOT NULL REFERENCES reservas(id) ON DELETE CASCADE,
  administrador_id  uuid        REFERENCES administradores(id),  -- NULL = acción del turista
  accion            varchar(30) NOT NULL CHECK (accion IN
                      ('CREADA','FECHA_CAMBIADA','CANCELADA','APROBADA','PAGO_ACTUALIZADO')),
  valor_anterior    text,
  valor_nuevo       text,
  registrado_en     timestamptz NOT NULL DEFAULT now()
);

-- ---------- Índices ----------
-- RN-01: suma de personas por destino y fecha.
CREATE INDEX ix_reservas_destino_fecha ON reservas (destino_id, fecha_viaje);
CREATE INDEX ix_reservas_cliente       ON reservas (cliente_id);
CREATE INDEX ix_reservas_estado        ON reservas (estado_reserva_id);
CREATE INDEX ix_pagos_estado           ON pagos (estado_pago_id);
CREATE INDEX ix_bitacora_reserva       ON bitacora_reservas (reserva_id);
CREATE INDEX ix_bitacora_admin         ON bitacora_reservas (administrador_id);

-- ---------- actualizado_en automático ----------
CREATE FUNCTION fijar_actualizado_en() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  NEW.actualizado_en := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER tg_destinos_actualizado BEFORE UPDATE ON destinos
  FOR EACH ROW EXECUTE FUNCTION fijar_actualizado_en();
CREATE TRIGGER tg_reservas_actualizado BEFORE UPDATE ON reservas
  FOR EACH ROW EXECUTE FUNCTION fijar_actualizado_en();
CREATE TRIGGER tg_pagos_actualizado BEFORE UPDATE ON pagos
  FOR EACH ROW EXECUTE FUNCTION fijar_actualizado_en();

-- ---------- Vista con montos derivados (RN-03) ----------
-- subtotal + round(subtotal × tasa, 2) = round(subtotal × 1,13, 2) porque subtotal ya tiene 2 decimales exactos.
CREATE VIEW v_reservas_detalle WITH (security_invoker = true) AS
SELECT
  r.id,
  r.codigo_confirmacion,
  r.fecha_viaje,
  r.cantidad_personas,
  r.precio_base_aplicado,
  r.tasa_iva_aplicada,
  round(r.precio_base_aplicado * r.cantidad_personas, 2)                           AS subtotal,
  round(round(r.precio_base_aplicado * r.cantidad_personas, 2) * r.tasa_iva_aplicada, 2) AS iva,
  round(r.precio_base_aplicado * r.cantidad_personas, 2)
    + round(round(r.precio_base_aplicado * r.cantidad_personas, 2) * r.tasa_iva_aplicada, 2) AS monto_total,
  r.estado_reserva_id,
  er.nombre        AS estado_reserva,
  r.creado_en,
  r.actualizado_en,
  c.id             AS cliente_id,
  c.nombre         AS cliente_nombre,
  c.correo         AS cliente_correo,
  c.telefono       AS cliente_telefono,
  d.id             AS destino_id,
  d.nombre         AS destino_nombre,
  p.estado_pago_id,
  ep.nombre        AS estado_pago,
  p.tarjeta_ultimos4,
  p.procesado_en
FROM reservas r
JOIN clientes        c  ON c.id  = r.cliente_id
JOIN destinos        d  ON d.id  = r.destino_id
JOIN estados_reserva er ON er.id = r.estado_reserva_id
LEFT JOIN pagos      p  ON p.reserva_id = r.id
LEFT JOIN estados_pago ep ON ep.id = p.estado_pago_id;

-- ---------- Seguridad: RLS (ADR-09) ----------
-- La API pública de Supabase (roles anon y authenticated) no ve ninguna fila ni tabla.
ALTER TABLE estados_reserva   ENABLE ROW LEVEL SECURITY;
ALTER TABLE estados_pago      ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE destinos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE administradores   ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservas          ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE bitacora_reservas ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION fijar_actualizado_en() FROM PUBLIC, anon, authenticated;
