# API Contract Specification

## Purpose

Define the observable HTTP, validation, serialization, documentation, and verification contract.

## Requirements

### Requirement: Runtime API boundary

All customer, product, and order endpoints MUST be served beneath `/api` and MUST use consistent HTTP success and error statuses.

#### Scenario: Call a documented endpoint

- GIVEN the production-equivalent application is running
- WHEN a valid request targets `/api` plus its resource path
- THEN the API returns the documented success response

#### Scenario: Request a missing UUID resource

- GIVEN a syntactically valid UUID that identifies no active resource
- WHEN its detail endpoint is requested
- THEN the API returns HTTP 404 with a visible error response

### Requirement: Transport validation

The API MUST transform valid payload values, whitelist declared DTO fields, reject undeclared fields, and return HTTP 400 for malformed UUIDs or invalid payloads before business mutation.

#### Scenario: Reject undeclared input

- GIVEN an otherwise valid payload containing an undeclared field
- WHEN it reaches an `/api` endpoint
- THEN the API returns HTTP 400
- AND no business state changes

### Requirement: Public numeric and status schema

The API MUST serialize `price`, `unitPrice`, `subtotal`, and `total` as JSON numbers and MUST expose only `PENDING`, `CONFIRMED`, `SHIPPED`, `DELIVERED`, and `CANCELLED` as order statuses.

#### Scenario: Serialize an order

- GIVEN a persisted order
- WHEN it is returned by create, list, detail, or status update
- THEN all public monetary fields are numbers
- AND status and line names match the shared contract

### Requirement: Complete Swagger contract

Swagger MUST document every customer, product, and order endpoint, request shape, response shape, validation constraint, status value, and relevant error response.

#### Scenario: Inspect API documentation

- GIVEN the application is running
- WHEN the Swagger document is retrieved
- THEN all supported `/api` operations and shared schemas are discoverable

### Requirement: Production-equivalent contract verification

Automated API tests MUST configure the same `/api` prefix and global validation behavior as runtime, and strict TDD MUST begin each backend behavior change with an observable failing test.

#### Scenario: Exercise invalid input in E2E

- GIVEN the database-backed E2E application
- WHEN a request violates runtime validation
- THEN the test observes the same route and rejection contract as production
