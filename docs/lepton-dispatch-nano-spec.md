# Lepton Dispatch Nano Spec

## Concept

Dispatch Nano is an agent budget router for Dispatch.

It lets a user fund a small USDC budget, let an AI agent decide how to spend it, and see a payment trail for every agent, creator, source, or tool paid during the run.

Nano extends Dispatch's marketplace flow. It does not replace funded tasks, review, revision, dispute, or payment release.

## User Flow

1. User opens `/nano`.
2. User connects wallet.
3. User creates a small USDC budget.
4. User gives the agent a goal.
5. Agent proposes a spend plan.
6. User starts the run.
7. Agent spends from the approved budget.
8. Final result appears with a payment trail.
9. User reviews the result and receipts.

## Agent Flow

1. Read the task goal and budget.
2. Decide which sources, tools, or agents are useful.
3. Create spend intents with amount, recipient, and reason.
4. Execute approved spend intents through the current phase's payment path.
5. Record receipts.
6. Produce final result.
7. Explain how each paid source/tool/agent contributed.

## Budget Flow

Budget states:

- Draft
- Wallet required
- Funding pending
- Funded
- Spending
- Completed
- Refunded/remaining
- Unavailable

Budget fields:

- budget id
- owner wallet
- amount
- token
- network
- task/run goal
- spend limit
- remaining amount
- status
- receipt list

## Spend Intent

A spend intent is an agent-requested payment action.

Fields:

- intent id
- budget id
- run id
- recipient type: source, tool, creator, agent, platform
- recipient label
- recipient address or payment target when available
- amount USDC
- reason
- status: proposed, approved, paid, failed, skipped
- proof type: none, local, Arc receipt, Circle/Gateway receipt
- proof reference when valid

## Receipt Model

A receipt records what happened after a spend intent.

Fields:

- receipt id
- spend intent id
- amount USDC
- recipient label
- recipient type
- payment state
- proof type
- proof reference
- timestamp
- contribution summary

Receipt honesty:

- no fake transaction hashes
- no fake Gateway settlement
- no fake balances
- no fake payout success
- local/demo receipts must be labeled as local or simulated

## Creator/Source/Tool Payout Model

Nano should support these recipient types:

- source unlock: pay to access a source or dataset
- tool: pay for API/tool execution
- creator: pay a creator/source owner
- agent: pay another Dispatch agent for a subtask
- platform/main agent: retain remaining budget as earned value when supported

MVP can model recipients before live payout proof exists, but the UI and docs must label proof status honestly.

## Data Honesty Rules

Do not fake:

- payments
- transaction hashes
- balances
- users
- ratings
- reviews
- earnings
- agent-to-agent payouts
- creator payouts
- source/tool payment proof
- Gateway settlement
- x402 requests

If proof is not available, show `Proof pending`, `Local receipt`, or `Not paid yet`.

## MVP Scope

MVP Nano should include:

- `/nano` flow
- wallet-required state
- 1 USDC budget creation path
- spend plan
- spend intents
- receipt trail
- final brief/result
- review action
- honest metrics from real/local run state

## Out Of Scope

Out of scope for MVP unless explicitly requested:

- changing existing contracts
- changing existing task lifecycle
- changing settlement logic
- changing wallet funding logic
- production deployment
- mainnet claims
- unverified Gateway settlement
- fake traction metrics
- autonomous unlimited agent spending
