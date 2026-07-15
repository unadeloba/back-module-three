# Phoenix Orders — Backend

NestJS 11 + TypeORM + PostgreSQL API for Phoenix Orders: customer, product, and order management with atomic order creation, a strict order lifecycle, and exactly-once cancellation restocking.

## Requirements

- Node `^20.19.0`, `^22.13.0`, or `>=24.11.0`
- Docker (for PostgreSQL via `docker compose`)

## Getting started

```bash
npm ci
docker compose up -d db      # starts PostgreSQL only
npm run start:dev            # watch mode, serves /api on localhost:3000
```

Full stack in Docker instead: `docker compose up --build`.

API docs (Swagger) are served at `http://localhost:3000/api/docs`; the raw contract is at `http://localhost:3000/api/docs-json` (this is what the sibling `front-module-three` frontend's types are generated from — treat it as ground truth for any contract change).

## Available scripts

| Script | What it does |
|---|---|
| `npm run start:dev` | Run the API in watch mode on `localhost:3000` |
| `npm run build` | Compile to `dist/` |
| `npm run start:prod` | Run the compiled build (requires `npm run build` first) |
| `npm test -- --runInBand` | Run unit tests (Jest) |
| `npm run test:e2e` | Run end-to-end tests against a real PostgreSQL instance (start `docker compose up -d db` first) |
| `npm run test:cov -- --runInBand` | Run unit tests with coverage |
| `npm run lint` / `npm run format` | Lint / format (both rewrite files) |

## API overview

All routes are prefixed with `/api`.

| Resource | Routes |
|---|---|
| Customers | `POST /customers`, `GET /customers`, `GET /customers/:id`, `PATCH /customers/:id`, `DELETE /customers/:id` (soft delete) |
| Products | `POST /products`, `GET /products`, `GET /products/:id`, `PATCH /products/:id`, `DELETE /products/:id` (soft delete) |
| Orders | `POST /orders` (atomic creation), `GET /orders`, `GET /orders/:id`, `PATCH /orders/:id/status` (lifecycle transition, including cancellation) |

Order status follows a strict transition table: `PENDING → CONFIRMED → SHIPPED → DELIVERED`, or `CANCELLED` from `PENDING`/`CONFIRMED`. Cancelling restores stock exactly once, even under concurrent requests.

## Project structure

```
src/
  customers/   # controller, service, DTOs, entity
  products/    # controller, service, DTOs, entity
  orders/      # controller, service, DTOs, entity, response mapper
```

## Stack

NestJS 11 · TypeORM · PostgreSQL · class-validator/class-transformer · Swagger (`@nestjs/swagger`) · Jest + Supertest

## Project status and internal docs

This project follows Spec-Driven Development. See `openspec/changes/archive/` for the full proposal, design, task breakdown, and verification evidence (44 tests, 27/27 spec scenarios), and `AGENTS.md` for repository-specific conventions and invariants (read this before making changes, especially if using an AI coding agent).
