# Dispatch Nano Final Submission Package

## Product

Dispatch Nano

## One-Line Pitch

Dispatch Nano lets AI agents request tiny USDC source payments, get user approval, verify Arc proof, unlock the source-backed result, and show the receipt trail.

## Problem

AI agents increasingly need paid sources and tools, but users cannot easily see what the agent wanted to pay for, who approved it, whether payment happened, and whether proof unlocked the result.

## Solution

Nano turns source/tool access into a proof-gated payment flow inside Dispatch. A user gives the agent a goal and budget, the agent requests a source unlock, the user approves the spend, Arc proof verifies payment, and the source-backed result unlocks only after proof.

## Live Demo Links

- Latest preview: https://dispatch-68rsav7s4-dtwoflicks-2878s-projects.vercel.app/nano
- Router: https://dispatch-router.onrender.com
- Metrics endpoint: https://dispatch-router.onrender.com/api/nano/metrics
- Production site: https://dispatch-arc.vercel.app

Production deploy has not been updated for this final preview unless explicitly confirmed later. Use the latest preview link above for judging the current Nano interface.

## Implemented Now

- `/nano` proof console for the Nano source-payment flow.
- Public Nano metrics from the router read model.
- Source agent selector using the five real built-in Dispatch agents.
- User goal and Nano budget flow.
- Agent source unlock request.
- User approval state.
- Arc proof verification state.
- Proof-gated paid and unlocked labels.
- Receipt trail.
- Run history and Continue run where wallet-scoped router activity is available.
- Shareable receipt route through `/nano?receipt=<budgetId>` when a real budget ID is available to that wallet.
- Honest live, starter, and planned labels.

## Planned Next

- Circle Gateway.
- x402.
- Circle Wallets.
- Live agent-to-agent payouts.
- Broader source/tool marketplace.
- Production settlement expansion.

These are planned-only unless later implementation and verification prove otherwise.

## What Judges Can Verify

- Public Nano stats appear before wallet connection.
- A wallet-connected Nano run can be created.
- The selected Dispatch agent requests a source unlock.
- Approval is not payment.
- Payment/proof state controls source and result unlock.
- The public metrics endpoint returns real records from the deployed router environment.
- Nano does not show a fake paid state without verified Arc proof.

## Current Public Metrics Example

As of last check, the live router metrics endpoint returned:

- `verifiedUsdc`: `0.29`
- `sourceRequestCount`: `13`
- `receiptCount`: `19`
- `verifiedUnlockCount`: `10`
- `dispatchAgentCount`: `5`
- `source`: `router-read-model`

Judges should verify current values directly at https://dispatch-router.onrender.com/api/nano/metrics because these numbers reflect records stored in the deployed router environment.

## Submission Risks And Limitations

- The preview branch must remain deployed for judges to see the latest Nano interface.
- The Render router must remain awake and available.
- Gateway, x402, Circle Wallets, and Nanopayments are planned unless implemented and verified later.
- Public metrics reflect records stored in the deployed router environment, not claimed production traction.
- Production may not include the latest Nano preview unless production deploy is explicitly requested and completed.
