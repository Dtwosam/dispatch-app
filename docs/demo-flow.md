# Demo Flow

This script is for GenLayer submission reviewers and live demos.

## Submission Links

- GitHub repo: `https://github.com/Dtwosam/dispatch-genlayer.git`
- Live demo: `https://dispatch-steel.vercel.app/`
- Live GenLayer Bradbury Testnet route: `https://dispatch-steel.vercel.app/genlayer-demo`
- Intelligent Contract: `contracts/marketplace/marketplace.py`
- Reviewer-facing route: `/genlayer-demo`

Arc or Circle references in older project materials should be read as secondary/future rails. The flow below is the GenLayer Bradbury Testnet submission path.

## 1. Open The Marketplace

Live:

```text
https://dispatch-steel.vercel.app/
```

Run the frontend:

```bash
npm run dev:web
```

Open:

```text
http://localhost:3000
```

The home page should position Dispatch as a marketplace for verified AI work.

## 2. Open The GenLayer Bradbury Testnet Route

Live reviewer route:

```text
https://dispatch-steel.vercel.app/genlayer-demo
```

Open:

```text
http://localhost:3000/genlayer-demo
```

This reviewer-facing route showcases the Intelligent Contract/evaluator marketplace flow:

1. funded task
2. assigned Platform Agent
3. result hash submitted
4. multi-validator review finalized
5. settlement eligibility reached

Use the "Advance Demo Flow" button to step through the lifecycle.

Reviewers can inspect this Bradbury Testnet marketplace flow without providing wallet credentials up front. Publishing a specific contract address, sending live write transactions, or running integration tests still requires a configured GenLayer environment and funded Bradbury wallet.

## 3. Inspect The Contract

Open:

```text
contracts/marketplace/marketplace.py
```

Verify it includes:

- GenLayer dependency header
- `from genlayer import *`
- `gl.Contract`
- payable funded task creation
- multi-validator review input aggregation
- appeal handling
- settlement eligibility gating

## 4. Inspect The Production Contract Package

Open:

```text
packages/contracts/marketplace/task_escrow.py
packages/contracts/marketplace/agent_registry.py
packages/contracts/.generated/task_escrow.py
packages/contracts/.generated/agent_registry.py
```

These files show the fuller package implementation and generated standalone deploy artifacts.

## 5. Prepare Contracts

Run:

```bash
npm run contracts:prepare
```

This verifies the Studio contract, production contracts, and standalone generated artifacts are present and in GenLayer contract format.

## 6. Run Tests

Run:

```bash
npm run contracts:test
```

If a GenLayer environment is configured, run:

```bash
npm run contracts:integration
```

## 7. Live Deployment Fields

- Frontend URL: `https://dispatch-steel.vercel.app/`
- GenLayer Bradbury Testnet route: `https://dispatch-steel.vercel.app/genlayer-demo`
- Router health URL: environment-specific; add if exposing the router service publicly.
- Evaluator health URL: environment-specific; add if exposing the evaluator service publicly.
- GenLayer contract address: environment-specific; add the Bradbury address for the deployed contract environment.

## Expected Reviewer Takeaway

Dispatch is not a generic AI app with blockchain language. It is a work marketplace where GenLayer anchors the subjective review and settlement decision for AI-generated work.
