<!-- DISPATCH_NANO_ACTIVE_WINNING_BUILD_ORDER_START -->
## Dispatch Nano Active Winning Build Order

The active post-Phase13 Nano build order is `docs/lepton-nano-winning-build-order.md`. Future ChatGPT/Codex work must follow that document unless the user explicitly changes the roadmap.

Core locked direction: Dispatch Nano is an AI agent source-payment layer for Dispatch. The flow is user goal → agent decision → tiny USDC source/tool payment → Arc proof → unlocked source/tool value → final result → receipt trail.

Hard rule: do not mark anything paid without verified Arc proof. Gateway/x402/Circle Wallets/Nanopayments remain planned-only unless actually implemented and verified.
<!-- DISPATCH_NANO_ACTIVE_WINNING_BUILD_ORDER_END -->
# Dispatch Source of Truth

Last updated: 2026-06-27

Repo: `Dtwosam/dispatch-app`

Default branch: `main`

Live app: `https://dispatch-arc.vercel.app`

## Purpose

This is the working source of truth for Dispatch. Read it before product, UX, code, deployment, roadmap, or bug-fix work.

If older docs, old hackathon language, or prior chat context conflicts with this file, follow this file unless the user explicitly says otherwise.

## Product Definition

Dispatch is a USDC-powered AI work marketplace on Arc Testnet.

The core flow is:

1. A user posts a task.
2. The user funds the task in USDC.
3. An AI agent completes the work.
4. The user reviews the submitted work.
5. The user can approve, ask for changes, or open a dispute.
6. Payment is released only after approval.
7. Reputation and earnings update from real task/payment state.

Dispatch is not just an agent directory. It is a work, payment, review, dispute, and reputation layer for AI agents.

## Dispatch Nano

Dispatch Nano is the Lepton hackathon module.

Nano is the receipt layer for AI agents paying sources and tools: a user gives an agent a small USDC budget, the agent requests a tiny source/tool payment, the user approves it, payment happens on Arc, proof is verified, and the final result shows how the proof-verified source/tool improved the work.

Nano is not a generic budget dashboard, a full autonomous agent economy, or a fake helper-agent marketplace.

The Nano concept:

> User goal -> agent decision -> tiny USDC source/tool payment -> Arc proof -> unlocked source/tool value -> final result -> receipt trail.

Budget, spend intent, and receipt models remain the implementation architecture. The active product story is source/tool payment with Arc USDC proof and proof-gated result unlock.

Nano extends the marketplace. It does not replace the task/review/payment loop.

## Current Chain And Payment Direction

Current active direction:

- Arc Testnet
- Circle developer tooling
- USDC rewards and budgets
- visible payment trails
- source/tool payment with Arc USDC proof
- creator/source/tool payouts when implemented and verified
- agent-to-agent payments as planned future scope unless real proof exists
- honest review and settlement states

Official source map: [docs/arc-circle-sources.md](arc-circle-sources.md)

Circle tool usage plan: [docs/circle-tool-usage.md](circle-tool-usage.md)

Nano spec: [docs/lepton-dispatch-nano-spec.md](lepton-dispatch-nano-spec.md)

Nano source-payment architecture: [docs/lepton-nano-source-payment-architecture.md](lepton-nano-source-payment-architecture.md)

Build order: [docs/lepton-dispatch-nano-build-order.md](lepton-dispatch-nano-build-order.md)

## Data Honesty Rules

Do not fake data.

Never fake:

- users
- task history
- completed work
- payments
- revenue
- earnings
- ratings
- reviews
- approval rates
- transaction hashes
- balances
- settlement status
- endpoint health
- owner proof
- compatibility results
- marketplace volume
- Nano spend receipts

If wallet-specific task history, ownership, payment activity, or Nano receipts are not available, say so with short honest copy.

## Do-Not-Touch Rules

Do not change these unless explicitly requested:

- backend routes
- contracts
- Arc chain config
- wallet funding logic
- settlement logic
- payment release logic
- Supabase schema
- task lifecycle logic
- review logic
- revision logic
- dispute logic
- package logic
- dashboard calculations
- endpoint ownership proof logic
- private keys
- environment secrets

Docs or UX work must not quietly change product behavior.

## Dashboard Rules

Dashboard is wallet-scoped/private when wallet context is available.

Disconnected users should see:

> Connect wallet to view your Dashboard.

Dashboard sections should use wallet-scoped data only. Do not show public marketplace data as private user data.

Use section-level loading, empty, and unavailable states:

- Needs Attention
- My Tasks
- My Agents
- Earnings

Do not show public marketplace reconnect copy as the primary dashboard state.

## Nano Rules

Nano must show only real or clearly simulated-in-local-development receipts. It must never claim real Arc/Circle payments, x402 payments, Gateway settlement, or agent-to-agent payouts unless the repo actually performs and verifies them.

Nano should be presented as source/tool payment with Arc USDC proof, not as a generic budget dashboard.

MVP Nano can start with a starter source unlock, draft spend plan, and honest local/session receipt states, but payment-proof phases must be labeled until Arc/Circle verification exists.

## Known Issues

### Approve work HTTP 429

Clicking `Approve work` can hit HTTP 429 from the Render review endpoint.

This must be fixed at the root cause later. Investigate duplicate requests, approval calling evaluation unnecessarily, pending-click locking, retry behavior, backend rate limiting, and reuse of existing review data.

Do not hide this error without fixing the root cause.

### Startup loading

The global `Loading Dispatch...` startup screen was addressed by making route rendering non-blocking and hydrating market/task/wallet data in the background.

Do not reintroduce a full-app blocking loader for agents, tasks, leaderboard, Arc status, wallet readiness, or Nano payment state.

## Deployment Rules

Do not deploy production unless the user explicitly asks.

Do not run:

```powershell
npx vercel deploy --prod --yes
```

## Standard Checks

For code/UX fixes, use the checks requested in that pass.

For Phase 0 docs foundation:

```powershell
git diff --check
npm --workspace apps/web run build
```

## Agent/Codex Instructions

Before making Dispatch changes:

1. Read this file.
2. Read [docs/lepton-dispatch-nano-build-order.md](lepton-dispatch-nano-build-order.md) for Nano work.
3. Create a TODO checklist.
4. Check the current repo state.
5. Confirm the intended scope.
6. Avoid unrelated product logic changes.
7. Keep UX and docs simple, honest, and source-backed.
8. Run the required checks.
9. Report files changed, behavior changed, and tests run.

Do not deploy unless explicitly instructed.

