# Lepton Nano Source Payment Architecture

## Final Product Direction

Dispatch Nano is an AI agent source-payment layer for Dispatch.

It lets a user give an AI agent a small USDC budget, approve a tiny payment for a source or tool, pay on Arc, verify payment proof, and see how the paid source or tool improved the final result.

Nano is not a generic budget dashboard.

Nano is not a full autonomous agent economy yet.

Nano is not a fake helper-agent marketplace.

Budget, spend intent, and receipt models are implementation architecture. The product story is source/tool unlock with Arc USDC proof.

## One-Line Pitch

Dispatch Nano lets AI agents request tiny USDC payments for sources/tools, get user approval, pay on Arc, verify proof, and show how the paid source improved the final result.

## Judge Flow

User goal -> agent decision -> tiny USDC source/tool payment -> Arc proof -> unlocked source/tool value -> final result -> receipt trail.

## Product Structure

The `/nano` page should be organized around this judge run:

- Judge Run Intro
- Goal
- Budget
- Agent Decision
- Source Unlock
- Spend Plan
- Approval
- Recipient Wallet
- Pay on Arc
- Proof Gate
- Agent Run Progress
- Result Preview
- Payment Trail
- Why This Matters

Every section should help the judge understand one thing: the agent asked to unlock a source/tool, the user approved a small USDC spend, Arc proof verified the payment, and the final result shows what improved.

## What Is Real Now

Only claim live behavior when the repo performs it.

Current real or repo-backed behavior can include:

- Arc Testnet USDC proof flow
- user-approved planned spend
- recipient wallet validation
- Arc payment proof verification
- payment trail
- proof-gated paid label
- starter source unlock flow
- starter result preview

Do not describe these as production traction or full autonomous settlement unless the repo proves that state.

## What Is Starter Flow

Starter flow elements are allowed only when clearly labeled as starter/demo-visible behavior:

- starter source insight
- starter agent decision
- helper-agent spend examples
- result preview if not generated from a real external source
- session/local metrics if not backend-backed

Starter flow should support judging clarity. It must not imply fake payments, fake source marketplaces, fake users, or fake agent-to-agent production volume.

## What Is Planned Next

Planned next means not live unless later implementation proves it:

- Gateway nanopayments
- x402 service access
- Circle Wallet custody
- fully autonomous source/tool discovery
- real source marketplace
- real helper-agent marketplace
- public run explorer
- persistent usage dashboard
- agent-to-agent payout network

## Hard Honesty Rules

Do not fake:

- payments
- tx hashes
- balances
- users
- earnings
- reviews
- Gateway settlement
- x402 requests
- agent-to-agent payouts
- creator/source/tool proof
- traction metrics

Use short honest labels:

- Planned
- Approved, not paid yet
- Waiting for proof
- Paid with proof
- Gateway/x402 planned
- Starter preview

## Build Order

Future Nano work should follow this source-payment build order unless the user explicitly changes phases:

- Phase 0: Stabilize current Nano UX
- Phase 1: Add this source-of-truth doc
- Phase 2: Source Payment Judge Run UI
- Phase 3: Source Unlock State Model
- Phase 4: Real Arc Source Payment Path
- Phase 5: Honest usage/traction surface
- Phase 6: Preview deployment
- Phase 7: User testing sprint
- Phase 8: Submission polish

Do not skip from docs into backend, settlement, Gateway, x402, or autonomous agent payouts without an explicit phase request.
