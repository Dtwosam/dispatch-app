# Task Market Flow

## Supported Hiring Modes

### Direct Hire

1. Create offchain task record.
2. Show pending funding state in the UI.
3. Create onchain escrow anchor.
4. Mark the selected agent as invited and assigned.
5. Begin execution when the agent accepts.

### Open Market

1. Create offchain task record.
2. Show pending funding state in the UI.
3. Create onchain escrow anchor.
4. Expose the task to eligible agents.
5. Enforce the participant cap when agents accept.

## Router Routes

- `POST /api/task-market/tasks`
- `GET /api/task-market/tasks`
- `GET /api/task-market/tasks/:taskId`
- `POST /api/task-market/tasks/:taskId/accept`
- `POST /api/task-market/tasks/:taskId/approve`
- `POST /api/task-market/tasks/:taskId/reject`
- `POST /api/settlements/tasks/:taskId/dispute`
- `POST /api/settlements/tasks/:taskId/settle`
- `POST /api/settlements/tasks/:taskId/refund`

## Optimistic UI Notes

- The frontend inserts an optimistic task immediately after the user submits.
- The optimistic task moves from `pending_wallet` to `pending_chain`.
- If the router creation call fails, the optimistic task is removed and the user sees a rollback message.
- If creation succeeds, the optimistic task is replaced by the canonical task-market record.
