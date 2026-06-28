# Lepton Demo Flow

This is the planned Dispatch Nano judge demo.

## Demo Goal

Show that Dispatch Nano lets an AI agent request a tiny USDC payment for a source/tool, get user approval, pay on Arc, verify proof, and show how the paid source/tool improved the final result.

## Demo Script

1. Open `/nano`.
2. Connect wallet.
3. Create a 1 USDC budget.
4. Ask the main agent to create a short research-backed brief.
5. Agent decides that a source/tool unlock improves the result.
6. User approves the tiny source/tool spend.
7. User pays on Arc and proof is verified.
8. Final brief appears with the unlocked source/tool value.
9. Payment trail is visible.
10. User reviews the result.
11. Metrics update only from real or clearly labeled local/session run state.

## Demo Spend Plan

Budget: `1.00 USDC`

Planned spend:

- source unlock: `0.05 USDC`
- summarizer agent: `0.03 USDC`
- claim-check agent: `0.04 USDC`
- hook agent: `0.02 USDC`
- main agent earnings: remaining budget

Judge framing:

- the source unlock is the primary product story
- helper-agent spends are starter examples unless real helper-agent payout proof exists
- the budget is the control mechanism, not the product headline

## What Judges Should See

- the budget amount
- each spend intent
- each recipient type
- each amount
- proof state for each payment
- final output
- review state
- metrics based on real run data
- how the unlocked source/tool improved the final result

## Honesty Notes

Do not show fake transaction hashes.

Do not claim Gateway/Nanopayments/x402 settlement unless implemented and verified.

If a receipt is local or simulated for a development phase, label it clearly.

Do not present Nano as a generic budget dashboard.

Do not claim full helper-agent marketplace payouts unless the repo proves them.

## Success Criteria

- A normal judge understands what the agent spent and why.
- USDC budget and receipt states are visible.
- No fake payments or traction appear.
- The demo follows the build order in [lepton-dispatch-nano-build-order.md](lepton-dispatch-nano-build-order.md).
