# Tasks: Phoenix Orders Backend

## Review Workload Forecast

| Field                   | Value                                                                       |
| ----------------------- | --------------------------------------------------------------------------- |
| Estimated changed lines | ~900–1,150 total                                                            |
| 400-line budget risk    | High                                                                        |
| Chained PRs recommended | Yes                                                                         |
| Suggested split         | PR 1 contract/bootstrap → PR 2 master data → PR 3 creation → PR 4 lifecycle |
| Delivery strategy       | ask-on-risk                                                                 |
| Chain strategy          | stacked-to-main                                                             |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal / estimate                       | Likely PR | Focused test command                             | Runtime harness                     | Rollback boundary                      |
| ---- | ------------------------------------- | --------- | ------------------------------------------------ | ----------------------------------- | -------------------------------------- |
| 1    | Shared API setup, DTOs, Swagger; ~210 | PR 1      | `npm test -- --runInBand app.setup.spec.ts`      | `npm run test:e2e` `/api` + Swagger | `app.setup`, DTOs, Swagger deps        |
| 2    | Customer/product contracts; ~220      | PR 2      | `npm test -- --runInBand customers products`     | E2E CRUD/400/404/409                | master-data modules/tests              |
| 3    | Atomic canonical creation; ~300       | PR 3      | `npm test -- --runInBand orders.service.spec.ts` | PostgreSQL oversell/rollback E2E    | creation mapper/service/entity changes |
| 4    | Lifecycle/restocking; ~260            | PR 4      | `npm test -- --runInBand orders.service.spec.ts` | PostgreSQL concurrent-cancel E2E    | transition/restock behavior/tests      |

**Cross-repository dependency:** publish the Swagger-verified `/api` schemas, numeric fields, statuses, and 400/404/409 categories before frontend transport work; backend deploys first.

## Phase 1: Contract and Bootstrap

- [x] 1.1 **RED → GREEN → REFACTOR:** add `src/app.setup.spec.ts`/`test/app.e2e-spec.ts` for `/api`, whitelist/UUID 400-without-mutation, numeric output and Swagger route discovery; extract `src/app.setup.ts`, update `src/main.ts`, and add the Swagger dependency/bootstrap. Verify focused Jest, E2E, build.
- [ ] 1.2 **RED → GREEN → REFACTOR:** add DTO/mapper tests for canonical `unitPrice`, `subtotal`, `total`, `SHIPPED`; create `src/orders/mappers/*` and response DTOs, update order entities/controllers and their Swagger decorators. Verify `npm test -- --runInBand orders`.

## Phase 2: Master Data

- [ ] 2.1 **RED → GREEN → REFACTOR:** test `src/customers` CRUD, omitted phone, soft deletion, invalid payload no-write, and duplicate create/update as 409; update DTO/service/controller/Swagger. Verify focused customers Jest and E2E.
- [ ] 2.2 **RED → GREEN → REFACTOR:** test `src/products` CRUD, optional description, numeric price, zero stock, invalid price/stock no-write, and soft deletion; update DTO/service/controller/Swagger. Verify focused products Jest and E2E.

## Phase 3: Atomic Creation

- [ ] 3.1 **RED → GREEN → REFACTOR:** add `src/orders/orders.service.spec.ts` for duplicate aggregation, inactive/missing participants and invalid quantities with no mutation; implement sorted locked transaction in `orders.service.ts`. Verify focused Jest.
- [ ] 3.2 **RED → GREEN → REFACTOR:** add transaction/E2E tests for insufficient-stock rollback, concurrent oversell, price snapshots and immutable canonical lines; implement mapper persistence/reads. Verify PostgreSQL `npm run test:e2e`.

## Phase 4: Lifecycle and Verification

- [ ] 4.1 **RED → GREEN → REFACTOR:** test allowed progression, rejected skip/reversal/terminal status without stock change, and cancel only from pending/confirmed; implement locked transition table in `orders.service.ts`. Verify focused Jest.
- [ ] 4.2 **RED → GREEN → REFACTOR:** test repeated/concurrent cancellation restores each line exactly once; lock order/products and transactionally restock. Verify PostgreSQL E2E, `npm test -- --runInBand`, `npm run build`.
