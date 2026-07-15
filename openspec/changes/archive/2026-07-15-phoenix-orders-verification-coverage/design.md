# Design: Phoenix Orders Verification Coverage

## Technical Approach

Add four named PostgreSQL/Supertest proofs at the existing production-equivalent seam in `test/app.e2e-spec.ts`. Reuse `configureApp()` and `configureSwagger()`; exercise public HTTP and `/api/docs-json`, not services or repositories. Begin with failing assertions and change production files only when generated OpenAPI lacks metadata already enforced by validation. Preserve order transactions, locking, active-record filters, response mapping, and all runtime behavior.

## Architecture Decisions

| Option | Tradeoff | Decision |
|---|---|---|
| HTTP E2E vs unit proof | E2E needs PostgreSQL but proves serialization, validation, persistence, and generated docs together | Use E2E for all four gaps |
| OpenAPI snapshot vs semantic assertions | Snapshots are broad and brittle | Use typed tables/helpers that assert path, verb, schema reference, statuses, constraints, required fields, and exact enums only |
| Clean DB vs isolated fixtures | Truncation conflicts with FK/concurrency tests | Use `randomUUID()` fixture keys, retain returned IDs, locate list records by ID, and never assume global counts/order |
| Production edits upfront vs evidence-gated metadata | Upfront edits may alter behavior unnecessarily | Permit only minimal `@ApiProperty`/`@ApiPropertyOptional` annotations after a RED generated-document assertion |

## Data Flow

    isolated fixture -> /api HTTP -> controller/service -> PostgreSQL
           |                                      |
           +<- response/list/detail/status -------+
           +-> /api/docs-json -> semantic helpers

## File Changes

| File | Action | Description |
|---|---|---|
| `test/app.e2e-spec.ts` | Modify | Add four named cases plus local typed Swagger assertion helpers |
| `src/customers/dto/create-customer.dto.ts` | Conditional modify | Document required/optional fields, email format, and lengths |
| `src/customers/dto/update-customer.dto.ts` | Conditional modify | Document optional update fields and constraints |
| `src/orders/dto/create-order.dto.ts` | Conditional modify | Document UUIDs, nested item array, `minItems`, integer quantity, and minimum |
| `src/orders/dto/update-order-status.dto.ts` | Conditional modify | Document the exact `OrderStatus` enum |

No controller, service, entity, mapper, database, or original `phoenix-orders` artifact changes are planned.

## Interfaces / Contracts

Keep helpers local to the E2E file: `expectOperation(document, expectation)` resolves direct `$ref` and array-item `$ref`; `expectSchemaProperties(schema, properties)` uses partial semantic matching; `expectExactSet(actual, expected)` compares sorted unique values. Do not assert descriptions, property order, generated operation IDs, or the whole document.

The Swagger matrix covers all 14 customer/product/order operations. Each row declares request schema when present, success status/schema (including arrays and 204), and relevant errors: validation/UUID `400`, missing/inactive participant or resource `404`, and duplicate email, stock, or transition `409`. DTO assertions cover required sets and validator-backed type/format/length/minimum/min-items/nested-item constraints. Response DTOs and `OrderStatus` must expose exactly the five declared statuses.

## Testing Strategy

| Gap | Deterministic proof |
|---|---|
| Order serialization/statuses | Create fixtures and assert numeric `total`, `unitPrice`, `subtotal` through create, list, detail, and every status response; drive one order to `DELIVERED`, another to `CANCELLED`, and compare observed/generated statuses exactly with `PENDING|CONFIRMED|SHIPPED|DELIVERED|CANCELLED` |
| Swagger completeness | Fetch once, run the explicit operation and schema matrices, and report the failing row directly |
| Customer update/read | PATCH all mutable fields, then assert the same values from detail and the ID-matched active-list entry |
| Fractional stock | Record stock, PATCH `1.5` expecting 400, then GET by ID and assert unchanged stock |

Run E2E serially against a dedicated reachable PostgreSQL 15 database with no external writers; do not wrap requests in an outer transaction because the combined suite contains real lock/concurrency proof. Use `docker compose up -d db`, `npm run test:e2e`, and stop the service afterward. Also run unit, build, coverage, focused format/lint, and `git diff --check`.

## Threat Matrix

| Boundary | Applicability | Design response / RED tests |
|---|---|---|
| Documentation-like paths | N/A — no execution classification | None |
| Git repository selection | N/A — no Git automation | None |
| Commit state | N/A — no commit automation | None |
| Push state | N/A — no push automation | None |
| PR commands | N/A — branch topology is procedural; no command composition changes | None |

## Integration, Verification, and Rollback

Use a single ≤400 authored-line work unit on a coverage child based on and targeting integration/tracker parent `fix/order-lifecycle-cancellation`; its diff must exclude inherited parent changes. Merge child into parent, then independently rerun the complete checks and scenario matrix. Only an exact-parent-commit report showing 27/27, zero blockers may allow the parent to target `main`.

Preserve corrected baseline evidence revision `sha256:1c0749f585e635a5a24f6ada14beeaeea705a55a1e2d4f890ed75154a9ebd935`. The new verifier must issue a new revision and command hashes; never rewrite or reuse receipts. Any post-verification code, test, metadata, dependency, or parent-diff change invalidates the receipt and requires a full rerun.

Rollback by reverting the child from the parent and rerunning verification; no schema/data rollback is required. Non-goals: new behavior, routes, dependencies, migrations, auth, frontend work, refactoring, snapshots, or edits to original change artifacts.

## Open Questions

None.
