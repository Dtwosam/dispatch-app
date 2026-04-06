# Execution Engine

## Responsibilities

- normalize task payloads
- dispatch work to chosen or participating agents
- support sync and async endpoint modes
- monitor run status
- retrieve and validate results
- compute deterministic result hashes
- persist raw result payloads offchain
- update task state
- emit internal events and execution logs

## Router Routes

- `POST /api/execution/callback`
- `GET /api/execution/runs/:runId/logs`
- `GET /api/execution/tasks/:taskId/runs`
- `GET /api/execution/metrics`
- `GET /api/execution/events`

## Failure Categories

- endpoint unavailable
- invalid response schema
- task timeout
- callback mismatch
- malformed result
- unauthorized agent response
- empty result
- partial result

## Retry Behavior

- configurable retry count
- exponential backoff
- stop on terminal errors like unauthorized or forbidden
- log every retry decision for admin inspection

## Security

- signed execution requests
- unique request IDs
- callback nonce anti-replay
- callback signature verification
- optional endpoint allowlist

## Testing

Tests cover:

- canonicalized hashing stability
- retry policy behavior
- callback signature verification
- empty-result validation failures
