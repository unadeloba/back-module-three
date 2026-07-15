# Proposal: Phoenix Orders Backend

## Intent

Deliver the PRD's local NestJS/PostgreSQL MVP as a stable, documented API for customer, product, and order operations. The PRD remains the baseline; this proposal records the approved order lifecycle, inventory, line-item, duplicate-product, and optional-description clarifications.

## Scope

### In Scope
- Complete and document `/api` customer and product CRUD with soft deactivation, unique email handling, numeric prices, stock rules, and optional product `description`.
- Create orders transactionally: merge duplicate product IDs by summed quantity before validation, lock/validate stock, deduct atomically, snapshot numeric `unitPrice`, expose numeric `subtotal`, and calculate `total`.
- Keep order lines immutable. Support strict `PENDING -> CONFIRMED -> SHIPPED -> DELIVERED` transitions through the API.
- Allow terminal `CANCELLED` only from `PENDING` or `CONFIRMED`; restore stock transactionally exactly once.
- Document all endpoints with Swagger and establish production-equivalent unit/E2E coverage under strict TDD.

### Out of Scope
- Authentication, authorization, physical deletion, line editing, migrations, functional CI/CD, production images, cloud, and Kubernetes.
- Frontend implementation and Jira administration.

## Capabilities

### New Capabilities
- `customer-management`: Active customer CRUD and unique-email contract.
- `product-management`: Active product CRUD, optional description, pricing, and inventory contract.
- `order-management`: Order creation, immutable lines, totals, inventory effects, reads, and lifecycle transitions.
- `api-contract`: `/api` validation, errors, numeric serialization, and Swagger documentation.

### Modified Capabilities
None; no baseline specs exist.

## Approach

Harden the existing modular API contract-first. Write failing focused tests before behavior, preserve pessimistic locking, and perform creation, cancellation, and restocking in transactions. Reject illegal or repeated cancellation transitions without changing inventory.

## Repository Responsibilities

| Area | Responsibility |
|---|---|
| `src/customers/`, `src/products/` | Master-data rules and API contracts |
| `src/orders/` | Shared order schema, lifecycle, totals, and atomic inventory |
| `src/main.ts`, `test/` | Swagger and production-equivalent verification |

## Dependencies

- PostgreSQL 15; TypeORM with current local `synchronize: true` policy.
- Shared frontend contract: `OrderItem.unitPrice`, `OrderItem.subtotal`, and the approved status names.

## Risks and Rollback

- **Risk:** concurrent cancellation or status updates could double-restock. Mitigate with transactional locking and concurrency tests.
- **Rollback:** revert contract/code changes together and reset the local synchronized database; do not retain orders created with an incompatible schema.

## Measurable Outcomes

- [ ] Unit and E2E tests prove duplicate merging, rollback on failure, concurrent stock safety, legal transitions, and exactly-once restocking.
- [ ] Swagger documents every endpoint and exposes the aligned order schema.
- [ ] Build, unit tests, and database-backed E2E tests pass.

## Unresolved Product Decisions

None blocking; local browser connectivity (Vite proxy versus backend CORS) remains a cross-repository design decision.
