# ControlApps Clientes

Mini CRM en Next.js + Prisma para cargar, revisar y enriquecer empresas de la Ronda de Negocios Ramallo 2026.

## Stack

- Next.js 16
- React 19
- Prisma ORM
- SQLite local en `prisma/dev.db`
- `xlsx` para importar contactos desde Excel

## Qué hace hoy

- Lista empresas con búsqueda por texto y filtro por categoría
- Permite editar categoría, keywords y comentario desde la ficha expandible
- Guarda datos en SQLite vía Prisma
- Importa empresas/contactos desde archivos locales del evento
- Categoriza empresas de forma automática con reglas simples

## Requisitos

- Node.js 22 o compatible
- `npm`

## Puesta en marcha

1. Instalar dependencias:

```bash
npm install
```

2. Crear la base desde el schema:

```bash
npm run db:push
```

3. Levantar el entorno local:

```bash
npm run dev
```

La app queda disponible en `http://localhost:3000`.

## Variables de entorno

Archivo `.env`:

```env
DATABASE_URL="file:./prisma/dev.db"
```

## Scripts disponibles

```bash
npm run dev
npm run build
npm run start
npm run db:push
npm run db:seed
npm run import:ramallo
npm run categorize:companies
```

### `db:seed`

Carga un set chico de datos de ejemplo definido en `prisma/seed.js`.

### `import:ramallo`

Importa empresas y contactos del evento desde archivos ubicados en el Escritorio del usuario actual:

- `~/Desktop/empresas_ramallo2026.csv`
- `~/Desktop/Ronda_Negocios_Ramallo_2026_Contactos.xlsx`
- o `~/Desktop/1Ronda_Negocios_Ramallo_2026_Contactos.xlsx`

El script:

- une empresas y contactos
- normaliza nombres para hacer matching
- crea o actualiza `Company`
- registra una interacción inicial de importación

### `categorize:companies`

Analiza nombre, rubro, tipo de negocio, descripción y productos para:

- asignar `category`
- generar `keywords`

Las reglas viven en `scripts/categorize-companies.js`.

## Estructura

```text
src/
  app/
    actions.ts        Server Actions para crear/editar datos
    page.tsx          Página principal
  components/
    company-directory.tsx
  lib/
    db.ts             Singleton de PrismaClient
    crm.ts            Consultas de lectura

prisma/
  schema.prisma
  seed.js
  dev.db

scripts/
  import-ramallo.js
  categorize-companies.js
```

## Modelo principal

La entidad central es `Company`, relacionada con:

- `Contact`
- `Interaction`
- `Task`

Los enums actuales relevantes:

- `CompanyStatus`: `LEAD`, `PROSPECT`, `CLIENT`, `INACTIVE`
- `CompanyCategory`: categorías sectoriales como `AGRO`, `INDUSTRIA`, `SALUD`, `TECNOLOGIA_AUTOMATIZACION`, etc.

## Nota sobre datos legacy

Este proyecto tuvo categorías antiguas en la base (`PRIORITARIA`, `POTENCIAL_CLIENTE`, `ALIADO`) que ya no existen en el enum `CompanyCategory`.

Para evitar que Prisma falle al leer una base vieja, `src/lib/crm.ts` normaliza esos valores a `SIN_CATEGORIA` antes de las consultas principales.

Si querés dejar la base completamente alineada después de importar datos, corré:

```bash
npm run categorize:companies
```

## Flujo recomendado

1. `npm install`
2. `npm run db:push`
3. `npm run import:ramallo` si vas a trabajar con la base del evento
4. `npm run categorize:companies`
5. `npm run dev`

## Observaciones

- La base es local y no hay autenticación.
- El proyecto está pensado para uso interno y rápido, no para despliegue multiusuario.
- Algunos textos importados pueden venir con problemas de encoding desde los archivos fuente.
