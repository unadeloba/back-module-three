# Apply Progress: Phoenix Orders Backend

## Delivery Context

- Delivery strategy: chained PRs
- Chain strategy: stacked-to-main
- Current slice: lifecycle and cancellation, approved issue #5
- Branch/base: `fix/order-lifecycle-cancellation` from clean updated `main` after merged PR #17
- Review budget: 400 authored additions and deletions; final stacked-to-main slice contains 333 authored additions and deletions.

## Completed Tasks

- [x] 1.1 Shared `/api` setup, global validation, Swagger bootstrap, and production-equivalent E2E setup.
- [x] 1.2 Canonical order response DTOs/mappers, numeric totals, `SHIPPED`, and order Swagger responses.
- [x] 2.1 Customer CRUD validation, soft deletion, and duplicate-email conflict.
- [x] 2.2 Product CRUD validation, explicit response schema, numeric price/stock boundaries, and soft deletion.
- [x] 3.1 Atomic duplicate aggregation and locked creation.
- [x] 3.2 Creation rollback, concurrency, snapshots, and immutable lines.
- [x] 4.1 Locked strict lifecycle transition table with 409 no-mutation rejection.
- [x] 4.2 Exactly-once sorted-lock cancellation restocking with PostgreSQL concurrency proof.

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1.1 | `src/app.setup.spec.ts`, `test/app.e2e-spec.ts` | Unit, E2E | `npm test -- --runInBand app.controller.spec.ts` → exit 0, 1 suite/1 test passed; after resetting only this repository's `back-module-three_pgdata`, `npm run test:e2e` → exit 0, 1 suite/1 test passed | `npm test -- --runInBand app.setup.spec.ts` → failed: `Cannot find module './app.setup'`; `npm run test:e2e` → failed: `Cannot find module './../src/app.setup'` | `npm test -- --runInBand app.setup.spec.ts` → exit 0, 1 suite/3 tests passed; `npm run test:e2e` → exit 0, 1 suite/4 tests passed | Unit cases prove transformed numeric input and unknown-field rejection; E2E cases prove `/api`, malformed UUID and unknown-field 400 without mutation, numeric product price output, and Swagger route publication | Extracted `API_PREFIX` and `SWAGGER_PATH`; typed E2E response contracts for lint safety; focused and full tests stayed green |
| 1.2 | `src/orders/mappers/order-response.mapper.spec.ts`, `test/app.e2e-spec.ts` | Unit, E2E | `npm test -- --runInBand` → exit 0, 2 suites/4 tests; `npm run test:e2e` → exit 0, PostgreSQL `db` only, 1 suite/4 tests | `npm test -- --runInBand orders/mappers/order-response.mapper.spec.ts` → failed: `Cannot find module './order-response.mapper'` | Focused mapper → exit 0, 1 suite/2 tests; final full unit → exit 0, 3 suites/6 tests; E2E → exit 0, 1 suite/5 tests | Two differently priced line sets prove derived subtotals and order totals; second case proves `SHIPPED` and non-integer numeric money | Kept persistence column `order_items.price` while exposing `unitPrice`; isolated pure mapper and response DTOs; all final checks green |
| 2.1 | `src/customers/customers.service.spec.ts`, `test/app.e2e-spec.ts` | Unit, E2E | Customer unit exit 0, 1 suite/3 tests; E2E exit 0, PostgreSQL `db` only, 1 suite/6 tests | Service expected `ConflictException`, received `BadRequestException`; E2E expected 409, got 400; Swagger `CustomerResponseDto` schema was absent | Focused customer → exit 0, 1 suite/3 tests; E2E → exit 0, 1 suite/6 tests | Omitted phone, active CRUD, invalid email no-write, duplicate create/update 409, soft deletion, and documented response fields | Added minimal response DTO with explicit Swagger fields; formatted paths and focused tests stayed green |
| 2.2 | `src/products/dto/product-response.dto.spec.ts`, `src/products/products.service.spec.ts`, `test/app.e2e-spec.ts` | Unit, E2E | `npm test -- --runInBand` → exit 0, 4 suites/9 tests; `npm run test:e2e` → exit 0, PostgreSQL `db` only, 1 suite/6 tests | DTO unit → failed: `Cannot find module './product-response.dto'`; focused PostgreSQL E2E → failed: `ProductResponseDto` schema was undefined; request-schema E2E → failed because `CreateProductDto` properties were undefined; response-stock E2E → expected `integer`, received `number`; empty-name PATCH → expected 400, received 200; invalid-stock proof was added first and passed against existing DTO validation | Focused DTO → exit 0, 1 suite/1 test; focused PostgreSQL E2E → exit 0, 1 suite/1 test (6 skipped); focused products → exit 0, 2 suites/3 tests; request-schema, response-stock, empty-name, and invalid-stock follow-up E2E → exit 0, 1 suite/1 test (6 skipped) | Product E2E proves zero stock, omitted/supplied description, numeric price, invalid create/empty-name/negative-stock update no-write, soft deletion, response/error operations, discoverable request constraints, and integer response stock; service tests prove active CRUD/soft deactivation | Added only explicit response/request DTO metadata and controller Swagger decorators; replaced PATCH max-only validation with length 1..255; invalid-stock proof required no production change; formatted touched files and reran focused tests |
| 3.1 | `src/orders/orders.service.spec.ts` | Unit | `npm test -- --runInBand` → exit 0, 6 suites/12 tests | Focused service → failed: duplicates produced multiple lines; invalid quantities resolved; missing participants/insufficient stock returned 400 | Focused service → exit 0, 1 suite/7 tests | Duplicate sums, sorted locks, empty/zero/fractional quantities, missing/inactive participants, and aggregate shortage | Normalized before transaction; all focused tests stayed green |
| 3.2 | `test/app.e2e-spec.ts` | E2E | `npm run test:e2e` → exit 0, PostgreSQL `db`, 1 suite/7 tests | Focused E2E → failed: Swagger order-create 409 response was absent | Focused E2E → exit 0, 1 suite/1 test (7 skipped); full E2E → exit 0, 1 suite/8 tests | Insufficient-stock rollback, concurrent 201/409, non-negative stock, price snapshot, immutable lines | Added only the 409 Swagger category; existing mapper persistence/read behavior passed runtime proof |
| 4.1 | `src/orders/orders.service.spec.ts`, `test/app.e2e-spec.ts` | Unit, E2E | Focused service → exit 0, 1 suite/7 tests | Focused service RED → 10 failed/7 passed: update used unlocked repository lookup; E2E lifecycle scenario started RED on missing status-route 409 documentation | Focused service → exit 0, 1 suite/17 tests; focused lifecycle E2E → exit 0, 1 passed/8 skipped | Immediate progression, allowed PENDING/CONFIRMED cancellation, skips, reversals, SHIPPED cancellation, and terminal changes | Extracted transition-table predicate; locked status update and canonical reread stayed green |
| 4.2 | `src/orders/orders.service.spec.ts`, `test/app.e2e-spec.ts` | Unit, E2E | Focused service after 4.1 → exit 0, 1 suite/17 tests | Unit RED → expected restored stock 5, received 1; E2E RED → status-route 409 Swagger response undefined | Focused service → exit 0, 1 suite/18 tests; lifecycle E2E → exit 0, 1 passed/8 skipped | Canonical multi-line restock locks product IDs in sorted order; PostgreSQL concurrent requests yield exactly one 200 and one 409 with stock restored once | Extracted sorted `restoreStock`; final unit/E2E/build/quality checks stayed green |

Historical candidate evidence remains preserved for task 1.1 only. Task 1.2 was implemented independently from current main; no lifecycle, aggregation, locking, or restocking candidate hunks were restored.

## Work Unit Evidence

| Evidence | Exact result |
| --- | --- |
| Focused tests | `npm test -- --runInBand app.setup.spec.ts` → exit 0, 1 suite/3 tests passed |
| Runtime harness | `npm run test:e2e` → exit 0, PostgreSQL `db` only, 1 suite/4 tests passed: `/api`, malformed UUID and unknown field rejection without mutation, numeric product price output, Swagger `/api` paths |
| Full unit and build | `npm test -- --runInBand` → exit 0, 2 suites/4 tests passed; `npm run build` → exit 0 |
| Focused quality | `npx prettier --check src/main.ts src/app.setup.ts src/app.setup.spec.ts test/app.e2e-spec.ts` → exit 0; `npx eslint src/main.ts src/app.setup.ts src/app.setup.spec.ts test/app.e2e-spec.ts` → exit 0 |
| Rollback boundary | Revert `src/app.setup.ts`, `src/main.ts`, `package.json`, `package-lock.json`, `src/app.setup.spec.ts`, and the task-1.1 portions of `test/app.e2e-spec.ts`; this removes shared `/api`, validation, and Swagger setup without changing task-1.2 order schemas or later product/order behavior. |

### Task 1.2 Work Unit Evidence

| Evidence | Exact result |
| --- | --- |
| Focused tests | `npm test -- --runInBand orders/mappers/order-response.mapper.spec.ts` → exit 0, 1 suite/2 tests passed |
| Runtime harness | `docker compose up -d db && npm run test:e2e; docker compose stop db` → exit 0, PostgreSQL `db` only, 1 suite/5 tests passed; create response and Swagger schemas prove numeric `unitPrice`, `subtotal`, `total`, and `SHIPPED` |
| Full unit and build | `npm test -- --runInBand` → exit 0, 3 suites/6 tests passed; `npm run build` → exit 0 |
| Focused quality and diff | `npx prettier --check` and `npx eslint` on task-1.2 formatted TypeScript paths → exit 0; `git diff --check` → exit 0 |
| Rollback boundary | Revert `src/orders/dto/order-response.dto.ts`, `src/orders/mappers/`, the task-1.2 changes in order entities/controller/service/status DTO, the task-1.2 E2E case, and this task checkbox/progress entry. This removes only canonical response mapping and Swagger schemas while retaining task-1.1 bootstrap behavior. |

### Task 2.1 Work Unit Evidence

| Evidence | Exact result |
| --- | --- |
| Focused tests | `npm test -- --runInBand customers/customers.service.spec.ts` → exit 0, 1 suite/3 tests passed |
| Runtime harness | `docker compose up -d db && npm run test:e2e; docker compose stop db` → exit 0, PostgreSQL `db` only, 1 suite/6 tests passed; customer CRUD, omitted phone, invalid no-write, duplicate 409, soft deletion, and the `CustomerResponseDto` Swagger schema passed |
| Full unit and build | `npm test -- --runInBand` → exit 0, 4 suites/9 tests passed; `npm run build` → exit 0 |
| Focused quality and diff | `npx prettier --check` and `npx eslint` on customer paths and `test/app.e2e-spec.ts` → exit 0; `git diff --check` → exit 0 |
| Rollback boundary | Revert `src/customers/dto/customer-response.dto.ts`, customer controller/service/spec, task-2.1 E2E assertions, and this task checkbox/progress entry; this removes the 409 customer and documented response contract while retaining tasks 1.1/1.2 and all product work in the preserved snapshot. |

### Task 2.2 Work Unit Evidence

| Evidence | Exact result |
| --- | --- |
| Focused tests | `npm test -- --runInBand products` → exit 0, 2 suites/3 tests passed after refactoring; response-DTO RED was `Cannot find module './product-response.dto'`. |
| Runtime harness | `docker compose up -d db && npm run test:e2e -- -t "manages products"; docker compose stop db` → RED failed because `ProductResponseDto` schema was undefined; GREEN exit 0, 1 suite/1 passed (6 skipped). Full PostgreSQL E2E → exit 0, 1 suite/7 tests passed; `db` stopped after each run. |
| Full unit and build | `npm test -- --runInBand` → exit 0, 6 suites/12 tests passed; `npm run build` → exit 0. |
| Focused quality and diff | `npx prettier --check` and `npx eslint` on task-2.2 TypeScript paths → exit 0; `git diff --check` → exit 0. |
| Rollback boundary | Revert `src/products/dto/product-response.dto.ts`, its focused tests, `src/products/products.controller.ts`, task-2.2 product E2E assertions, and this task checkbox/progress entry. This removes only product response documentation/coverage while retaining the pre-existing product service behavior and tasks 1.1/1.2/2.1. |

### Tasks 3.1–3.2 Work Unit Evidence

| Evidence | Exact result |
| --- | --- |
| Focused tests | `npm test -- --runInBand orders/orders.service.spec.ts` → exit 0, 1 suite/7 tests; `npm run test:e2e -- -t "creates immutable price snapshots"` → exit 0, 1 passed/7 skipped. |
| Runtime harness | `docker compose up -d db && npm run test:e2e; docker compose stop db` → exit 0, 1 suite/8 tests; PostgreSQL proves rollback, concurrent oversell prevention, immutable creation-time price snapshots, and no line route. |
| Full unit, build, quality | `npm test -- --runInBand` → exit 0, 7 suites/19 tests; `npm run build`, focused Prettier/ESLint, and `git diff --check` → exit 0. |
| Rollback boundary | Revert `src/orders/orders.service.ts`, `src/orders/orders.controller.ts`, `src/orders/orders.service.spec.ts`, task-3 E2E assertions, and these task/progress entries; this removes only creation normalization/locking categories and proof. |

### Task 4.1 Work Unit Evidence

| Evidence | Exact result |
| --- | --- |
| Focused tests | `npm test -- --runInBand orders/orders.service.spec.ts` → exit 0, 1 suite/18 tests passed; safety-net baseline before edits was 1 suite/7 tests passed. |
| Runtime harness | `docker compose up -d db && npm run test:e2e -- -t "enforces lifecycle transitions"` → exit 0, 1 passed/8 skipped; PostgreSQL proves 409 skips and SHIPPED cancellation preserve status/stock, then proves immediate delivery transitions. |
| Rollback boundary | Revert the transition-table and locked-status portions of `src/orders/orders.service.ts`, task-4.1 unit assertions, task-4.1 E2E assertions, and this task/progress entry; order creation and canonical responses remain intact. |

### Task 4.2 Work Unit Evidence

| Evidence | Exact result |
| --- | --- |
| Focused tests | `npm test -- --runInBand orders/orders.service.spec.ts` → exit 0, 1 suite/18 tests passed; RED expected restored product stock 5 and received 1. |
| Runtime harness | `docker compose up -d db && npm run test:e2e -- -t "enforces lifecycle transitions"` → exit 0, 1 passed/8 skipped; two concurrent `CANCELLED` PATCH requests returned sorted `[200, 409]`, and PostgreSQL stock was exactly 7 and 6 after one restoration. Full `npm run test:e2e` → exit 0, 1 suite/9 tests passed. |
| Full checks and quality | `npm test -- --runInBand` → exit 0, 7 suites/30 tests; `npm run build` → exit 0; focused Prettier and ESLint plus `git diff --check` → exit 0; `docker compose stop db` stopped PostgreSQL. |
| Rollback boundary | Revert `src/orders/orders.service.ts`, `src/orders/orders.controller.ts`, lifecycle test additions in `src/orders/orders.service.spec.ts` and `test/app.e2e-spec.ts`, plus task-4.2/progress entries; this removes only transitions/cancellation restocking and its HTTP documentation. |

## Remaining Tasks

None.

## Deviations

None — tasks 4.1–4.2 match the locked transition and sorted-restock design without changing creation semantics.

## Status

8/8 tasks complete. Ready for native SDD verify.
