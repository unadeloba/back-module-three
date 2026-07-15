# Repository Guide

## Scope and Entry Points

- This is one npm package: a NestJS 11 API backed by PostgreSQL through TypeORM. `src/main.ts` is the runtime bootstrap; `src/app.module.ts` wires configuration, the database, and the `customers`, `products`, and `orders` feature modules.
- Runtime routes are prefixed with `/api` in `src/main.ts`. Tests that instantiate `AppModule` directly do not inherit that prefix or the global validation pipe unless they configure them explicitly.
- Keep each feature's controller, service, DTOs, and entities under `src/<feature>/`. Register new entities with the feature's `TypeOrmModule.forFeature(...)` and import new feature modules in `AppModule`.

## Commands

- Host-run npm commands need Node `^20.19.0`, `^22.13.0`, or `>=24.11.0` per the locked dependency graph. Install it with `npm ci`; `package-lock.json` is authoritative.
- Start PostgreSQL and the watch-mode API with `docker compose up --build`. For host-run Nest commands that need the database, start only PostgreSQL with `docker compose up -d db`.
- Run locally with `npm run start:dev`; defaults are `HOST=0.0.0.0`, `PORT=3000`, and a PostgreSQL connection at `localhost:5432` using `nest_user` / `nest_password` / `nest_db`.
- Build with `npm run build`. Production startup is `npm run start:prod` and requires an existing `dist/` from the build.
- Run unit tests with `npm test -- --runInBand`; focus one unit file with `npm test -- --runInBand app.controller.spec.ts` because Jest's unit `rootDir` is `src`.
- Run e2e tests with `npm run test:e2e`; they import `AppModule`, so PostgreSQL must be reachable with the configured `DB_*` values.
- `npm run lint` and `npm run format` both rewrite files. The checked-in TypeScript has existing Prettier-backed lint failures, so either limit `npx prettier --write <files>` and `npx eslint <files>` to touched TypeScript or expect broad unrelated churn from the package scripts.

## Data and API Invariants

- Global validation strips unknown properties, transforms payloads, and rejects non-whitelisted fields. Express request DTO rules through `class-validator`/`class-transformer`; do not duplicate transport validation in controllers.
- Customer and product deletion is a soft delete via `isActive=false`; normal lookups exclude inactive records. Preserve that behavior unless the API contract changes.
- Order creation must remain atomic: it checks for an active customer and active products, locks each product with `pessimistic_write`, decrements stock, snapshots item prices, computes the total, and saves the order in one TypeORM transaction.
- PostgreSQL `decimal` values arrive as strings. Reuse `ColumnNumericTransformer` for numeric entity fields that callers expect as numbers.
- TypeORM currently uses `autoLoadEntities: true` and `synchronize: true`; there is no migration workflow. Do not treat this as production-safe or introduce migration commands that the repository does not provide.

## Verification

- For code changes, format and lint touched TypeScript first, then run `npm run build` and `npm test -- --runInBand`.
- Add `npm run test:e2e` when changing module wiring, HTTP routes, validation, entities, or database behavior, with PostgreSQL running first.
- The e2e fixture creates Nest directly and currently tests `/`, while the real bootstrap serves routes under `/api`; account for this difference when adding endpoint tests.
