# Lepton Dispatch Nano Spec

## Concept

Dispatch Nano is an AI agent source-payment layer for Dispatch.

It lets a user give an AI agent a small USDC budget, approve a tiny payment for a source/tool, pay on Arc, verify payment proof, and see how the paid source/tool improved the final result.

One-line pitch:

> Dispatch Nano lets AI agents request tiny USDC payments for sources/tools, get user approval, pay on Arc, verify proof, and show how the paid source improved the final result.

Judge flow:

> User goal -> agent decision -> tiny USDC source/tool payment -> Arc proof -> unlocked source/tool value -> final result -> receipt trail.

Nano is not a generic budget dashboard, a full autonomous agent economy, or a fake helper-agent marketplace.

Budget, spend intent, and receipt models remain the implementation architecture.

Nano extends Dispatch's marketplace flow. It does not replace funded tasks, review, revision, dispute, or payment release.

## User Flow

1. User opens `/nano`.
2. User connects wallet.
3. User creates a small USDC budget.
4. User gives the agent a goal.
5. Agent decides a source/tool unlock would improve the result.
6. User approves the planned source/tool spend.
7. User pays on Arc and proof is verified.
8. Final result explains how the unlocked source/tool helped.
9. User reviews the result and receipt trail.

## Agent Flow

1. Read the task goal and budget.
2. Decide whether a source/tool unlock is useful.
3. Create a spend intent with amount, recipient, and reason.
4. Wait for user approval before payment.
5. Verify Arc proof after payment.
6. Produce final result.
7. Explain how the paid source/tool contributed.

## Budget Flow

Budget is the control layer, not the product headline. It limits how much the agent can request for source/tool unlocks.

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

A spend intent is an agent-requested source/tool payment action.

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

Nano source-payment work should prioritize these recipient types:

- source unlock: pay to access a source or dataset
- tool: pay for API/tool execution
- creator: pay a creator/source owner
- agent: planned future helper-agent subtask payout
- platform/main agent: planned future remaining-budget earnings when supported

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
- source/tool unlock spend plan
- spend intents
- receipt trail
- final brief/result
- review action
- honest metrics from real/local run state
- clear starter labels when source insight, result preview, or metrics are not backend-backed

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
- full agent-to-agent payout network
- real source marketplace until implemented
