# Order Management Specification

## Purpose

Define atomic order creation, immutable priced lines, reads, inventory effects, and lifecycle transitions.

## Requirements

### Requirement: Atomic order creation

The API MUST create a `PENDING` order only for an active customer and at least one active product with positive integer quantity. It MUST merge duplicate `productId` entries by summing quantity before stock validation, deduct stock at creation, and commit the order and all deductions atomically.

#### Scenario: Create and merge duplicate products

- GIVEN an active customer and sufficient stock for repeated entries of one product
- WHEN an order is created with positive quantities
- THEN one line contains their summed quantity and stock is deducted by that sum
- AND the order is `PENDING`

#### Scenario: Reject invalid participants or quantities

- GIVEN an inactive or missing customer/product, no items, or a non-positive/non-integer quantity
- WHEN order creation is requested
- THEN no order is created and no stock changes

#### Scenario: Roll back insufficient stock

- GIVEN any merged line exceeds available stock
- WHEN order creation is requested
- THEN the request fails visibly
- AND all stock and order records remain unchanged

#### Scenario: Prevent concurrent overselling

- GIVEN concurrent orders contend for stock insufficient to satisfy both
- WHEN both creations execute
- THEN only requests supported by available stock succeed
- AND committed stock never becomes negative

### Requirement: Priced immutable order lines

Each line MUST expose numeric `unitPrice` snapshotted at creation and numeric `subtotal` equal to `unitPrice * quantity`; order `total` MUST equal the sum of subtotals. Existing lines MUST NOT change when products change, and no line-edit operation SHALL be exposed.

#### Scenario: Preserve price snapshot

- GIVEN an existing order and a later product price change
- WHEN the order is read
- THEN its `unitPrice`, `subtotal`, and `total` retain creation-time values

#### Scenario: Reject line mutation

- GIVEN an existing order
- WHEN a consumer attempts to edit its lines
- THEN the API provides no supported mutation and the lines remain unchanged

### Requirement: Order reads

The API MUST list orders and retrieve an order by UUID with customer, canonical lines, totals, date, and status; a missing order MUST be reported as not found.

#### Scenario: Read order details

- GIVEN a persisted order
- WHEN its detail is requested
- THEN the complete canonical order representation is returned

### Requirement: Strict order lifecycle

The API MUST allow only `PENDING -> CONFIRMED -> SHIPPED -> DELIVERED`. It MUST allow `PENDING -> CANCELLED` and `CONFIRMED -> CANCELLED`; `DELIVERED` and `CANCELLED` MUST be terminal.

#### Scenario: Advance through the lifecycle

- GIVEN an order at each non-terminal delivery state
- WHEN its immediate next status is requested
- THEN the API persists and returns that next status

#### Scenario: Reject invalid transition

- GIVEN a requested skip, reversal, post-terminal change, or cancellation from `SHIPPED`
- WHEN status update is requested
- THEN the API rejects it and preserves status and stock

### Requirement: Exactly-once cancellation restocking

An allowed cancellation MUST restore every line quantity atomically exactly once. Concurrent or repeated cancellation attempts MUST NOT restore stock more than once.

#### Scenario: Cancel and restock

- GIVEN a `PENDING` or `CONFIRMED` order whose stock was deducted
- WHEN cancellation succeeds
- THEN status becomes `CANCELLED` and every quantity is restored

#### Scenario: Concurrent cancellation

- GIVEN concurrent cancellation requests for the same eligible order
- WHEN they complete
- THEN at most one transition succeeds
- AND inventory reflects exactly one restoration
