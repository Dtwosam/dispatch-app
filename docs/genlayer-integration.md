# GenLayer Integration

Dispatch uses GenLayer to make subjective AI work review settlement-aware.

## Intelligent Contract Locations

Reviewer-friendly single-file contract:

- `contracts/marketplace/marketplace.py`

Fuller contract package:

- `packages/contracts/marketplace/task_escrow.py`
- `packages/contracts/marketplace/agent_registry.py`

Generated standalone artifacts:

- `packages/contracts/.generated/task_escrow.py`
- `packages/contracts/.generated/agent_registry.py`

## Contract Format

The GenLayer contracts use the Python Intelligent Contract format:

- dependency header: `# { "Depends": "py-genlayer:..." }`
- `from genlayer import *`
- contract classes extending `gl.Contract`
- storage-safe dataclasses using `@allow_storage`
- typed storage such as `TreeMap` and `DynArray`
- public methods decorated with `@gl.public.write`, `@gl.public.view`, and `@gl.public.write.payable`
- caller and value access through `gl.message.sender_address` and `gl.message.value`

## Marketplace Methods

The compact Studio contract exposes:

- `register_agent`
- `create_funded_task`
- `assign_task`
- `submit_result`
- `finalize_review`
- `appeal_task`
- `settle_task`
- `get_task`
- `get_agent`
- `get_reviews`
- `get_events`
- `get_public_schema`

## Optimistic Democracy Representation

`finalize_review` requires at least three validator inputs.

Each validator contributes:

- validator id
- score
- confidence
- accepted signal
- reasoning hash
- equivalence summary

The contract aggregates those inputs into consensus values and produces one of:

- `accepted`
- `rejected`
- `disputed`
- `unresolved`

Only accepted results become settlement-eligible.

## Equivalence Principle Representation

The contract intentionally stores an `equivalence_summary` for every validator input.

Validators are expected to judge whether the result solves the work request equivalently, not whether it matches exact wording. The evaluator service can produce those summaries using checks like task solved, constraints satisfied, format adherence, completeness, and usefulness.

## Appeal Handling

The buyer can call `appeal_task` when a result is rejected, disputed, or unresolved.

Appeal behavior:

- increments the appeal round
- pauses settlement
- returns the task to an appeal state
- allows a stricter or expanded review pass to call `finalize_review` again

## Deployment Notes

Use `contracts/marketplace/marketplace.py` for quick GenLayer Studio inspection and demo deployment.

Use the generated files in `packages/contracts/.generated/` when the deployment path prefers one contract file per upload.

After deployment, set:

- `GENLAYER_MARKETPLACE_STUDIO_ADDRESS` for the compact contract, or
- `GENLAYER_TASK_ESCROW_ADDRESS` and `GENLAYER_AGENT_REGISTRY_ADDRESS` for the package contracts

## Honest MVP Split

Onchain:

- identity, funding, result hash, review outcome, appeal state, settlement eligibility, reputation

Offchain:

- agent execution, raw artifacts, validator orchestration, indexing, analytics

This is still a practical MVP, but GenLayer owns the settlement-critical subjective decision layer.
