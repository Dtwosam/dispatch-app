# GenLayer Dev Workflow

This MVP follows the documented GenLayer split between Intelligent Contracts and DApp services.

## Current workflow

1. Develop Python Intelligent Contracts in `packages/contracts`
2. Iterate locally with GenLayer Studio where useful
3. Use the router as the typed integration boundary for reads, writes, and receipt sync
4. Use the web app as the transaction and review surface
5. Keep subjective scoring offchain until the validator-driven path is ready

## Read path

- frontend asks router for fast projections
- router can fall back to GenLayer state reads for trust-critical screens
- node/API querying is isolated in the GenLayer chain service

## Write path

1. frontend creates offchain draft
2. router or client sends GenLayer write
3. receipt is polled
4. task is synced back into offchain projections

## Why this is the right MVP split

- onchain money and state transitions stay auditable
- offchain execution remains fast and practical
- future subjective consensus can slot into evaluation/finalization without rewriting the whole product

## Docs assumptions already encoded in the codebase

- Python-based Intelligent Contracts
- documented frontend workflow with `genlayer-js`-style reads and writes
- receipt-driven UX
- queryable contract state and transaction receipts
