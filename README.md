# hono-idempotent-api

A simple hono backend poc on idempotency using a payment api

## Usage:

| Api              | Method | Endpoint  | Payload                                            |
| ---------------- | ------ | --------- | -------------------------------------------------- |
| Create Payment   | POST   | /payment  | `{ "ccNumber": "1234567891234", "amount": "100" }` |
| Get All Payments | GET    | /all-data | N/A                                                |

1. Call `/payment` api for 1st time.
2. Call the same api with same payload again. Insertion into DB should happen once only
3. call `/all-data` api to verify the same.
