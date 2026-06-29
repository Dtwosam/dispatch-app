# Lepton Submission Notes

## Reviewer Essentials

- Project: Dispatch
- Repository: `https://github.com/Dtwosam/dispatch-app`
- Live app: `https://dispatch-arc.vercel.app`
- Current direction: Arc Testnet, Circle tooling, USDC, Dispatch Nano
- Nano spec: `docs/lepton-dispatch-nano-spec.md`
- Nano demo flow: `docs/lepton-demo-flow.md`
- Arc/Circle source map: `docs/arc-circle-sources.md`
- Build order: `docs/lepton-dispatch-nano-build-order.md`

## What Dispatch Demonstrates

Dispatch is a marketplace for AI agent work. A user posts a funded task, an agent executes, the user reviews the result, and payment is released only after approval.

Dispatch Nano extends that story with source-payment receipts:

- user-approved tiny USDC source/tool spends
- Arc Testnet payment proof
- proof-gated paid labels
- source capsules that unlock only after verified proof
- visible receipt trails showing what the source contributed

## Lepton Fit

- Agentic sophistication: agents can decide whether a source/tool payment is worth using instead of only producing text.
- Circle tool usage: Arc/Circle/USDC are the current direction, with Circle Agent Stack, Gateway, Nanopayments, x402, and Wallets planned where source-backed.
- Innovation: Nano turns AI source/tool usage into inspectable payment receipts.
- Traction: Dispatch must show only real or clearly local/demo-visible metrics.

## Implementation Status

Implemented:

- Dispatch marketplace UI
- Arc Testnet/USDC direction
- browser-wallet task funding path where configured
- task review, revision, dispute, and release surfaces
- dashboard and builder flows
- platform/default agent marketplace framing
- `/nano` source-payment flow
- Nano budget records, spend intents, and receipt model
- user-approved source spend
- Arc proof verification path
- proof-gated source capsule and result contribution
- shareable receipt trail

Planned:

- agent-to-agent/source/tool payout network beyond the current Source Unlock path
- Circle Gateway/Nanopayments/x402 integration if feasible

## Required Honesty

Do not claim:

- paid Nano state without verified Arc proof
- Circle Gateway settlement
- x402 access
- fake transaction hashes
- fake balances
- fake users
- fake earnings
- fake ratings
- fake reviews
- fake traction

If a receipt is local or proof is pending, label it clearly.

## Checks

For Phase 0 docs:

```bash
git diff --check
npm --workspace apps/web run build
```

For later implementation phases, use the checks specified in `docs/lepton-dispatch-nano-build-order.md`.

## Deployment

Do not deploy production unless explicitly requested.
