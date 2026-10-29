-- =====================================================================
-- ViajaYa · Migración 002 · Rol de la API con mínimo privilegio (RNF-03, ADR-09)
-- El backend NO se conecta como "postgres" (que ignora RLS): usa viajaya_api,
-- que solo tiene los permisos que necesita y pasa por las políticas RLS.
--
-- La contraseña NO va en este archivo. Después de ejecutarlo, en el editor SQL:
--   ALTER ROLE viajaya_api PASSWORD '<contraseña larga y aleatoria>';
-- y guárdela solo en backend/.env y en las variables de entorno de Render.
-- =====================================================================

CREATE ROLE viajaya_api LOGIN NOINHERIT NOBYPASSRLS;

GRANT USAGE ON SCHEMA public TO viajaya_api;

-- Catálogos: solo lectura.
GRANT SELECT ON estados_reserva, estados_pago TO viajaya_api;

-- Datos del negocio.
GRANT SELECT, INSERT, UPDATE, DELETE ON clientes, destinos, reservas, pagos, bitacora_reservas TO viajaya_api;
GRANT SELECT, INSERT, UPDATE ON administradores TO viajaya_api;  -- sin DELETE
GRANT SELECT ON v_reservas_detalle TO viajaya_api;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO viajaya_api;

-- Políticas RLS: solo el rol de la API ve y modifica filas.
CREATE POLICY api_lectura ON estados_reserva   FOR SELECT TO viajaya_api USING (true);
CREATE POLICY api_lectura ON estados_pago      FOR SELECT TO viajaya_api USING (true);
CREATE POLICY api_todo    ON clientes          FOR ALL    TO viajaya_api USING (true) WITH CHECK (true);
CREATE POLICY api_todo    ON destinos          FOR ALL    TO viajaya_api USING (true) WITH CHECK (true);
CREATE POLICY api_todo    ON reservas          FOR ALL    TO viajaya_api USING (true) WITH CHECK (true);
CREATE POLICY api_todo    ON pagos             FOR ALL    TO viajaya_api USING (true) WITH CHECK (true);
CREATE POLICY api_todo    ON bitacora_reservas FOR ALL    TO viajaya_api USING (true) WITH CHECK (true);
CREATE POLICY api_todo    ON administradores   FOR ALL    TO viajaya_api USING (true) WITH CHECK (true);
