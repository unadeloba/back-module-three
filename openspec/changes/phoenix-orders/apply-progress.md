# Apply Progress: Phoenix Orders Backend

## Delivery Context

- Delivery strategy: chained PRs
- Chain strategy: stacked-to-main
- Current slice: customer contract, approved issue #12
- Branch/base: `feat/customer-contract` from clean updated `main` after merged PR #11
- Review budget: 400 authored additions and deletions; generated `package-lock.json` is retained in the snapshot and excluded from reviewer burden.

## Completed Tasks

- [x] 1.1 Shared `/api` setup, global validation, Swagger bootstrap, and production-equivalent E2E setup.
- [x] 1.2 Canonical order response DTOs/mappers, numeric totals, `SHIPPED`, and order Swagger responses.
- [x] 2.1 Customer CRUD validation, soft deletion, and duplicate-email conflict.

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1.1 | `src/app.setup.spec.ts`, `test/app.e2e-spec.ts` | Unit, E2E | `npm test -- --runInBand app.controller.spec.ts` → exit 0, 1 suite/1 test passed; after resetting only this repository's `back-module-three_pgdata`, `npm run test:e2e` → exit 0, 1 suite/1 test passed | `npm test -- --runInBand app.setup.spec.ts` → failed: `Cannot find module './app.setup'`; `npm run test:e2e` → failed: `Cannot find module './../src/app.setup'` | `npm test -- --runInBand app.setup.spec.ts` → exit 0, 1 suite/3 tests passed; `npm run test:e2e` → exit 0, 1 suite/4 tests passed | Unit cases prove transformed numeric input and unknown-field rejection; E2E cases prove `/api`, malformed UUID and unknown-field 400 without mutation, numeric product price output, and Swagger route publication | Extracted `API_PREFIX` and `SWAGGER_PATH`; typed E2E response contracts for lint safety; focused and full tests stayed green |
| 1.2 | `src/orders/mappers/order-response.mapper.spec.ts`, `test/app.e2e-spec.ts` | Unit, E2E | `npm test -- --runInBand` → exit 0, 2 suites/4 tests; `npm run test:e2e` → exit 0, PostgreSQL `db` only, 1 suite/4 tests | `npm test -- --runInBand orders/mappers/order-response.mapper.spec.ts` → failed: `Cannot find module './order-response.mapper'` | Focused mapper → exit 0, 1 suite/2 tests; final full unit → exit 0, 3 suites/6 tests; E2E → exit 0, 1 suite/5 tests | Two differently priced line sets prove derived subtotals and order totals; second case proves `SHIPPED` and non-integer numeric money | Kept persistence column `order_items.price` while exposing `unitPrice`; isolated pure mapper and response DTOs; all final checks green |
| 2.1 | `src/customers/customers.service.spec.ts`, `test/app.e2e-spec.ts` | Unit, E2E | Customer unit exit 0, 1 suite/3 tests; E2E exit 0, PostgreSQL `db` only, 1 suite/6 tests | Service expected `ConflictException`, received `BadRequestException`; E2E expected 409, got 400; Swagger `CustomerResponseDto` schema was absent | Focused customer → exit 0, 1 suite/3 tests; E2E → exit 0, 1 suite/6 tests | Omitted phone, active CRUD, invalid email no-write, duplicate create/update 409, soft deletion, and documented response fields | Added minimal response DTO with explicit Swagger fields; formatted paths and focused tests stayed green |

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

## Remaining Tasks

- [ ] 2.2 Product CRUD validation, numeric price, stock boundaries, and soft deletion.
- [ ] 3.1 Atomic duplicate aggregation and locked creation.
- [ ] 3.2 Creation rollback, concurrency, snapshots, and immutable lines.
- [ ] 4.1 Lifecycle transition table.
- [ ] 4.2 Exactly-once cancellation restocking and final verification.

## Deviations

None — task 1.1 bootstrap and task 1.2 response mapping remain intact; task 2.1 preserves active-record semantics.

## Status

3/8 tasks complete. Ready for the next stacked slice after this slice is independently reviewed and merged.
