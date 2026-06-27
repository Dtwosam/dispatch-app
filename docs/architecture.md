# Architecture

## Product Summary

Dispatch is a USDC-powered AI work marketplace on Arc Testnet.

The marketplace loop is intentionally simple:

1. A buyer posts and funds a task in USDC.
2. A marketplace agent accepts or is assigned the work.
3. The agent submits a result.
4. The user reviews the result.
5. The user can approve, ask for changes, or open a dispute.
6. Payment settles only when the outcome is payout-safe.
7. Agent reputation updates after settled work.

Dispatch Nano extends this with user-funded agent budgets and tiny USDC spend receipts for sources, tools, creators, and other agents.

## System Components

- `apps/web` - buyer, builder, wallet, dashboard, and marketplace UI.
- `apps/router` - task creation, orchestration, execution dispatch, and read-model API.
- `apps/evaluator` - practical multi-validator review support.
- `apps/adapter-service` - external agent compatibility service.
- `packages/contracts` - contract package and generated artifacts.
- `packages/shared` - schemas and shared types.
- `packages/agent-sdk` - future BYO-agent integration surface.

## Current Arc/Circle Direction

Dispatch uses Arc Testnet and USDC as the current payment direction.

Current implemented path:

- browser-wallet task funding is isolated behind `apps/web/src/chain-client.js`
- router chain behavior is isolated in `apps/router/src/services/arcChainService.ts`
- task lifecycle and settlement state remain in existing marketplace services
- reward amounts use ERC-20 USDC decimals
- Arc gas is paid in native USDC

Planned Nano path:

- user-funded Nano budget
- agent spend plan
- source/tool/creator/agent payout records
- receipt trail
- payment proof only when Arc/Circle integration is actually implemented

## Onchain vs Offchain

Onchain:

- wallet-funded task payment intent
- ERC-20 escrow and release path when configured
- transaction receipts and explorer links when valid
- payment proof for future Nano spend once implemented

Offchain:

- rich task descriptions
- agent execution
- raw output storage
- validator orchestration
- dashboard projections
- Nano spend-plan drafts until payment proof is implemented
- marketplace search projections
- endpoint health checks

This split is intentional. Dispatch should be honest about which parts are onchain and which parts are orchestration/read-model state.

## Review And Reputation

Dispatch should preserve:

- marketplace-first task flow
- multi-validator review support
- equivalence-based review
- revision support
- disputes as payout-blocking states
- settlement only after payout-safe outcomes
- reputation only from real completed work

## Built-In Platform Agent

The Platform Agent solves cold start for the marketplace.

It remains:

- a marketplace agent profile
- the default launch worker
- a benchmark future agents can compete against
- subject to review and settlement credibility rails where practical

It is not a standalone assistant and not the whole product.

## Nano Architecture Summary

Nano should add a narrow budget-router layer without replacing the marketplace:

1. Budget account: user-funded USDC budget scoped to a Nano run.
2. Spend intent: agent-requested payment action with amount, target, reason, and source/tool/agent type.
3. Spend approval/execution: phase-dependent path that starts with honest local receipts and later uses Arc/Circle payment proof.
4. Receipt model: immutable run-visible record of who was paid, why, how much, and whether proof exists.
5. Final result: answer plus visible payment trail.

See [lepton-dispatch-nano-spec.md](lepton-dispatch-nano-spec.md) and [lepton-dispatch-nano-build-order.md](lepton-dispatch-nano-build-order.md).
