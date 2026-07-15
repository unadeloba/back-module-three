# Delta for Verification Coverage

This delta defines evidence only. The original Phoenix Orders specifications remain the normative product contract. Verification MUST NOT expand behavior, rely on snapshot-only assertions, truncate the database, or introduce authentication, migrations, frontend scope, or unrelated changes.

## ADDED Requirements

### Requirement: Runtime order contract evidence

Verification MUST prove that `total`, `unitPrice`, and `subtotal` are JSON numbers in create, list, detail, and status-update responses, and that observed statuses are exactly `PENDING`, `CONFIRMED`, `SHIPPED`, `DELIVERED`, and `CANCELLED`.

#### Scenario: Prove order serialization and statuses

- GIVEN isolated persisted orders covering delivery and cancellation lifecycles
- WHEN create, list, detail, and status-update responses are exercised through the production-equivalent HTTP boundary
- THEN every named numeric field is a JSON number in each applicable response
- AND the complete observed status set equals the five normative values exactly

### Requirement: Semantic Swagger evidence

Verification MUST semantically prove every supported customer, product, and order operation, body schema, validator-backed constraint, exact status enum, success response, and relevant HTTP 400, 404, and 409 response. Snapshot-only proof MUST NOT qualify; minimum DTO metadata MAY be added only to expose an existing contract.

#### Scenario: Prove the generated API contract exhaustively

- GIVEN the generated Swagger document for the production-equivalent application
- WHEN every supported operation and referenced body or response schema is checked semantically
- THEN all operations, required fields, constraints, exact statuses, success responses, and relevant 400/404/409 responses are discoverable
- AND no assertion depends solely on a whole-document snapshot

### Requirement: Customer update persistence evidence

Verification MUST prove a customer HTTP update persists through both active detail and active list reads.

#### Scenario: Read an updated active customer

- GIVEN an isolated active customer
- WHEN its mutable fields are updated through HTTP and it is subsequently read by detail and active list
- THEN both reads return the persisted updated values for the same customer ID

### Requirement: Fractional stock rejection evidence

Verification MUST prove fractional product stock is rejected and persisted state remains unchanged, without database truncation.

#### Scenario: Reject fractional stock without mutation

- GIVEN an isolated active product whose persisted stock is recorded
- WHEN an HTTP update submits fractional stock
- THEN the response is HTTP 400
- AND a subsequent active detail read returns the unchanged stock

### Requirement: Fresh combined final evidence

After the coverage child is merged into the lifecycle parent, verification MUST produce fresh evidence for that exact parent revision showing 27/27 compliant and zero blockers. Stale evidence MUST NOT be reused, and any later parent mutation MUST invalidate the result and require a full rerun.

#### Scenario: Accept the lifecycle parent for final delivery

- GIVEN the coverage child has been merged into the lifecycle parent
- WHEN combined verification runs against the resulting exact parent revision
- THEN a new evidence revision records 27/27 compliant and zero blockers
- AND the result remains valid only while the parent has no subsequent mutation
