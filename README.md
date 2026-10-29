# ViajaYa — Sistema de Reservas Turísticas

Proyecto del curso IF6100 Análisis y diseño de sistemas, Universidad de Costa Rica.
Equipo: Carlos Ford Edwards, Deiver Ponce Vindas y Johan Dávila Moya.

Plataforma web autoservicio para buscar destinos, cotizar con IVA, reservar con pago simulado y administrar destinos y reservas. La arquitectura está en el SAD 1.1 y los acuerdos de código, seguridad y diseño en [`docs/CONVENCIONES.md`](docs/CONVENCIONES.md).

## En línea

| | URL |
|---|---|
| Sitio (dominio Dynu) | https://viajaya.giize.com |
| Sitio (Render) | https://viajaya-web.onrender.com |
| API REST | https://viajaya-api.onrender.com/api/salud |

El plan gratuito de Render duerme la API tras unos minutos sin uso; la primera petición tarda hasta un minuto. El guion de la defensa está en [`docs/GUIA_DEMO.md`](docs/GUIA_DEMO.md).

```
viajaya/
├── backend/     API REST · Node.js + TypeScript + Express (puerto 3000)
├── frontend/    SPA · React + TypeScript + Vite + Tailwind (puerto 5173)
├── database/    migrations/ (esquema, RLS, rol de la API) y seeds/
└── docs/        CONVENCIONES.md
```

## Requisitos

- Node.js 20 o superior (`node -v`)
- Acceso al proyecto de Supabase `viajaya`

## Puesta en marcha local

```bash
# 1. Dependencias (desde la raíz; instala backend y frontend)
npm install

# 2. Variables de entorno
cp backend/.env.example backend/.env      # complete DATABASE_URL y JWT_SECRET
cp frontend/.env.example frontend/.env

# 3. Administrador inicial (lee ADMIN_NOMBRE, ADMIN_CORREO y ADMIN_PASSWORD de backend/.env)
npm run crear-admin -w backend            # luego borre ADMIN_PASSWORD del .env

# 4. Levantar la API y la interfaz (dos terminales)
npm run dev:api
npm run dev:web                           # http://localhost:5173

# 5. Pruebas unitarias (Mocha + Chai)
npm test
npm run test:cobertura -w backend
```

Para comprobar la API: `GET http://localhost:3000/api/salud` debe responder `{"estado":"ok"}`.

### Base de datos

Las migraciones ya están aplicadas en el proyecto de Supabase. Para recrear la base en otro proyecto, ejecute en orden desde pgAdmin o el editor SQL de Supabase:

1. `database/migrations/001_esquema.sql`: las 8 tablas, la vista `v_reservas_detalle`, los índices y RLS.
2. `database/migrations/002_rol_api.sql`: el rol `viajaya_api` con sus políticas. Después ejecute `ALTER ROLE viajaya_api PASSWORD '…';`.
3. `database/seeds/001_destinos.sql`: los destinos de prueba.

La conexión del backend usa el **pooler de Supabase en modo sesión** con el usuario `viajaya_api.<ref>`. Cópiela de Supabase > Connect > Session pooler y cambie el usuario `postgres` por `viajaya_api`.

## Despliegue en línea

```
Navegador ──HTTPS──► viajaya-web (Render, sitio estático)  ◄── viajaya.giize.com (Dynu)
    │
    └──HTTPS + JWT──► viajaya-api (Render, Node.js) ──TLS──► PostgreSQL con RLS (Supabase)
```

La base ya está en Supabase. Los dos servicios de Render se crean desde [`render.yaml`](render.yaml):

1. En Render, New > Blueprint, conecte su GitHub y elija este repositorio.
2. Complete las variables marcadas como secretas:

   | Servicio | Variable | Valor |
   |---|---|---|
   | `viajaya-api` | `DATABASE_URL` | La misma de `backend/.env` |
   | `viajaya-api` | `DATABASE_CA` | El certificado de Supabase (Database > Settings > SSL Configuration) |
   | `viajaya-api` | `JWT_SECRET` | Uno nuevo: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
   | `viajaya-api` | `CORS_ORIGENES` | `https://viajaya-web.onrender.com` (más el host de Dynu si lo usa) |
   | `viajaya-web` | `VITE_API_URL` | `https://viajaya-api.onrender.com` |

3. Cada push a `main` vuelve a desplegar los dos servicios.

### Dominio propio con Dynu (opcional)

1. En dynu.com, en Control Panel > DDNS Services > Add, cree un nombre gratuito (el proyecto usa `viajaya.giize.com`).
2. Ponga como **IPv4 Address** `216.24.57.1` (el balanceador de Render) y deje vacía la IPv6, porque Render solo usa IPv4. Desactive la actualización automática de IP.
3. En Render, en `viajaya-web` > Settings > Custom Domains, agregue `viajaya.giize.com` y espere a que el certificado HTTPS quede en *Verified*.
4. Agregue `https://viajaya.giize.com` a `CORS_ORIGENES` de `viajaya-api`.

Antes de la demo, abra `https://viajaya-api.onrender.com/api/salud` unos minutos antes para despertar el plan gratuito (RNF-11).

## Seguridad: JWT y RLS

- **JWT:** `POST /api/auth/login` devuelve un token HS256 de 8 horas. Todo `/api/admin/*` lo exige en `Authorization: Bearer <token>`, y sin token o con uno vencido responde 401.
- **RLS:** está activado en las 8 tablas. Los roles públicos de Supabase (`anon`, `authenticated`) no tienen permisos. El backend entra con el rol `viajaya_api`, que solo pasa por sus propias políticas (`database/migrations/002_rol_api.sql`).
- Las 12 reglas completas están en [`docs/CONVENCIONES.md`](docs/CONVENCIONES.md#3-reglas-de-seguridad).

## Flujo de trabajo con Git

`main` (producción) ← `develop` (integración) ← `feature/hu-xx-*` (una por historia). La guía con comandos está en [`docs/FLUJO_GIT.md`](docs/FLUJO_GIT.md).

## Estado de la Construcción

| Historia | Caso de uso | Estado |
|---|---|---|
| HU-01 Monorepo, TypeScript, Mocha | — | ✅ |
| HU-02 Esquema, RLS, semillas | — | ✅ |
| HU-03 Inicio de sesión con JWT | CU-07 | ✅ backend + pantalla |
| HU-08 Búsqueda y disponibilidad | CU-01 | ✅ backend + pantalla |
| HU-09 Cotización con IVA | CU-02, CU-19 | ✅ backend + pantalla |
| RN-01 a RN-04 | CU-17 a CU-20 | ✅ reglas + 7 pruebas del SRS |
| Pruebas RF-01 a RF-06 | — | ✅ las 10 del SRS (UT-RF01 a UT-RF06-b) |
| HU-10 Crear reserva con cupo transaccional y pago simulado | CU-03, CU-17, CU-20 | ✅ backend + pantalla |
| HU-11 Consultar reserva | CU-04 | ✅ backend + pantalla |
| HU-12 Cambiar fecha | CU-05, CU-18 | ✅ backend + pantalla |
| HU-13 Cancelar reserva (turista) | CU-06 | ✅ backend + pantalla |
| HU-04 a HU-07 Crear, listar, editar/reactivar y desactivar destinos | CU-08 a CU-11 | ✅ backend + panel |
| HU-14 a HU-17 Listar, aprobar, cancelar y eliminar reservas | CU-12 a CU-15 | ✅ backend + panel |
| HU-18 Actualizar estado de pago | CU-16 | ✅ backend + panel |
