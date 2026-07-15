# Proposal: Phoenix Orders Verification Coverage

## Intent

Close the four runtime-evidence gaps behind the corrected 23/27 `phoenix-orders` failure, without adding product behavior.

## Measurable Outcomes

- After child-to-parent merge, combined independent verification reports 27/27 compliant, 0 untested, 0 blockers, and pass.
- Create, list, detail, and status-update responses prove numeric `total`, `unitPrice`, and `subtotal`, plus exactly `PENDING|CONFIRMED|SHIPPED|DELIVERED|CANCELLED`.
- Generated Swagger proves every supported operation, request constraint, success status, and relevant 400/404/409 response.
- Customer PATCH is followed by detail and active-list reads proving persisted updates.
- Fractional product stock returns 400 and a subsequent read proves no mutation.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This follow-up only proves existing `api-contract`, `customer-management`, `product-management`, and `order-management` requirements.

## Scope

### In Scope

- Focused PostgreSQL/Supertest cases in `test/app.e2e-spec.ts` for the four outcomes above.
- Exhaustive `/api/docs-json` assertions using explicit operation/expectation tables.
- Only DTO Swagger metadata required to expose already-enforced customer, product, and order request constraints/status/error contracts.

### Non-Goals

- New product behavior, authentication, migrations, frontend work, or unrelated refactoring.
- Changes to original `openspec/changes/phoenix-orders/` artifacts.
- Production changes beyond testability and minimum Swagger metadata.

## Approach

Start with named failing E2E assertions, then add only proven-missing metadata. Avoid snapshots and preserve runtime and data invariants.

## Dependency and Delivery

- Use `feature-branch-chain` only for this blocked final segment, replacing stacked-to-main.
- `fix/order-lifecycle-cancellation` is the integration/tracker parent.
- Base the focused coverage child on that branch and target it back to the parent.
- After child merge, rerun combined independent verification. The parent may target or merge into `main` only at 27/27 with zero blockers.
- Keep the child within 400 changed lines and its review diff free of unrelated work.

## Affected Areas

| Area | Impact |
|---|---|
| `test/app.e2e-spec.ts` | Add four focused runtime proof groups |
| `src/{customers,products,orders}/dto/*.ts` | Minimum Swagger metadata only |

## Risks and Rollback

- **Risk:** exhaustive Swagger checks become brittle. Mitigate with explicit semantic tables, not snapshots.
- **Risk:** parent changes pollute child review or evidence. Verify the focused child diff and rerun only after parent integration.
- **Risk:** incomplete work reaches `main`. Block the parent until independent verification records 27/27 and zero blockers.
- **Rollback:** before main merge, revert the child from the parent and rerun verification. No data or schema rollback is required.
