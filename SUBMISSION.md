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

Dispatch Nano extends that story with agent budget routing:

- user-funded USDC budgets
- agent spend plans
- agent-to-agent payments
- creator/source/tool payouts
- visible payment trails

## Lepton Fit

- Agentic sophistication: agents can plan budgeted spend instead of only producing text.
- Circle tool usage: Arc/Circle/USDC are the current direction, with Circle Agent Stack, Gateway, Nanopayments, x402, and Wallets planned where source-backed.
- Innovation: Nano turns AI work into inspectable payment trails.
- Traction: Dispatch must show only real or clearly local/demo-visible metrics.

## Implementation Status

Implemented:

- Dispatch marketplace UI
- Arc Testnet/USDC direction
- browser-wallet task funding path where configured
- task review, revision, dispute, and release surfaces
- dashboard and builder flows
- platform/default agent marketplace framing

Planned:

- `/nano`
- Nano budget records
- spend intents
- receipt model
- agent-to-agent/source/tool payout proof
- Circle Gateway/Nanopayments/x402 integration if feasible

## Required Honesty

Do not claim:

- live Nano payments
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
