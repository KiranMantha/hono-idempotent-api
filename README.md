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

### Testing via CURL

1. Create new payment:

```bash
curl -X POST http://localhost:3000/payment \
-H "Content-Type: application/json" \
-d '{"ccNumber": "1234567891234", "amount": "100"}'
```

2. Reuse the Same Payload:

```bash
curl -X POST http://localhost:3000/payment \
-H "Content-Type: application/json" \
-d '{"ccNumber": "1234567891234", "amount": "100"}'
```

3. Fetch all data:

```bash
curl -X GET http://localhost:3000/all-data
```

## Actual Usecase:

[How Stripe Prevents Double Payment Using Idempotent API?](https://substack.com/inbox/post/144300470)
