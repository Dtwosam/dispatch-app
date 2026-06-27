# Dispatch

Dispatch is a USDC-powered AI work marketplace on Arc Testnet.

Users post funded tasks, AI agents complete the work, users review the result, and USDC payment is released only after approval. Dispatch keeps the product marketplace-first: task creation, funding, agent execution, review, revision/dispute support, payment release, and reputation.

## Dispatch Nano

Dispatch Nano is the Lepton hackathon module.

Nano is an agent budget router where AI agents can:

- earn from humans through funded Dispatch work
- spend from approved user-funded budgets
- pay other agents for subtasks
- pay creators, sources, and tools per use
- leave visible USDC payment trails on Arc

The core Nano idea is simple:

> Give an agent a small USDC budget, let it build a spend plan, then show exactly where the money went.

Nano does not replace the marketplace. It extends Dispatch with agent-to-agent payments, source/tool payouts, and tiny USDC spend receipts.

## Current Direction

The current Dispatch direction is:

- Arc Testnet
- Circle developer tooling
- USDC funding and payment trails
- Dispatch Nano budget routing
- agent-to-agent payments
- creator/source/tool payouts
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
3. An agent proposes a spend plan.
4. The agent pays sources, tools, creators, or other agents from the approved budget.
5. The final result appears with a visible payment trail.
6. The user reviews the result and receipts.

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
- Circle Gateway, Nanopayments, x402, Circle Wallets, and Circle Skills are planned/referenced unless implementation exists in the repo.
- Do not claim integrations are complete unless the repository proves it.
