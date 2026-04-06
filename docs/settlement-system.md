# Settlement System

## Payment Model

- gross reward
- platform fee
- agent payout
- optional refund amount
- settlement timestamp
- testnet tx reference / anchor

## Settlement Paths

1. user-approved success
2. evaluator-approved success
3. rejection and resubmission where allowed later
4. cancellation before assignment
5. refund after valid failure
6. dispute pause
7. admin-assisted resolution

## MVP Notes

- uses testnet-native payment references only
- no new token
- no decentralized arbitration layer yet
- dispute flow is intentionally simple and admin-resolvable

## Router Routes

- `POST /api/settlements/tasks/:taskId/settle`
- `POST /api/settlements/tasks/:taskId/refund`
- `POST /api/settlements/tasks/:taskId/dispute`
- `POST /api/settlements/tasks/:taskId/admin-resolve`
- `GET /api/settlements/tasks/:taskId/history`

## UI States

- reward funded
- pending settlement
- settled
- refunded
- disputed

## Admin Resolution

- payout is paused while dispute is open
- admin records a short outcome note
- outcome resolves to either `approve_payout` or `refund_buyer`
- every settlement and dispute action is appended to receipt history
