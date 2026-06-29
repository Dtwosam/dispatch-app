# Dispatch Nano User Testing Sprint

## Goal

Run a short, honest user-testing sprint for Dispatch Nano before submission polish.

The sprint should test whether real people understand the Nano flow:

> user goal -> agent evaluation -> tiny USDC source/tool payment -> Arc proof -> unlocked source capsule -> result contribution -> receipt trail

This is not a traction announcement. It is a way to collect real evidence, friction, and proof-backed usage notes.

## Target Testers

Target 5 to 10 real people.

Good testers:

- people who have used a wallet before
- builders who understand AI agents
- non-crypto users who can judge whether the flow is understandable
- hackathon peers who can follow a short test script

Do not count internal retries, fake accounts, invented users, or repeated runs by the same person as separate testers.

## What Testers Should Try

Ask each tester to open `/nano` and try the current flow:

1. Explain what they think Nano does after 60 seconds.
2. Connect a wallet if comfortable.
3. Create a Nano budget.
4. Review the agent evaluation.
5. Review the locked source capsule.
6. Approve the source spend.
7. Attempt a test USDC source payment on Arc only if comfortable.
8. Verify Arc proof only if they have a real transaction hash.
9. Review whether the source capsule unlocks.
10. Open the receipt trail.

If a tester does not want to connect a wallet or send test USDC, record that honestly.

## What To Record

Record only what happened.

Required fields:

- tester label, such as `Tester 01`
- date
- device/browser
- understood Nano in under 60 seconds: yes/no/unclear
- created budget: yes/no
- approved source spend: yes/no
- attempted Arc test USDC payment: yes/no
- verified Arc proof: yes/no
- opened receipt trail: yes/no
- friction notes
- tester quote, only if real and permission was given
- evidence link, only if a real receipt or screenshot exists

## What Counts As Real Evidence

Real evidence can include:

- a tester-created Nano budget visible in the app
- a tester-approved source spend visible in the app
- a real Arc Testnet transaction hash
- a verified Arc proof receipt
- a screenshot from the tester's session
- a direct tester quote with permission
- a written friction note from the session

Evidence must not be inferred from intent. A tester saying they would have paid is not a payment attempt.

## What Must Not Be Claimed

Do not claim:

- fake users
- fake tester count
- fake payment attempts
- fake verified receipts
- fake quotes
- fake traction
- fake payments or transaction hashes
- production launch
- live x402, Gateway, Circle Wallets, or Nanopayments

Gateway, x402, Circle Wallets, and Nanopayments remain planned-only unless actually implemented and verified.

## Sprint Acceptance Checklist

- 5 to 10 real people were asked to test Nano.
- Each tester's outcome was recorded honestly.
- Wallet/payment attempts were optional.
- No tester was counted twice as a new user.
- Verified receipts were counted only when Arc proof verified.
- Quotes were recorded only with permission.
- Friction was preserved instead of edited into marketing copy.

## Recommended Summary Format

Use conservative language:

> We ran a small Nano usability sprint with X real testers. Y understood the core flow in under 60 seconds. Z created a budget. N attempted an Arc Testnet source payment. M produced verified Arc proof. Main friction: ...

If no verified proof exists, say so directly.

