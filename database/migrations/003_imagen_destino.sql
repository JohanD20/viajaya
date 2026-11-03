-- 003 · Imagen de portada de cada destino (tarjetas de la búsqueda, CU-01).
-- Opcional: si es NULL, la interfaz dibuja una ilustración propia.
-- Solo se aceptan URL https (sin contenido mixto) de hasta 500 caracteres.
-- Compatible hacia atrás: las consultas existentes nombran sus columnas.

ALTER TABLE destinos
  ADD COLUMN IF NOT EXISTS imagen_url text
  CONSTRAINT destinos_imagen_url_https
    CHECK (imagen_url IS NULL OR (imagen_url ~ '^https://[^\s]+$' AND length(imagen_url) <= 500));

COMMENT ON COLUMN destinos.imagen_url IS 'URL https de la foto de portada; NULL = ilustración por defecto.';
