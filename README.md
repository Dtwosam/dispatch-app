# Dispatch

Dispatch is a USDC-powered AI work marketplace on Arc Testnet.

Users post funded tasks, AI agents complete the work, users review the result, and USDC payment is released only after approval. Dispatch keeps the product marketplace-first: task creation, funding, agent execution, review, revision/dispute support, payment release, and reputation.

## Dispatch Nano

Dispatch Nano is the Lepton hackathon module.

Nano is the receipt layer for AI agents paying sources and tools.

It lets an AI agent request a tiny USDC payment for source-backed work, wait for user approval, pay on Arc Testnet, verify proof, and show how the proof-verified source improved the final result.

The core Nano idea is simple:

> The agent pays for a source only after the user approves, and the result unlocks only after Arc proof verifies payment.

Budget, spend intent, and receipt models are the implementation architecture. The public product story is source/tool payment with visible Arc USDC proof.

Nano does not replace the marketplace. It extends Dispatch with source/tool receipts and proof-gated result contribution. Nano now includes a Nano-scoped x402/Gateway-compatible source endpoint that returns HTTP 402 payment-required metadata, a local-only Circle Gateway buyer proof script, and a local Agent Stack/Circle Wallet readiness check; the live browser unlock path still uses Arc proof unless Gateway/Nanopayments verification is completed. Agent-to-agent payments, creator payouts, Circle Wallet custody, and Nanopayments settlement remain planned unless the repo verifies them.

### Lepton Hackathon Links

- Current Nano preview: https://dispatch-68rsav7s4-dtwoflicks-2878s-projects.vercel.app/nano
- Router metrics endpoint: https://dispatch-router.onrender.com/api/nano/metrics
- Final submission package: [docs/lepton-nano-final-submission-package.md](docs/lepton-nano-final-submission-package.md)
- Judge walkthrough: [docs/lepton-nano-judge-walkthrough.md](docs/lepton-nano-judge-walkthrough.md)
- Live vs planned claims: [docs/lepton-nano-live-vs-planned.md](docs/lepton-nano-live-vs-planned.md)
- Demo script: [docs/lepton-nano-demo-script.md](docs/lepton-nano-demo-script.md)

Use the preview link for the latest Nano judging flow. Production at https://dispatch-arc.vercel.app may not include the latest preview changes unless a production deploy is explicitly requested and completed.

## Current Direction

The current Dispatch direction is:

- Arc Testnet
- Circle developer tooling
- USDC funding and payment trails
- Dispatch Nano source/tool receipts
- proof-gated source contribution
- planned agent-to-agent and creator/source/tool payouts when verified
- honest review, reputation, and settlement states

Official Arc/Circle source tracking is in [docs/arc-circle-sources.md](docs/arc-circle-sources.md).

The Lepton build order is in [docs/lepton-dispatch-nano-build-order.md](docs/lepton-dispatch-nano-build-order.md).

## Core Product Flow

1. A user posts a task.
2. The user funds the task in USDC.
3. An AI agent completes the work.
4. The user reviews the submitted work.
5. The user can approve, ask for changes, or open a dispute.
6. Payment is released only after approval.
7. Reputation and earnings update from real task/payment state.

## Nano Flow

1. A user opens Nano and connects a wallet.
2. The user creates a small USDC budget.
3. The agent evaluates whether a source/tool payment is worth it.
4. The user approves the planned source spend.
5. The source is paid on Arc Testnet and proof is verified.
6. The source capsule unlocks only after verified proof.
7. The final result and receipt trail show what the source contributed.

## Repository Map

- `apps/web` - Dispatch frontend and route UI.
- `apps/router` - task orchestration API, execution dispatch, marketplace state, and service routes.
- `apps/evaluator` - result evaluation and review support.
- `apps/adapter-service` - external agent compatibility service.
- `packages/contracts` - contract packages and artifacts.
- `packages/shared` - schemas, shared API types, and enums.
- `packages/agent-sdk` - future BYO-agent integration surface.
- `docs/dispatch-source-of-truth.md` - current product source of truth.
- `docs/arc-circle-sources.md` - official Arc/Circle source map.
- `docs/lepton-dispatch-nano-spec.md` - Nano product/architecture spec.
- `docs/lepton-demo-flow.md` - Lepton judge demo flow.
- `docs/lepton-dispatch-nano-build-order.md` - required phased build plan.

## Setup

Requirements:

- Node.js 20+
- npm 10+

Install dependencies:

```bash
npm install
```

Create local environment:

```bash
cp .env.example .env
```

Run the web app and services:

```bash
npm run dev:web
npm run dev:router
npm run dev:evaluator
```

For Arc browser-wallet local work, use the Arc/Circle/USDC values documented in `.env.example` and [docs/chain-integration.md](docs/chain-integration.md).

## Checks

Common web checks:

```bash
node --test apps/web/src/ui-models.test.mjs
node --test apps/web/src/chain-client.test.mjs
npx tsc --project apps/web/tsconfig.json --noEmit
npm --workspace apps/web run build
npm --workspace apps/web run build:static
git diff --check
```

For this Phase 0 docs foundation, the required checks are:

```bash
git diff --check
npm --workspace apps/web run build
```

## Data Honesty Rules

Do not fake:

- transaction hashes
- payments
- balances
- earnings
- users
- ratings
- reviews
- traction
- package sales
- completed tasks
- verification
- endpoint health
- owner proof
- compatibility results

If data is missing, show honest empty, loading, or unavailable states.

## Deployment

Do not deploy production unless the user explicitly requests it.

Production deploys must not be run during planning, docs, UX, or local-only implementation passes.

## Current Honesty Notes

- Dispatch is on Arc Testnet, not mainnet.
- Arc/Circle/USDC are the active product direction.
- Dispatch Nano is planned for Lepton and must be built phase by phase.
- Visible payment trails are central to the Nano story.
- Circle Gateway, Nanopayments, x402, Circle Wallets, Agent Stack, and Circle Skills are planned/referenced unless implementation exists in the repo. Local readiness scripts do not mean production custody or browser payment flow is live.
- Do not claim integrations are complete unless the repository proves it.
