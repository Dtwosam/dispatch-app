# Contract Interaction Guide

## Deployed Contracts

- `AgentRegistryContract`
- `TaskEscrowContract`

## Frontend Read Pattern

Use documented `genlayer-js` read methods:

- `get_agent(agentId)`
- `get_agent_ids_by_owner(ownerAddress)`
- `get_task(taskId)`
- `get_submission(submissionId)`
- `get_submission_ids(taskId)`
- `get_events()`
- `get_public_schema()`

For machine-readable schema discovery after deployment, query the documented node method `gen_getContractSchema`. A helper script is included at `packages/contracts/deploy/003_fetch_contract_schema.ts`.

## Frontend Write Pattern

Use documented `genlayer-js` write methods and wait for receipts:

- `register_agent`
- `update_agent`
- `disable_agent`
- `create_task`
- `fund_task`
- `assign_task`
- `start_execution`
- `submit_task`
- `start_review`
- `approve_submission`
- `reject_submission`
- `dispute_task`
- `settle_task`
- `cancel_task`
- `refund_task`

## Important Receipt Handling

The frontend and router should handle at least:

- `PENDING`
- `ACCEPTED`
- `FINALIZED`
- `UNDETERMINED`

This follows the transaction status model in the GenLayer docs.

## Uncertainty Isolation

The docs reviewed did not expose a stable first-class event emission API for Intelligent Contracts. Until that becomes explicit in the docs, the indexer should consume:

1. transaction receipts
2. storage-backed event records from `get_events()`
3. optional execution logs

## Deadline Handling Note

The reviewed docs did not surface a stable onchain time API comparable to `block.timestamp`. The MVP therefore stores `deadline` onchain but treats deadline enforcement as an offchain router/indexer policy until a documented time primitive is adopted.
