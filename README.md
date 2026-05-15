# ControlApps Clientes

Mini CRM + agenda en Next.js + Prisma + SQLite para gestionar prospectos comerciales (Ronda de Negocios Ramallo 2026 y más).

🌐 **Producción:** https://clientes.controldoc.app

## Stack

- Next.js 16 (App Router, Server Actions)
- React 19
- Prisma ORM + SQLite (`prisma/dev.db`)
- `xlsx` para importar contactos desde Excel
- Hosted en VPS Contabo + Caddy + Cloudflare proxy (ver [DEPLOY.md](./DEPLOY.md))

## Qué hace

### 📋 Clientes (`/`)
- Lista de empresas con búsqueda full-text y filtros por categoría/subcategoría
- **4 buckets** para triage: Sin asignar / Próximos / Futuros / Magnates
- Tabs sticky arriba con contadores por bucket
- Botones inline en cada tarjeta para **mover** entre buckets (→ Próximos / → Futuros / → Magnates / Quitar)
- Botón **📅 Agendar** en cada tarjeta para crear una tarea ligada a esa empresa sin salir de la pantalla
- Ficha expandible con detalle de contacto, posible negocio, filtros, soluciones posibles
- Edición inline de comentarios, filtros y soluciones (server actions)

### 📅 Agenda (`/agenda`)
- Hero con saludo dinámico (Buen día / Buenas tardes / etc.)
- Stat pills: Hoy / Vencidas / Esta semana / Hechas
- **Quick-add**: título + chips Hoy/Mañana/Otra + hora + prioridad + empresa opcional → Enter para crear
- Tabs Hoy / Mañana / Esta semana / Pendientes / Hechas
- Tareas con checkbox para marcar hechas, badges de prioridad, badge de empresa ligada, edición inline con formulario completo

### 🗒️ Brief (`/brief`)
- Resumen semanal con saludo del día y resumen accionable
- 4 stat pills: Vencidas / Magnates sin tarea / Próximos sin tarea / Hechas en 7d
- Tira de overview: contadores por bucket + tareas pendientes + nuevas
- Secciones accionables:
  - 🔥 Tareas vencidas
  - 📅 Esta semana
  - 👑 Magnates sin tarea agendada (con Agendar inline)
  - 🎯 Próximos sin tarea agendada (con Agendar inline)
  - 🆕 Empresas nuevas (últimos 7 días)

### 🎨 Diseño
- Tema claro con paleta azul + verde + violeta (consistente en las 3 pantallas)
- 100% responsive (breakpoints 480/640/768/860/1120 px)
- Touch targets ≥ 40px en mobile, sticky tabs, no zoom en inputs iOS

## Requisitos

- Node.js 22+
- npm

## Puesta en marcha (local)

```bash
git clone https://github.com/loctime/controlapps-clientes.git
cd controlapps-clientes
npm install
echo 'DATABASE_URL="file:./dev.db"' > .env
npm run db:push
npm run dev
```

App en `http://localhost:3000`.

## Scripts

```bash
npm run dev                  # dev server
npm run build                # build de prod
npm run start                # start de prod
npm run db:push              # sincronizar schema con SQLite
npm run db:seed              # cargar datos de ejemplo
npm run import:ramallo       # importar empresas/contactos de la Ronda Ramallo
npm run categorize:companies # categorizar empresas por keywords/category
npm run assign:buckets       # auto-asignar buckets (Próximos/Futuros/Magnates) por heurística
```

`assign:buckets` solo toca empresas en `SIN_ASIGNAR`. Para reprocesar todas:
```bash
node scripts/assign-buckets.js --all
```

## Modelo de datos

Entidad central: `Company`, con relaciones:
- `Contact` (varios contactos por empresa, uno primario)
- `Interaction` (notas, llamadas, emails, reuniones, WhatsApp)
- `Task` (con `companyId` opcional — puede ser tarea suelta sin empresa)

Enums relevantes:
- `CompanyBucket`: `SIN_ASIGNAR`, `PROXIMOS`, `FUTUROS`, `MAGNATES`
- `CompanyCategory`: sectores (`AGRO`, `INDUSTRIA`, `METALURGICA`, `TECNOLOGIA_AUTOMATIZACION`, etc.)
- `CompanyStatus`: `LEAD`, `PROSPECT`, `CLIENT`, `INACTIVE`
- `TaskPriority`: `LOW`, `MEDIUM`, `HIGH`
- `TaskStatus`: `PENDING`, `IN_PROGRESS`, `DONE`

## Estructura

```
src/
  app/
    actions.ts              Server Actions (companies, tasks, buckets)
    page.tsx                Home — Clientes
    agenda/page.tsx         /agenda
    brief/page.tsx          /brief
    layout.tsx              Topbar + nav
    globals.css             Paleta + responsive
    companies/[id]/         Ficha individual (legacy)
  components/
    company-directory.tsx   Lista + filtros + buckets + Agendar inline
    agenda-board.tsx        Agenda board con quick-add y edit inline
    weekly-brief.tsx        Brief con stats y secciones accionables
  lib/
    db.ts                   Singleton de PrismaClient
    crm.ts                  Consultas de empresas
    agenda.ts               Consultas de agenda + counts
    brief.ts                Consultas multitabla para Brief
    taxonomy.ts             Filtros y soluciones disponibles + serializadores
prisma/
  schema.prisma             Modelo + enums
  seed.js
  dev.db                    SQLite local (gitignored)
scripts/
  import-ramallo.js         Importa empresas/contactos de archivos en ~/Desktop
  categorize-companies.js   Categoriza por keywords
  assign-buckets.js         Heurística para asignar buckets
  add-card-companies.js     Carga empresas desde tarjetas personales
  merge-gradiente.js        Merge ad-hoc (caso GRADIENTE RH)
```

## Workflow recomendado

1. `npm install`
2. `npm run db:push`
3. `npm run import:ramallo` (o seed con tus datos)
4. `npm run categorize:companies`
5. `npm run assign:buckets`
6. `npm run dev` o deploy → triagear desde `/brief`

## Deploy

Ver [DEPLOY.md](./DEPLOY.md).

## Observaciones

- Base local SQLite — perfecto para uso single-user.
- Para multi-usuario o cloud: migrar a Postgres/Firestore (no implementado).
- Auth: no implementada todavía. El sitio en producción está **público**. Recomendado: Cloudflare Access (sin código) o middleware básico con password.
