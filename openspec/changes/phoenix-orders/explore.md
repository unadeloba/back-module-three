# Phoenix Orders — Backend Exploration

The backend has the three required domain modules, but the MVP contract is only partially verifiable. The first delivery should harden the existing API contract test-first before adding frontend-dependent behavior.

## PRD Contract

| Area | Contract |
|---|---|
| Business goal | Local MVP for internal management of customers, products, and orders; establish an evolvable modular monolith. |
| Actors | Internal operational user managing catalog/customers and creating or updating orders. Authentication and roles are explicitly out of scope. |
| Core workflows | Maintain active customers; maintain active products and stock; create an order for an active customer with one or more active products; calculate totals; view orders; change order status. |
| Acceptance criteria | UUID records, soft deactivation for customers/products, unique customer email, valid product price/stock, atomic order creation, sufficient stock, price snapshot, numeric decimal API values, `/api` routes, DTO validation, Swagger documentation, PostgreSQL in Docker. |
| Constraints | NestJS/TypeScript/TypeORM/PostgreSQL; local-only; `synchronize: true`; `npm ci` and locked Node range; strict backend TDD; reviews capped at 400 changed lines and chained-PR choice must be asked. |
| Non-goals | Auth/roles, production images, CI/CD, cloud/Kubernetes, and a migration workflow. |

## Current State

`AppModule` wires `customers`, `products`, and `orders`; `main.ts` applies `/api` plus whitelist/transform/forbid validation. PostgreSQL 15 and the watch-mode API are defined in Docker Compose. Customer and product CRUD endpoints implement active-only reads and soft deactivation. Product DTOs enforce positive price and non-negative integer stock. Order creation uses a TypeORM transaction, active-record checks, pessimistic product locks, stock decrements, price snapshots, and a calculated total.

Strict TDD is configured and previously verified: Jest unit tests and `npm run build` pass; E2E requires PostgreSQL. The checked-in tests only cover the starter hello endpoint; the E2E fixture does not configure the production `/api` prefix or validation pipe.

## Contract Contrast

| Status | Evidence / gap |
|---|---|
| Implemented | Core customer/product routes; soft deactivation; product transport validation; order list/detail/status routes; transactional order creation and numeric transformers. |
| Inconsistent | No `@nestjs/swagger` dependency or Swagger bootstrap/decorators; no documented API. Customer email conflicts return `400`, not the expected conflict-oriented `409`. `OrderItem` persists `price`, while the PRD contract names `unitPrice` and requires `subtotal`; subtotal is neither stored nor returned. README still documents the Nest starter and says `npm install`, not the reproducible PRD path. `.env.example` and workflow directory are absent. |
| Missing business rules | Status changes accept every enum value from every state; cancellation neither restores stock nor documents why. No explicit duplicate-product-item policy. |
| Unverifiable | No focused service/controller tests for domain rules, validation, errors, stock rollback, or concurrency; no API E2E tests; no evidence that the Docker path or order contract works end-to-end. |

## Affected Areas

- `src/main.ts` — API prefix, validation, and Swagger bootstrap.
- `src/{customers,products,orders}/` — endpoint contracts, DTO/entity alignment, and business-rule tests.
- `test/app.e2e-spec.ts` — must mirror runtime prefix and validation before API behavior is trusted.
- `package.json`, `README.md`, `.env.example`, `.github/workflows/` — required reproducibility and sprint-review documentation/structure gaps.

## Capability Boundaries and Dependency Order

1. **Executable API contract:** test harness that configures production-equivalent app behavior; Swagger dependency/bootstrap; endpoint documentation.
2. **Master data:** customer and product behavior, validation, active-record semantics, and error mappings.
3. **Order transaction:** item response/persistence contract, totals, stock atomicity, and explicit lifecycle rules.
4. **Client integration:** stable documented `/api` contract consumed by the separate frontend repository.
5. **Operational polish:** PRD-aligned README, environment example, and empty workflow structure only; do not introduce CI, migrations, auth, or production deployment.

## Approaches

1. **Contract-hardening slice first** — add focused failing tests, then repair observable API/documentation mismatches before more feature work.
   - Pros: stabilizes the frontend dependency; preserves the existing transactional core; fits strict TDD and review budget.
   - Cons: requires resolving lifecycle and item-shape decisions.
   - Effort: Medium.

2. **Complete every backend gap before integration** — implement lifecycle, docs, test coverage, and documentation in one delivery.
   - Pros: more complete backend handoff.
   - Cons: likely exceeds 400 lines and delays a usable vertical slice; must be chained after an interactive decision.
   - Effort: High.

## Recommendation

Use approach 1. The smallest coherent backend slice is: production-equivalent API E2E setup plus service tests; documented `GET /api/customers`, `GET /api/products`, and `POST /api/orders`; a confirmed order-item response shape; and the existing atomic create-order path proven for valid, inactive, and insufficient-stock cases. This is a backend contract slice, not a new product capability.

## Risks and Decisions Required

- Decide whether stock is reserved at creation (current behavior) or confirmation; define cancellation/restock and legal status transitions.
- Decide the public item schema: preserve PRD `unitPrice` and expose/persist `subtotal`, or revise the PRD to `price` and computed subtotal.
- Decide whether product `description` is required (PRD field table) or optional (current DTO/entity).
- Decide whether duplicate product IDs are merged, rejected, or retained as separate order lines.
- Decide the minimum Swagger target: PRD requires at least three documented operations, while the ideal is all endpoints.

## Ready for Proposal

**No.** The proposal clarification round must resolve the order lifecycle and public item contract first. Once those are decided, a test-first backend contract slice is ready; ask whether its forecast warrants chained PRs before planning implementation.
