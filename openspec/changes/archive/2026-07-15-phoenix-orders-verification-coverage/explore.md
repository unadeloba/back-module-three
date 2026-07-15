## Exploration: Phoenix Orders Verification Coverage

### Current State
`phoenix-orders` is 8/8 complete but verification fails solely on four untested runtime scenarios (23/27). The current lifecycle candidate is uncommitted on `fix/order-lifecycle-cancellation`; it adds the status endpoint and its response mapping. The original lineage cannot accept another correction transaction after verification failure.

### Affected Areas
- `test/app.e2e-spec.ts` — the production-equivalent PostgreSQL/Supertest seam already configures `/api`, validation, and Swagger; all four gaps belong here.
- `src/orders/orders.controller.ts` and `src/orders/mappers/order-response.mapper.ts` — create, list, detail, and (candidate-only) status update all map through the canonical response mapper; runtime proof is test-only.
- `src/{customers,products,orders}/dto/*.ts` — product stock validation already rejects non-integers; customer and order request DTOs lack explicit Swagger property metadata, so exhaustive request-constraint documentation will require metadata changes.
- `src/{customers,products,orders}/*.controller.ts` — the existing response/error decorators are the source for an exhaustive generated-document assertion.

### Approaches
1. **New coverage change after lifecycle is mergeable** — add focused PostgreSQL E2E assertions, then add only Swagger metadata that those assertions prove missing.
   - Pros: preserves the failed-verification no-reopen rule; isolates proof from original implementation; uses the real HTTP/Swagger boundary.
   - Cons: cannot safely begin while the uncommitted lifecycle parent is blocked.
   - Effort: Medium (~280–360 authored lines for tests/metadata; SDD artifacts may require a second under-budget work unit).

2. **Append tests to `phoenix-orders` lifecycle candidate** — extend the current E2E case and original artifacts.
   - Pros: fewer branch transitions.
   - Cons: violates the native no-reopen rule and folds a new correction into a failed lineage.
   - Effort: Low, but not allowed.

### Recommendation
Choose approach 1. First obtain the native `resolve-review` outcome that makes the lifecycle candidate a mergeable baseline; then create this new change from updated `main`, preserving stacked-to-main. Do not create a child from the uncommitted lifecycle worktree: it would carry blocked parent code and constitute an implicit topology decision.

At that baseline, use named E2E cases in `test/app.e2e-spec.ts`:
- **Order serialization/statuses:** create an order, assert numeric `total`, `unitPrice`, and `subtotal` on create/list/detail/status-update responses; advance through supported updates; assert the Swagger `OrderStatus` enum equals the five allowed values. Test-only against the lifecycle baseline.
- **Swagger:** retrieve `/api/docs-json`; assert every supported customer/product/order operation, request schema/required fields/constraints, success statuses, and documented 400/404/409 responses. Expect customer create/update and order create/status DTO request constraints to require explicit `@ApiProperty*` metadata; this is a documentation behavior change, not an HTTP semantic change.
- **Customer update/read:** PATCH a created active customer, then GET detail and active list and assert the persisted fields. Test-only.
- **Non-integer stock:** PATCH a product with `stock: 1.5`, expect 400, then GET it and assert the prior stock remains. Test-only; `@IsInt()` plus the global validation pipe already enforce it.

### Risks
- An exhaustive Swagger assertion will expose currently undocumented customer/order request constraints; keep production changes limited to Swagger decorators.
- The lifecycle status route is absent from `main` and exists only in the uncommitted parent candidate, so testing it before parent resolution would pollute the follow-up diff.
- One broad Swagger matrix can become brittle; use a small operation/expectation table with explicit endpoint/error coverage rather than one opaque snapshot.
- The 400-line budget is at risk once proposal/spec/design/tasks are included; forecast and split by deliverable work unit before apply.

### Ready for Proposal
Yes, contingent on one explicit decision: resolve the blocked lifecycle parent through the native `resolve-review` path before creating the follow-up implementation branch. No feature-branch dependency is safe or unavoidable after that; stacked-to-main is preserved. Until then, a feature-child dependency is technically required for status-path proof but is not safe to create.
