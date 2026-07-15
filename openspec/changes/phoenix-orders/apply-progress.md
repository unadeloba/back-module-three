# Apply Progress: Phoenix Orders Backend

## Delivery Context

- Delivery strategy: chained PRs
- Chain strategy: stacked-to-main
- Current slice: API bootstrap, approved issue #1
- Branch/base: `feat/api-contract-bootstrap` from updated `main` after merged PR #9
- Review budget: 400 authored additions and deletions; generated `package-lock.json` is retained in the snapshot and excluded from reviewer burden.

## Completed Tasks

- [x] 1.1 Shared `/api` setup, global validation, Swagger bootstrap, and production-equivalent E2E setup.

Task 1.2 remains pending and is not represented by this current-main slice.

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1.1 | `src/app.setup.spec.ts`, `test/app.e2e-spec.ts` | Unit, E2E | `npm test -- --runInBand app.controller.spec.ts` → exit 0, 1 suite/1 test passed; after resetting only this repository's `back-module-three_pgdata`, `npm run test:e2e` → exit 0, 1 suite/1 test passed | `npm test -- --runInBand app.setup.spec.ts` → failed: `Cannot find module './app.setup'`; `npm run test:e2e` → failed: `Cannot find module './../src/app.setup'` | `npm test -- --runInBand app.setup.spec.ts` → exit 0, 1 suite/3 tests passed; `npm run test:e2e` → exit 0, 1 suite/4 tests passed | Unit cases prove transformed numeric input and unknown-field rejection; E2E cases prove `/api`, malformed UUID and unknown-field 400 without mutation, numeric product price output, and Swagger route publication | Extracted `API_PREFIX` and `SWAGGER_PATH`; typed E2E response contracts for lint safety; focused and full tests stayed green |

Historical candidate evidence preserved truthfully: the original candidate recorded the same task-1.1 RED failures for missing `app.setup`, then GREEN for three focused unit tests and production-equivalent E2E. Its task-1.2 evidence is deliberately excluded because task 1.2 is pending on current main.

## Work Unit Evidence

| Evidence | Exact result |
| --- | --- |
| Focused tests | `npm test -- --runInBand app.setup.spec.ts` → exit 0, 1 suite/3 tests passed |
| Runtime harness | `npm run test:e2e` → exit 0, PostgreSQL `db` only, 1 suite/4 tests passed: `/api`, malformed UUID and unknown field rejection without mutation, numeric product price output, Swagger `/api` paths |
| Full unit and build | `npm test -- --runInBand` → exit 0, 2 suites/4 tests passed; `npm run build` → exit 0 |
| Focused quality | `npx prettier --check src/main.ts src/app.setup.ts src/app.setup.spec.ts test/app.e2e-spec.ts` → exit 0; `npx eslint src/main.ts src/app.setup.ts src/app.setup.spec.ts test/app.e2e-spec.ts` → exit 0 |
| Rollback boundary | Revert `src/app.setup.ts`, `src/main.ts`, `package.json`, `package-lock.json`, `src/app.setup.spec.ts`, and the task-1.1 portions of `test/app.e2e-spec.ts`; this removes shared `/api`, validation, and Swagger setup without changing task-1.2 order schemas or later product/order behavior. |

## Remaining Tasks

- [ ] 1.2 Canonical order response DTOs/mappers, numeric order totals, and `SHIPPED`.
- [ ] 2.1 Customer CRUD validation, soft deletion, and duplicate-email conflict.
- [ ] 2.2 Product CRUD validation, numeric price, stock boundaries, and soft deletion.
- [ ] 3.1 Atomic duplicate aggregation and locked creation.
- [ ] 3.2 Creation rollback, concurrency, snapshots, and immutable lines.
- [ ] 4.1 Lifecycle transition table.
- [ ] 4.2 Exactly-once cancellation restocking and final verification.

## Deviations

None — task 1.1 implements only shared bootstrap behavior. Swagger endpoint schemas and order response contracts are deferred to their assigned tasks.

## Status

1/8 tasks complete. Ready for the next stacked slice after this slice is independently reviewed and merged.
