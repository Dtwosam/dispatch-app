# GenLayer Contracts

This package contains the MVP contract layer for the GenLayer-native AI Agent Marketplace.

## Contracts

- `marketplace/agent_registry.py`: agent identity and version registry
- `marketplace/task_escrow.py`: task lifecycle, escrow, submissions, settlement, and event log
- `.generated/agent_registry.py`: standalone deployable artifact for GenLayer environments
- `.generated/task_escrow.py`: standalone deployable artifact for GenLayer environments

## Why the package is split this way

The GenLayer docs clearly support Python Intelligent Contracts, typed storage, payable write methods, view/write decorators, and contract deployment through Studio or deploy scripts.

The docs I verified do not show a stable dedicated event-emission API comparable to EVM logs. Because of that, this package isolates event handling behind a persistent event-log adapter:

- each contract appends `EventRecord` items to storage
- each write method also prints a compact event line for execution logs

This keeps indexing possible today while leaving room to swap to a native event API if the GenLayer docs add one later.

## Verified doc assumptions used here

- Python-based Intelligent Contracts extending `gl.Contract`
- `@gl.public.view`, `@gl.public.write`, and `@gl.public.write.payable`
- typed persistent state via class attributes
- `TreeMap` and `DynArray` for persistent collections
- `gl.message.sender_address` and `gl.message.value`
- deploy scripts via `genlayer deploy` and `deploy/*.ts`
- Studio-compatible constructor and method schema detection

## Explicit uncertainties isolated behind adapters

- Multi-file contract packaging:
  the Studio docs I reviewed focus on loading a contract file, not a Python package tree. If your current toolchain only supports single-file uploads, inline `constants.py` and `errors.py` into each contract before Studio deployment.
- Native event emission API:
  the docs reviewed did not expose a stable first-class contract event API, so the MVP persists `EventRecord` entries onchain and lets the indexer read them through views.
- Contract-to-contract call surface:
  the docs explicitly say `.view()` and `.emit()` details are still subject to change, so registry reads are isolated to a small interface in `task_escrow.py`.
- Onchain time source:
  the reviewed docs did not surface a stable timestamp primitive, so `deadline` is stored onchain but enforced offchain for now.
- Studio token-transfer behavior:
  the Studio limitations page says native token transfers are not supported there, so payable settlement and refund behavior should be validated on Bradbury or another network path, not only in Studio.

## Test workflow

This package now uses a two-layer test strategy:

- `tests/direct/`
  - fast in-memory logic tests against the marketplace domain models
  - best for state transitions, access control, fee math, refund rules, and dispute pause behavior
- `tests/integration/`
  - GenLayer-environment smoke tests intended for `gltest`
  - use the standalone `.generated/` contracts and the config in `gltest.config.yaml`

Recommended commands:

- `npm --workspace packages/contracts run test:direct`
- `npm --workspace packages/contracts run prepare:deploy`
- `npm --workspace packages/contracts run test:integration`

Important note:
- The integration suite assumes `gltest` is installed and the target network is configured.
- `gltest.config.yaml` uses the current `genlayer-test` schema with `networks`, `paths`, and `environment`.
- Replace the sentinel account in `gltest.config.yaml` with a real private key or env-backed value before targeting `testnet_bradbury`.
- Payable escrow smoke is opt-in through `GLTEST_ENABLE_PAYABLE=1`, because native token behavior depends on the environment.
