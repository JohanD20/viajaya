# Guía de demostración — ViajaYa

Guion para la defensa oral: muestra en vivo los módulos del turista y del administrador, y las cuatro reglas de negocio. La rúbrica pide "ejecuta todos los flujos sin errores, valida RN-01 a RN-04" y "suite corriendo en tiempo real".

## Antes de empezar (10 minutos antes)

1. **Despertar la API:** el plan gratuito de Render la duerme tras unos minutos sin uso. Abra https://viajaya-api.onrender.com/api/salud hasta que responda `{"estado":"ok"}` (la primera vez tarda hasta 1 minuto).
2. Abra el sitio: https://viajaya.giize.com (o https://viajaya-web.onrender.com).
3. Inicie sesión en **Agencia** en otra pestaña con el usuario administrador.
4. Tenga abierta una terminal en `C:\dev\viajaya` para correr `npm test` en vivo.
5. Si hace falta, en Supabase verifique que el proyecto **no esté pausado** (se pausa tras una semana sin uso).

## 1. Turista (RF-01 a RF-06)

| Paso | Qué hacer | Qué se demuestra |
|---|---|---|
| 1 | Elegir **Parque Nacional Cahuita** (US$40), una fecha, **3 personas** y pulsar "Ver cupo y precio" | CU-01, CU-02 |
| 2 | Leer el boleto: subtotal 120,00; IVA 15,60; **total 135,60** | **RN-03**: (40 × 3) × 1,13 |
| 3 | Reservar con la tarjeta `4111111111111112` | CU-03; **RN-04**: termina en par, así que el pago queda Aprobado |
| 3b | En la confirmación, pulsar **Descargar PDF** | Comprobante con el código, el desglose con IVA y los estados; se genera en el navegador |
| 3c | Abrir el correo usado en la reserva | Llega la confirmación con el código y el enlace a Mi reserva; también llegan avisos al cambiar la fecha, cancelar o cuando la agencia aprueba |
| 4 | Reservar otra vez con la tarjeta `4111111111111117` | **RN-04**: termina en impar, así que queda Rechazado y la reserva igual se registra |
| 5 | En **Mi reserva**, consultar con el código y el correo | CU-04 |
| 6 | Consultar con un correo distinto | RNF-06: mensaje genérico, sin revelar si el código existe |
| 7 | Cambiar la fecha de la reserva | CU-05 |
| 8 | Cancelar la reserva (con confirmación) | CU-06: libera el cupo |

### RN-01 · Control de cupo
1. En **Agencia > Destinos**, verifique que **Río Pacuare** tiene capacidad 10.
2. Como turista, reserve **8 personas** en Río Pacuare para una fecha.
3. Intente cotizar **3 personas** para la misma fecha: aparece *"Cupo insuficiente: quedan 2 espacios para esa fecha"*.
4. Con **2 personas** sí se puede. El backend lo garantiza con una transacción y `SELECT … FOR UPDATE` sobre el destino (ADR-04).

### RN-02 · Ventana de 48 horas
1. Reserve una excursión para **mañana**.
2. En **Mi reserva**, consúltela: aparece *"Faltan 48 horas o menos…"* y no se ofrecen cambiar fecha ni cancelar.
3. Compare con una reserva de la próxima semana, que sí permite ambas acciones.
4. Si piden el caso exacto, muestre las pruebas `UT-RN02-a/b` (49 h y 47 h) y la de borde (48 h exactas).

## 2. Administrador (RF-07 a RF-10)

| Paso | Qué hacer | Qué se demuestra |
|---|---|---|
| 1 | Iniciar sesión | CU-07 · JWT; con credenciales erróneas, mensaje genérico |
| 2 | **Destinos**: crear uno, editarlo, desactivarlo | CU-08, CU-10, CU-11; el desactivado desaparece de la búsqueda del turista |
| 3 | Intentar bajar la capacidad de un destino por debajo de lo reservado | RC-06: lo impide e indica la fecha |
| 4 | **Reservas y pagos**: filtrar por estado de pago "Rechazado" | CU-12 |
| 5 | Cambiar el pago de una reserva a Aprobado y luego aprobar la reserva | CU-16, CU-13 |
| 6 | Cancelar una reserva sin la restricción de 48 h | CU-14 · SUP-04 |
| 7 | Eliminar una reserva escribiendo su código | CU-15 |

## 3. Pruebas en tiempo real

```powershell
cd C:\dev\viajaya
npm test
```

Muestre que cada prueba lleva el ID del SRS (`UT-RN01-a` … `UT-RF06-b`). Luego, en GitHub, abra la pestaña **Actions**: la misma suite corre automáticamente en cada pull request.

## 4. Preguntas técnicas probables

| Pregunta | Dónde está la respuesta |
|---|---|
| ¿Cómo evitan el sobrecupo con reservas simultáneas? | `ReservaService.crear` + `PgUnidadDeTrabajo` + `PgDestinoRepository.bloquearPorId` (`FOR UPDATE`) |
| ¿Cómo prueban sin base de datos? | Inyección de dependencias: `container.ts` y los dobles de `test/fakes/memoria.ts` |
| ¿Dónde está RLS? | `database/migrations/001_esquema.sql` y `002_rol_api.sql` (rol `viajaya_api`) |
| ¿Cómo se protege la administración? | `middlewares/autenticacion.ts`, montado una vez sobre `/api/admin` (JWT HS256) |
| ¿Por qué céntimos? | `rules/TarifaService.ts`: evita errores de punto flotante en RN-03 |
