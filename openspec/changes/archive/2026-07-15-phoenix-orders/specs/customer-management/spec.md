# Customer Management Specification

## Purpose

Define the active-customer CRUD and unique-email contract.

## Requirements

### Requirement: Active customer CRUD

The API MUST create, list, retrieve, update, and soft-deactivate customers. A customer MUST expose `id`, `fullName`, `email`, optional `phone`, `isActive`, and `createdAt`; normal reads MUST exclude inactive customers.

#### Scenario: Maintain an active customer

- GIVEN valid required customer data and an unused email
- WHEN a customer is created and later updated
- THEN the API returns the persisted active customer with a UUID and timestamp
- AND subsequent active reads reflect the update

#### Scenario: Deactivate without physical deletion

- GIVEN an active customer
- WHEN the customer is deleted through the API
- THEN the API marks the customer inactive without physically deleting it
- AND active list and detail reads no longer return it

### Requirement: Customer input validation

The API MUST reject a missing `fullName`, missing or invalid `email`, and non-whitelisted fields. `phone` MAY be omitted.

#### Scenario: Reject invalid customer input

- GIVEN a create or update payload that violates the customer contract
- WHEN the request is validated
- THEN the API rejects it without persisting the invalid change

#### Scenario: Accept omitted phone

- GIVEN valid required customer data without `phone`
- WHEN the customer is created
- THEN the API creates the customer with no phone value

### Requirement: Unique customer email

The API MUST enforce email uniqueness across customers and MUST report a duplicate as a conflict.

#### Scenario: Reject duplicate email

- GIVEN a customer already owns an email
- WHEN another customer is created or updated to that email
- THEN the API returns HTTP 409
- AND neither customer is changed
