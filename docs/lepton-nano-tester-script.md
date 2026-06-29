# Dispatch Nano Tester Script

## Purpose

Use this script to test whether Dispatch Nano is understandable and usable by a real person.

Keep the session short. Do not coach the tester through every meaning unless they get stuck.

## Opening Prompt

Say:

> Please open Dispatch Nano and spend 60 seconds reading the page. Then tell me what you think it does.

Record whether they understood the core idea:

> An AI agent asks to pay a tiny USDC amount for a source/tool, the user approves, Arc proof verifies payment, and the result unlocks only after proof.

Mark the result as:

- yes
- no
- unclear

## Test Path

Ask the tester to try these steps:

1. Open `/nano`.
2. Read the Judge test path panel.
3. Create or select a Nano budget.
4. Review the agent evaluation.
5. Confirm that Source Unlock is the only payable option.
6. Review the locked Dispatch-hosted starter source capsule.
7. Approve the source spend.
8. Add a recipient wallet if needed.
9. If comfortable, pay the source on Arc Testnet.
10. If a real transaction hash exists, verify Arc proof.
11. Confirm whether the source capsule unlocked.
12. Open the receipt trail.
13. Explain what counts as paid.

Do not pressure the tester to send test USDC. Wallet and payment steps are optional.

## Questions To Ask

Ask these after the tester finishes or stops:

1. What did you think Nano was for?
2. What did the agent decide to pay for?
3. Did you understand that approved is not paid?
4. Did you understand what unlocks the source capsule?
5. Did you know what to click next?
6. What felt confusing?
7. What would make the page easier to trust?
8. Would you be comfortable trying a test USDC payment? Why or why not?

## Observation Checklist

Record:

- understood Nano in under 60 seconds
- created budget
- reviewed agent evaluation
- found the source capsule
- understood locked vs unlocked
- approved source spend
- attempted test USDC payment
- verified proof
- opened receipt trail
- identified Gateway/x402 as planned-only
- identified paid with proof as verified Arc proof only

## Evidence Rules

Only mark a step complete if the tester actually did it.

Do not mark:

- "payment attempted" unless the tester tried to send test USDC
- "proof verified" unless the app verified a real Arc proof
- "paid with proof" unless verified Arc proof exists
- "understood in 60 seconds" unless they could explain the core flow in their own words

## Closing Prompt

Say:

> Thank you. I am recording friction honestly, so confusion is useful. Nothing will be counted as payment, proof, or traction unless it actually happened.

