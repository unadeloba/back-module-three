# Product Management Specification

## Purpose

Define active-product CRUD, optional descriptions, pricing, and inventory boundaries.

## Requirements

### Requirement: Active product CRUD

The API MUST create, list, retrieve, update, and soft-deactivate products. A product MUST expose `id`, `name`, optional `description`, numeric `price`, integer `stock`, `isActive`, and `createdAt`; normal reads MUST exclude inactive products.

#### Scenario: Maintain an active product

- GIVEN valid product data
- WHEN a product is created and later its price or stock is updated
- THEN active reads return the persisted values
- AND `price` is serialized as a number

#### Scenario: Deactivate without physical deletion

- GIVEN an active product
- WHEN the product is deleted through the API
- THEN the API marks it inactive without physically deleting it
- AND active list and detail reads no longer return it

### Requirement: Product validation boundaries

The API MUST require a non-empty `name`, MUST require `price` greater than zero, MUST require integer `stock` greater than or equal to zero, and MUST reject non-whitelisted fields.

#### Scenario: Accept boundary stock

- GIVEN a valid product with `stock` equal to zero and `price` greater than zero
- WHEN the product is created or updated
- THEN the API accepts and returns the product

#### Scenario: Reject invalid price or stock

- GIVEN `price` is zero or negative, or `stock` is negative or non-integer
- WHEN the product is created or updated
- THEN the API rejects the request without persisting the invalid values

### Requirement: Optional product description

The API MUST accept a product with an omitted description and MUST preserve a supplied description.

#### Scenario: Omit description

- GIVEN valid product data without `description`
- WHEN the product is created
- THEN the API creates it with no description value
