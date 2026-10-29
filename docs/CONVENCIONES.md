# Convenciones de construcción — ViajaYa

Acuerdos para la Fase de Construcción (Sprints 1 a 3). Complementan el SAD 1.1 y el SDP 1.1; si algo aquí contradice el SAD, se corrige el SAD o este documento antes de programar.
---

## 1. Stack

| Capa | Tecnología | Nota |
|---|---|---|
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS 4 + React Router 7 | SPA, sitio estático en Render |
| Backend | Node.js ≥ 20 + TypeScript (estricto) + Express 5 | API REST sin estado, servicio web en Render |
| Datos | PostgreSQL 17 en Supabase, `pg` con SQL parametrizado | RLS en todas las tablas, rol `viajaya_api` |
| Validación | zod | En cada ruta del backend |
| Seguridad | JWT HS256 (`jsonwebtoken`), bcrypt (`bcryptjs`), helmet, CORS, express-rate-limit | |
| Logs | pino + pino-http (JSON) | Con id de correlación `x-request-id` |
| Pruebas | Mocha + Chai, cobertura con c8 | `npm test` |
| Repositorio | GitHub, monorepo con npm workspaces | `backend/`, `frontend/`, `database/` |

---

## 2. Arquitectura e inversión de control

### 2.1 Capas del backend y quién puede importar a quién

```
routes ──► controllers ──► services ──► rules (funciones puras)
                              │
                              └──► ports (interfaces) ◄── repositories/pg, infra (implementaciones)
                                                    ▲
                               container.ts ────────┘  (único que une interfaces con clases concretas)
```

| Carpeta | Contiene | Puede importar | NO puede importar |
|---|---|---|---|
| `rules/` | RN-01 a RN-04 como funciones puras | `models`, `shared`, `errors`, `ports` (tipos) | Express, `pg`, servicios |
| `services/` | Un servicio por grupo de casos de uso | `rules`, `ports`, `models`, `errors`, `shared` | Express, `pg`, `bcryptjs`, `jsonwebtoken`, `infra/`, `repositories/` |
| `ports/` | Interfaces: repositorios, `UnidadDeTrabajo`, `PasarelaPago`, `Reloj`, `GeneradorCodigo`, `HasherContrasena`, `EmisorToken` | `models` | Cualquier implementación |
| `repositories/pg/` | Implementaciones con SQL | `ports`, `models`, `shared`, `pg` | `services` |
| `infra/` | Reloj, bcrypt, JWT, generador de códigos | `ports`, librerías | `services` |
| `controllers/` | Traducen HTTP ⇄ servicio; validan con zod | `services` (tipos), `validation`, `presentadores` | `repositories`, `pg` |
| `container.ts` | **Raíz de composición**: crea todo y lo conecta | Todo | — |

**Regla de oro:** un servicio recibe todo lo que usa **por constructor** y como **interfaz**. Si escribe `new` de algo de infraestructura dentro de un servicio, va en el lugar equivocado: muévalo a `container.ts`.

### 2.2 Por qué así (para la defensa)

- **Bajo acoplamiento:** `ReservaService` no sabe si el pago es simulado o real (`PasarelaPago`, ADR-07), ni si los datos vienen de PostgreSQL o de memoria (`UnidadDeTrabajo`).
- **Pruebas sin base de datos:** las pruebas pasan dobles en memoria (`test/fakes/memoria.ts`) y un `RelojFijo`, así RN-02 se prueba con cualquier fecha y la suite corre en menos de un segundo, sin red, en vivo.
- **Un solo punto de cambio:** cambiar una implementación es cambiar una línea en `container.ts`.
- **Sin librería de IoC:** inyección manual por constructor; no hay decoradores ni "magia" que explicar.

### 2.3 Transacciones (RN-01, ADR-04)

Toda operación que **crea o mueve** una reserva va dentro de `uow.ejecutar(async (repos) => { … })`. Dentro:

1. `repos.destinos.bloquearPorId(id)` → `SELECT … FOR UPDATE` (serializa reservas del mismo destino).
2. `repos.reservas.sumarPersonasActivas(destinoId, fecha, excluirId?)`.
3. `CupoService.verificar(...)` → si no alcanza, `throw new CupoInsuficienteError(disponibles)` (provoca ROLLBACK).
4. Cálculos, pago, inserciones y bitácora con **los mismos `repos`** (misma conexión).

Nunca use `uow.lectura` dentro de una transacción: esa conexión no ve el bloqueo.

### 2.4 Frontend

- `servicios/contratos.ts` define las interfaces (`DestinosApi`, `ReservasApi`, `AuthApi`).
- `servicios/crearServicios.ts` es la raíz de composición; `ServiciosProvider` las inyecta por contexto.
- Componentes y hooks usan `useServicios()`. **Ningún componente llama a `fetch`**: solo `servicios/http.ts`.

### 2.5 Receta: cómo implementar una historia (ejemplo HU-10, crear reserva)

1. **Puerto:** agregue a `ports/repositorios.ts` los métodos que necesita (p. ej. `ReservaRepository.crear`, `ClienteRepository.registrarOActualizar`) y súmelos a `Repositorios`.
2. **Doble en memoria:** impleméntelos en `test/fakes/memoria.ts`.
3. **Prueba primero:** escriba `test/services/rf03-crear-reserva.test.ts` con los IDs del SRS (`UT-RF03-a`, `UT-RF03-b`).
4. **Servicio:** implemente `ReservaService.crear()` siguiendo el diagrama de secuencia CU-03 del SAD hasta que la prueba pase.
5. **Repositorio real:** impleméntelo en `repositories/pg/` y regístrelo en `crearRepositorios()` de `PgUnidadDeTrabajo.ts`.
6. **HTTP:** esquema zod en `validation/esquemas.ts`, método en el controlador, ruta en `routes/index.ts` con el comentario del caso de uso.
7. **Frontend:** método en la interfaz de `contratos.ts`, implementación en `crearServicios.ts`, pantalla en `paginas/`.
8. Verifique la **definición de terminado** (sección 7).

---

## 3. Reglas de seguridad

| ID | Regla | Dónde se aplica |
|---|---|---|
| S-01 | **Secretos fuera del código.** `.env` está en `.gitignore`; solo se versiona `.env.example` vacío. En Render, variables de entorno. Si un secreto llega a un commit: rotarlo de inmediato (R-07). | `.gitignore`, `config/env.ts` |
| S-02 | **SQL siempre parametrizado** (`$1`, `$2`). Prohibido interpolar valores en el SQL. ESLint lo bloquea. | `repositories/pg/`, `eslint.config.mjs` |
| S-03 | **Validar toda entrada en el servidor** con zod y `.strict()` (rechaza campos extra). Cuerpos de 10 KB como máximo. El frontend valida solo por comodidad. | `validation/esquemas.ts`, `app.ts` |
| S-04 | **Autenticación del administrador:** bcrypt costo 12; JWT HS256 con algoritmo, emisor y audiencia fijos al verificar; vigencia de 8 h. El middleware se monta **una vez sobre todo `/api/admin`**. | `infra/`, `routes/index.ts` |
| S-05 | **Tarjeta:** solo dígitos (13 a 19); no se piden CVV ni vencimiento; se guardan solo los últimos 4 dígitos; nunca se escriben en logs. | `PagoSimuladoService`, `config/logger.ts` |
| S-06 | **Aleatoriedad segura:** `crypto.randomInt` para el código VY-XXXXXX, con un alfabeto sin 0/O/1/I. `Math.random` está prohibido (ESLint). | `GeneradorCodigoAleatorio` |
| S-07 | **Límite de intentos por IP:** 5/min en el login, 10/min en las rutas con código y correo, y 10 reservas cada 10 min (cada una envía un correo). | `middlewares/limites.ts` |
| S-08 | **Cabeceras y red:** helmet, CORS solo para los orígenes de `CORS_ORIGENES`, HTTPS (Render). | `app.ts` |
| S-09 | **Base de datos con mínimo privilegio:** RLS en las 8 tablas; `anon` y `authenticated` sin permisos; el backend usa el rol `viajaya_api` (no `postgres`). El frontend **nunca** usa `supabase-js` ni la anon key. | `database/migrations/` |
| S-10 | **Errores sin fugas:** problem+json, sin stack traces ni mensajes internos. Mensaje genérico en el login ("Credenciales inválidas.") y en la consulta de reservas (RNF-06). | `middlewares/errores.ts`, `AuthService` |
| S-11 | **Logs sin datos personales:** se ocultan `authorization`, `password`, `numeroTarjeta`, `correo` y `token`. El correo viaja en el cuerpo, nunca en la URL. En el frontend, el token va en `sessionStorage` y se borra ante un 401. | `config/logger.ts`, `almacenSesion.ts` |
| S-12 | **Dependencias:** `package-lock.json` versionado y `npm audit` antes de cada entrega. Nada de `dangerouslySetInnerHTML`. | — |

---

## 4. Estilo de código

- **Idioma:** el dominio va en español y con los términos exactos del Glosario (`Destino`, `Reserva`, `cupo`, `estado_pago`). Los sufijos técnicos siguen el SAD: `ReservaService`, `DestinoRepository`, `ReservasController`.
- **Archivos:** las clases van en PascalCase (`ReservaService.ts`) y los módulos de funciones en kebab-case (`unidad-de-trabajo.ts`).
- **TypeScript estricto**, sin `any`. Si de verdad no se conoce el tipo, use `unknown` y valide.
- **Dinero:** dentro del backend, **siempre en céntimos enteros** (`precioBaseCentimos`). Solo `controllers/presentadores.ts` convierte a decimales. Nunca `parseFloat` en montos.
- **Fechas de viaje:** texto `'AAAA-MM-DD'` (el tipo `date` de PostgreSQL ya se lee como texto). Para "hoy" y la regla de 48 horas use `shared/fechas.ts`, que fija UTC−6. La hora actual se pide al `Reloj` inyectado, nunca con `new Date()` dentro de un servicio.
- **Errores:** los servicios lanzan errores de dominio (`CupoInsuficienteError`, `VentanaVencidaError`, `ReservaNoActivaError`, …), **nunca códigos HTTP**. El middleware decide el código.
- **Comentarios:** cada servicio, ruta y prueba indica su CU, RF o RN, para la trazabilidad que evalúa el curso.
- **Formato:** Prettier (`npm run format`) y ESLint (`npm run lint`) antes de abrir el merge request.

---

## 5. Flujo de Git (GitHub)

Resumen; la guía completa, con comandos, está en [`FLUJO_GIT.md`](FLUJO_GIT.md).

| Rama | Para qué | Quién escribe |
|---|---|---|
| `main` | Lo que está en producción (Render despliega desde aquí). Cada entrega es un tag (`v0.3.0-entrega3`). | Solo por pull request desde `develop` |
| `develop` | Integración: el sistema completo con las historias terminadas. | Solo por pull request desde `feature/*` o `fix/*` |
| `feature/hu-xx-nombre` | Una rama por historia del backlog. | Commits directos |
| `fix/descripcion` | Corrección de un defecto. | Commits directos |

- Commits con el formato `tipo(área): HU-xx descripción`, por ejemplo `feat(reservas): HU-10 transacción con bloqueo de destino`. Tipos: `feat`, `fix`, `test`, `docs`, `refactor`, `chore`, `ci`.
- Título del pull request: `HU-xx · Nombre de la historia`. En la descripción va el caso de uso que cubre y las pruebas que agrega.
- Nunca se hace `push --force` sobre `main` ni sobre `develop`.

---

## 6. Pruebas

- Cada prueba lleva en el título **el ID del SRS** (`UT-RN01-a`, `UT-RF03-b`) para que en la defensa se lea la trazabilidad en la salida de `npm test`.
- Las reglas (`rules/`) se prueban directo; los servicios, con los dobles de `test/fakes/memoria.ts`.
- Meta del curso: ≥ 5 pruebas de RN y ≥ 10 de RF-01 a RF-06. Meta del SDP: ≥ 80 % de cobertura en reglas y servicios (`npm run test:cobertura -w backend`).

---

## 7. Definición de terminado (SDP 3.1)

- [ ] El comportamiento coincide con el caso de uso del SRS, flujos alternativos incluidos.
- [ ] Hay pruebas con el ID del SRS y `npm test` está en verde.
- [ ] `npm run typecheck` y `npm run lint` sin errores.
- [ ] Las reglas S-01 a S-12 aplicables se cumplen.
- [ ] El pull request se revisó con esta lista y la integración continua (GitHub Actions) está en verde.
- [ ] Está desplegado en Render y probado ahí.

---

## 8. Estilo de interfaz

**Concepto:** la cotización se presenta como un **boleto de excursión** con talón troquelado; es el único elemento decorativo. Todo lo demás es sobrio: filas, líneas finas y buena tipografía.

### Tokens (`frontend/src/estilos.css`)

| Token | Valor | Uso |
|---|---|---|
| `niebla` | `#F1F5F3` | Fondo general |
| `superficie` | `#FFFFFF` | Paneles y formularios |
| `tinta` | `#13302B` | Texto principal |
| `tinta-suave` | `#4A625C` | Texto secundario |
| `linea` | `#CDDBD6` | Bordes y divisores |
| `caribe` / `caribe-oscuro` | `#0E6B61` / `#0A524A` | Acciones, foco y elemento seleccionado |
| `sol` | `#E8B321` | **Solo** el talón del boleto |
| `error` / `exito` | `#B3261E` / `#1F7A3A` | Mensajes de estado |

Use siempre los nombres de los tokens (`bg-caribe`, `text-tinta-suave`), nunca colores sueltos.

### Tipografía

- **Bricolage Grotesque** (`font-display`): títulos y cifras destacadas.
- **Atkinson Hyperlegible** (`font-sans`): todo el texto. Está diseñada para legibilidad, pensando en turistas con nivel técnico básico y en celular.
- Montos con `.cifra` (números tabulares, para que las columnas se alineen).

### Componentes y patrones

- **Listas, no tarjetas:** los destinos y reservas van como filas con divisores. Lo seleccionado lleva un borde izquierdo `caribe` de 4 px.
- **Clases base:** `.campo`, `.etiqueta`, `.boton-primario`, `.boton-secundario`, y los componentes `<Aviso>` y `<Boleto>`.
- **Turista:** pensado primero para celular, en una columna. **Administrador:** tablas en escritorio.

### Textos

- Siempre en español y en tono "usted".
- Los botones dicen exactamente qué hacen: "Ver cupo y precio", "Reservar", "Cancelar reserva".
- Los errores dicen qué pasó y cómo seguir, nombrando la regla. Por ejemplo: "Cupo insuficiente: quedan 3 espacios para esa fecha. Pruebe con otra fecha o menos personas." o "Solo se puede cambiar la fecha hasta 48 horas antes de la excursión."
- Sin disculpas ni mensajes vagos.

### Accesibilidad (RNF-09, WCAG 2.1 AA)

- Toda entrada tiene `<label>`. Los errores de campo usan `aria-invalid` y `aria-describedby`.
- Los mensajes usan `role="alert"` o `role="status"`.
- El foco es visible (borde `caribe` de 3 px) y se respeta `prefers-reduced-motion`.
- El contraste de `tinta` sobre `niebla` es ≥ 7:1 y el de `tinta-suave`, ≥ 4,5:1.
