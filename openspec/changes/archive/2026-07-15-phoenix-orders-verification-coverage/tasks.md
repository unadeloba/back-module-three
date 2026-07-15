# Tasks: Phoenix Orders Verification Coverage

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 330–390 authored lines |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | One coverage child; split before apply if over 400 |
| Delivery strategy | feature-branch-chain |
| Chain strategy | feature-branch-chain |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: feature-branch-chain
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | Coverage evidence | child → `fix/order-lifecycle-cancellation` | `npm run test:e2e` | `docker compose up -d db && npm run test:e2e` | E2E assertions and DTO metadata |

Branch: child from/target `fix/order-lifecycle-cancellation`; its diff contains only authored coverage files. Tasks 1–4 depend on lifecycle endpoints; task 5 depends on merge. No behavior, routes, migrations, dependencies, snapshots, truncation, or unrelated refactors.

## Phase 1: Runtime Evidence

- [x] 1.1 `test/app.e2e-spec.ts`: **RED** isolated `randomUUID()` create/list/detail/status matrix for numeric `total`/`unitPrice`/`subtotal` and exact five statuses; `npm run test:e2e -- -t "order response"` fails. **GREEN** assertions/fixtures only through `/api`, with delivered and cancelled orders. **REFACTOR** local typed helper; rerun command.

## Phase 2: Semantic Contract Evidence

- [x] 2.1 `test/app.e2e-spec.ts`: **RED** typed 14-operation `/api/docs-json` matrix for verb/path, body, success, relevant 400/404/409, required/validator constraints, exact enums; `npm run test:e2e -- -t "Swagger matrix"` fails by row. **GREEN** only RED-proven metadata in `src/customers/dto/{create-customer,update-customer}.dto.ts` and `src/orders/dto/{create-order,update-order-status}.dto.ts`. **REFACTOR** local `$ref`/array/exact-set helpers; rerun plus focused Prettier/ESLint.

## Phase 3: Persistence Safety Evidence

- [x] 3.1 `test/app.e2e-spec.ts`: **RED** isolated customer PATCH→detail→active-list-by-ID persistence test; `npm run test:e2e -- -t "customer update"` fails. **GREEN** existing `/api/customers` behavior only. **REFACTOR** fixture helper; rerun without global list/order assumptions.
- [x] 3.2 `test/app.e2e-spec.ts`: **RED** isolated product PATCH `{ stock: 1.5 }` → 400 → detail unchanged; `npm run test:e2e -- -t "fractional stock"` fails. **GREEN** existing validation only. **REFACTOR** local assertion; rerun without truncation.

## Phase 4: Child Integration and Receipt

- [x] 4.1 Check child is ≤400 authored lines with no inherited-parent diff; if over, stop and split before apply. Rollback: revert only this child from `fix/order-lifecycle-cancellation`.
- [x] 4.2 Merge to parent; fresh exact-parent receipt runs `npm test -- --runInBand`, `npm run build`, `npm run test:cov -- --runInBand`, `docker compose up -d db && npm run test:e2e && docker compose stop db`, focused format/lint, and `git diff --check`; record 27/27, zero blockers, new hashes/revision in `verify-report.md`.
