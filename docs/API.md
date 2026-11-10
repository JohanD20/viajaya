# API REST de ViajaYa

Referencia de la interfaz REST del backend (SAD 3.1). Versión v0.6.1.

- **URL base:** `https://viajaya-api.onrender.com/api` (local: `http://localhost:3000/api`).
- **Formato:** JSON en UTF-8. Las fechas usan `AAAA-MM-DD`. Los montos son decimales en dólares (SUP-05) y se calculan internamente en céntimos enteros.
- **Autenticación:** las rutas `/api/admin/*` exigen `Authorization: Bearer <token>`, obtenido en `POST /api/auth/login` (JWT HS256, 8 horas).
- **Validación:** los cuerpos rechazan campos desconocidos y tienen un máximo de 10 KB.

## Errores

Toda respuesta de error usa `application/problem+json` (RFC 7807):

```json
{ "type": "about:blank", "title": "Cupo insuficiente", "status": 409,
  "detail": "Cupo insuficiente: quedan 2 espacios para esa fecha.", "instance": "/api/reservas" }
```

En un 400 se agrega `errores: [{ "campo": "correo", "mensaje": "Correo inválido." }]`.

| Código | Significado |
|---|---|
| 400 | Formato o rango inválido |
| 401 | Sin sesión, token vencido o credenciales incorrectas |
| 404 | Recurso inexistente, o código y correo que no coinciden (mensaje genérico, RNF-06) |
| 409 | RN-01 cupo insuficiente, estado incompatible, capacidad menor a lo ya reservado (RC-06) o conflicto (por ejemplo, nombre duplicado) |
| 422 | RN-02 faltan 48 horas o menos, destino inactivo o fecha no futura |
| 429 | Demasiados intentos: login 5/min, consulta de reserva 10/min, creación de reservas 10 cada 10 min |
| 503 | Base de datos no disponible |

## Endpoints públicos (turista)

| Método y ruta | CU | Entrada | Éxito | Errores |
|---|---|---|---|---|
| `GET /api/salud` | — | — | 200 `{"estado":"ok"}` | 503 |
| `GET /api/destinos` | CU-01 | — | 200 lista de destinos activos | — |
| `GET /api/destinos/:id/disponibilidad?fecha=&personas=` | CU-01 | Query `fecha`, `personas` | 200 cupo restante (RN-01) | 400, 404, 422 |
| `POST /api/cotizaciones` | CU-02 | `{ destinoId, fecha, personas }` | 200 desglose con IVA (RN-03) | 400, 404, 409, 422 |
| `POST /api/reservas` | CU-03 | `{ destinoId, fecha, personas, nombre, correo, telefono, numeroTarjeta }` | 201 reserva (RN-01, RN-03, RN-04) | 400, 404, 409, 422, 429 |
| `POST /api/reservas/consulta` | CU-04 | `{ codigo, correo }` | 200 reserva | 400, 404, 429 |
| `PATCH /api/reservas/:codigo/fecha` | CU-05 | `{ correo, fecha }` | 200 reserva con la nueva fecha (RN-01, RN-02) | 400, 404, 409, 422, 429 |
| `PATCH /api/reservas/:codigo/cancelacion` | CU-06 | `{ correo }` | 200 reserva Cancelada (RN-02) | 400, 404, 409, 422, 429 |
| `POST /api/auth/login` | CU-07 | `{ correo, password }` | 200 `{ token, administrador }` | 400, 401, 429 |

### Destino (respuesta de `GET /api/destinos`)

```json
{ "id": "6f1c…", "nombre": "Parque Nacional Cahuita", "descripcion": "Sendero costero…",
  "precioBase": 40, "capacidadMaximaDiaria": 20, "imagenUrl": "https://…" }
```

### Cotización (respuesta de `POST /api/cotizaciones`)

```json
{ "destino": { "id": "6f1c…", "nombre": "Parque Nacional Cahuita" }, "fecha": "2026-11-20",
  "personas": 3, "precioBase": 40, "subtotal": 120, "tasaIva": 0.13, "iva": 15.6, "montoTotal": 135.6 }
```

### Crear una reserva

```http
POST /api/reservas
Content-Type: application/json

{ "destinoId": "6f1c…", "fecha": "2026-11-20", "personas": 3,
  "nombre": "Ana Mora", "correo": "ana@correo.cr", "telefono": "8888-0000",
  "numeroTarjeta": "4111111111111112" }
```

```json
201 Created
{ "codigo": "VY-7KQ2MD", "destino": { "id": "6f1c…", "nombre": "Parque Nacional Cahuita" },
  "fecha": "2026-11-20", "personas": 3, "precioBase": 40, "subtotal": 120, "tasaIva": 0.13,
  "iva": 15.6, "montoTotal": 135.6, "estadoReserva": "Pendiente", "estadoPago": "Aprobado",
  "tarjetaUltimos4": "1112", "cliente": { "nombre": "Ana Mora" }, "modificable": true }
```

- El teléfono y el correo no se devuelven; de la tarjeta solo se guardan y muestran los últimos 4 dígitos (S-05).
- Con una tarjeta que termina en dígito par el pago queda Aprobado; con dígito impar, Rechazado (RN-04). La reserva se registra en ambos casos.
- Después del COMMIT se envía el correo de confirmación; si el proveedor falla, la reserva no se afecta.
- `modificable` indica si todavía se puede cambiar la fecha o cancelar: la reserva está activa y faltan más de 48 horas (RN-02). Se calcula igual al crear, consultar, cambiar la fecha y cancelar; para una excursión dentro de 48 horas es `false`.

## Endpoints de administración (JWT)

| Método y ruta | CU | Entrada | Éxito | Errores |
|---|---|---|---|---|
| `GET /api/admin/sesion` | — | — | 200 administrador de la sesión | 401 |
| `POST /api/admin/destinos` | CU-08 | `{ nombre, descripcion?, precioBase, capacidadMaximaDiaria, imagenUrl? }` | 201 destino | 400, 401, 409 |
| `GET /api/admin/destinos?estado=&nombre=` | CU-09 | `estado`: activo, inactivo o todos | 200 lista | 400, 401 |
| `PUT /api/admin/destinos/:id` | CU-10 | Campos de CU-08 + `activo` | 200 destino | 400, 401, 404, 409, 422 |
| `PATCH /api/admin/destinos/:id/desactivacion` | CU-11 | — | 204 (borrado lógico) | 401, 404, 409 |
| `GET /api/admin/reservas?destinoId=&desde=&hasta=&estadoReserva=&estadoPago=` | CU-12 | Filtros opcionales | 200 lista con cliente, estados, montos y `creadaEn` | 400, 401 |
| `PATCH /api/admin/reservas/:id/aprobacion` | CU-13 | — | 200 reserva Aprobada (envía correo) | 401, 404, 409 |
| `PATCH /api/admin/reservas/:id/cancelacion` | CU-14 | — | 200 reserva Cancelada, sin la restricción de 48 h (SUP-04; envía correo) | 401, 404, 409 |
| `DELETE /api/admin/reservas/:id` | CU-15 | `{ codigoConfirmacion }` | 204 | 400, 401, 404 |
| `PATCH /api/admin/reservas/:id/pago` | CU-16 | `{ estadoPago }`: Pendiente, Aprobado o Rechazado | 200 reserva | 400, 401, 404, 409 |

`imagenUrl` es opcional y solo acepta direcciones `https://` sin espacios, de hasta 500 caracteres.

## Dónde está en el código

| Pieza | Archivo |
|---|---|
| Rutas y CU de cada endpoint | `backend/src/routes/index.ts` |
| Validación de entradas | `backend/src/validation/esquemas.ts` |
| Forma de las respuestas | `backend/src/controllers/presentadores.ts` |
| Errores problem+json | `backend/src/middlewares/errores.ts` |
| Cliente del frontend | `frontend/src/servicios/crearServicios.ts` y `contratos.ts` |
