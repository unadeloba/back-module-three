# Design: Phoenix Orders Backend

## Technical Approach

Harden the existing NestJS feature modules behind one production-equivalent `/api` contract. Keep master-data rules in their services; make order creation and status changes transactional application-service operations; return mapped response DTOs rather than persistence entities. Every behavior starts RED in Jest, becomes GREEN with the smallest change, then is refactored without changing the contract.

## Architecture Decisions

| Option                                            | Tradeoff                                            | Decision                                                                                                       |
| ------------------------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Expose entities vs response DTOs                  | Entities are quicker but leak `price` and relations | Add response DTOs/mappers; public lines use `unitPrice` and computed `subtotal`                                |
| Persist subtotal vs derive it                     | Persistence duplicates data                         | Keep DB column `order_items.price` mapped as `unitPrice`; derive subtotal; persist order total                 |
| Optimistic vs pessimistic concurrency             | Optimistic needs version/retry semantics            | Keep PostgreSQL `pessimistic_write`; lock IDs in sorted order                                                  |
| Status condition only vs locked order transaction | A condition alone can double-restock                | Lock the order, validate one transition, lock affected products, restock, and update status in one transaction |
| Per-test bootstrap vs shared setup                | Duplication can drift from runtime                  | Extract `configureApp()` for `/api`, validation, and Swagger; reuse in `main.ts` and E2E                       |

## Data Flow and Transaction Boundaries

    HTTP DTO -> Controller -> Service transaction -> locked rows -> entities
       ^                                                |
       +--------------- response mapper <---------------+

Creation normalizes duplicate `productId` values before mutation, sorts them, then inside one transaction validates the active customer, locks each active product, validates aggregate stock, deducts stock, snapshots `unitPrice`, and saves order/lines. Any failure rolls back all writes.

Status update locks the order row and loads immutable lines. A transition table permits only `PENDING→CONFIRMED→SHIPPED→DELIVERED`, plus cancellation from `PENDING|CONFIRMED`. Cancellation locks products in sorted order, restores each canonical line once, then writes `CANCELLED`. A concurrent/repeated request resumes after the lock, observes `CANCELLED`, returns conflict, and performs no inventory write.

## Files and Modules

| File                                               | Action        | Impact                                                     |
| -------------------------------------------------- | ------------- | ---------------------------------------------------------- |
| `src/app.setup.ts`, `src/main.ts`                  | Create/modify | Shared runtime setup and Swagger bootstrap                 |
| `src/customers/*`, `src/products/*`                | Modify        | DTO validation, 409 email conflict, Swagger, focused tests |
| `src/orders/orders.service.ts`                     | Modify        | Normalization, transactions, locks, transition enforcement |
| `src/orders/entities/{order,order-item}.entity.ts` | Modify        | Add `SHIPPED`; map `unitPrice` to existing `price` column  |
| `src/orders/dto/*`, `src/orders/mappers/*`         | Create/modify | Request validation and canonical response mapping          |
| `src/**/*.spec.ts`, `test/app.e2e-spec.ts`         | Create/modify | Unit, HTTP, rollback, and concurrency proof                |
| `package*.json`                                    | Modify        | Add locked `@nestjs/swagger` dependency                    |

## Shared API Contract

All routes are under `/api`. Creates return 201; reads/status updates 200; soft deletion 204. Malformed UUIDs/payloads and invalid order participants return 400; missing active detail resources return 404; duplicate email, insufficient stock, and illegal/stale transitions return 409. Errors retain Nest's JSON envelope; frontend behavior depends on status/category, not message prose.

Canonical names are `Customer`, `Product`, `Order`, `OrderItem`, `customerId`, `productId`, `quantity`, `unitPrice`, `subtotal`, `total`, `orderDate`, and statuses `PENDING|CONFIRMED|SHIPPED|DELIVERED|CANCELLED`. No line mutation endpoint exists. Swagger documents these schemas and errors.

## Testing Strategy

| RED seam                          | GREEN proof                                                                          |
| --------------------------------- | ------------------------------------------------------------------------------------ |
| DTO/mapper and service unit tests | Validation, numeric mapping, duplicate aggregation, transition table                 |
| Transaction-manager tests         | Rollback and exactly-one restock call                                                |
| PostgreSQL E2E                    | Runtime prefix/pipe, CRUD statuses, price snapshot, concurrent oversell/cancellation |

Run focused Jest RED first, then `npm test -- --runInBand`, `npm run build`, and database-backed `npm run test:e2e`.

## Threat Matrix

HTTP routing triggers review, but the reference matrix's executable/VCS boundaries are absent.

| Boundary                 | Applicability                     | Response / RED test |
| ------------------------ | --------------------------------- | ------------------- |
| Documentation-like paths | N/A — no execution classification | None                |
| Git repository selection | N/A — no Git automation           | None                |
| Commit state             | N/A — no commit automation        | None                |
| Push state               | N/A — no push automation          | None                |
| PR commands              | N/A — no PR automation            | None                |

## Migration, Rollout, and Delivery

No migration workflow is introduced. Existing `order_items.price` data remains compatible through explicit column mapping; adding the enum value relies on local `synchronize: true`. Roll out backend before frontend and reset the local database if enum/schema synchronization or rollback is incompatible. Rollback code and local DB together.

The forecast exceeds 400 authored lines. Candidate review slices are contract/bootstrap, master data, atomic creation, then lifecycle/restocking, each with tests and rollback. Because strategy is ask-always, chained-PR approval is required before tasks/apply; this does not block design.

## Open Questions

None blocking.
