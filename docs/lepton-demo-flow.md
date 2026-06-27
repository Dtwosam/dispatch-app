# Lepton Demo Flow

This is the planned Dispatch Nano judge demo.

## Demo Goal

Show that Dispatch can route a user-funded USDC budget through an AI agent, let the agent pay other agents/sources/tools, and show a visible payment trail.

## Demo Script

1. Open `/nano`.
2. Connect wallet.
3. Create a 1 USDC budget.
4. Ask the main agent to create a short research-backed brief.
5. Agent creates a spend plan.
6. Agent pays a source/tool/agent path.
7. Final brief appears.
8. Payment trail is visible.
9. User reviews the result.
10. Metrics update from the run.

## Demo Spend Plan

Budget: `1.00 USDC`

Planned spend:

- source unlock: `0.05 USDC`
- summarizer agent: `0.03 USDC`
- claim-check agent: `0.04 USDC`
- hook agent: `0.02 USDC`
- main agent earnings: remaining budget

## What Judges Should See

- the budget amount
- each spend intent
- each recipient type
- each amount
- proof state for each payment
- final output
- review state
- metrics based on real run data

## Honesty Notes

Do not show fake transaction hashes.

Do not claim Gateway/Nanopayments/x402 settlement unless implemented and verified.

If a receipt is local or simulated for a development phase, label it clearly.

## Success Criteria

- A normal judge understands what the agent spent and why.
- USDC budget and receipt states are visible.
- No fake payments or traction appear.
- The demo follows the build order in [lepton-dispatch-nano-build-order.md](lepton-dispatch-nano-build-order.md).
