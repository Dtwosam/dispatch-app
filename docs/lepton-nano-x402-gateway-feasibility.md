# Dispatch Nano x402/Gateway Feasibility Spike

Phase: 14G - x402/Gateway Feasibility Spike

Status: docs-only spike. Keep x402/Gateway planned-next before submission.

## Decision

Do not implement a live x402/Gateway source endpoint before submission unless a later phase explicitly adds the full verified path.

Dispatch Nano should continue using the current live fallback:

> user approval -> Arc Testnet USDC transfer -> router Arc proof verification -> source capsule unlock -> receipt trail

x402/Gateway remains the right next direction, but the current repo does not yet include the seller endpoint, Gateway/x402 middleware, facilitator verification path, credentials/config, or receipt adapter needed to claim a real Gateway-backed source payment.

## Official Sources Reviewed

| Source | URL | Relevant takeaway for Nano |
| --- | --- | --- |
| Circle Agent Stack | https://developers.circle.com/agent-stack | Agent payments, wallets, x402 services, and Circle Skills are a strong fit for the Nano direction, but this repo does not yet wire Agent Stack into runtime payment execution. |
| Circle Gateway Nanopayments | https://developers.circle.com/gateway/nanopayments | Gateway/x402 can support tiny USDC pay-per-use flows for source/tool access. A real integration needs payment request handling, verification, and settlement semantics that Nano can represent honestly. |
| Circle Developer Docs index | https://developers.circle.com/llms.txt | Primary source index for future Circle implementation work. |
| Arc Docs index | https://docs.arc.network/llms.txt | Arc remains the current testnet rail for Nano's live USDC proof fallback. |
| Circle Arc Skill | https://raw.githubusercontent.com/circlefin/skills/master/plugins/circle/skills/use-arc/SKILL.md | Confirms Arc Testnet configuration references used by the current Arc proof path. |

## What x402/Gateway Could Add

x402/Gateway could make Nano feel more native to paid source/tool access:

- a source endpoint can answer with a payment requirement instead of unlocked content
- the agent can propose a tiny source/tool spend
- the user can approve the spend
- payment proof can unlock the source response
- the receipt trail can show source access as a real paid API interaction
- Gateway could eventually support higher-frequency tiny payments without treating each source unlock as a standalone browser-wallet transfer

That would strengthen the Nano story:

> AI agents pay sources/tools per use, then show the receipt trail behind the final result.

## What The Repo Already Supports

Implemented today:

- `/nano` source-payment flow
- budget drafts and wallet-scoped Nano records
- spend intents and user approval
- recipient wallet support for the Source Unlock spend
- browser-wallet Arc Testnet USDC transfer via `apps/web/src/chain-client.js`
- router-side Arc transaction proof verification via `apps/router/src/routes/nanoRoutes.ts`
- proof-gated source capsule unlock
- proof-gated result contribution
- receipt trail and shareable receipt view

Honest proof behavior already exists:

- approved is not paid
- local proof is not paid
- pending/unavailable/rejected proof is not paid
- Gateway/x402 metadata is not paid
- "Paid with proof" appears only after verified Arc Testnet USDC proof
- transaction links appear only for valid verified Arc transaction hashes

## What A Real Tiny x402/Gateway Endpoint Would Require

A safe implementation would need all of the following:

1. A real hosted source endpoint.
   The endpoint must protect actual source/tool content and return locked content only after payment verification.

2. x402/Gateway payment handling.
   Nano needs a concrete request/response flow for payment requirements, payment submission, and verification.

3. Clear credentials/config boundary.
   If Circle/Gateway credentials, wallet IDs, API keys, facilitator URLs, or account configuration are required, they must be configured through safe env handling and never committed.

4. A receipt adapter.
   Nano needs a distinct proof model for Gateway/x402 that does not reuse Arc transaction proof labels unless an actual Arc transaction hash is verified.

5. Local and hosted tests.
   The endpoint must be testable without faking paid source access, fake settlement, fake x402 requests, or fake Gateway receipts.

6. UI honesty updates.
   The UI must keep Gateway/x402 planned-only until the endpoint is live and verified. Once live, it must distinguish Gateway/x402 proof from Arc transaction proof.

7. No weakening of Arc proof.
   The current Arc proof path must remain the live fallback and must continue gating "Paid with proof."

## Safety Assessment

Implementation is not safe before submission under the Phase 14G rules.

Reasons:

- The current repo does not contain a real x402-protected source endpoint.
- The current proof service verifies Arc Testnet transactions, not Gateway/x402 settlement.
- A real Gateway/x402 path may require credentials, hosted endpoint configuration, or facilitator/payment middleware that is not present in the repo.
- Without a full verified payment path, any "paid source unlocked by x402/Gateway" UI would risk faking source access or payment proof.
- Adding a partial endpoint would create a second payment story close to submission and could confuse judges unless it is fully verified.

## Recommendation

Keep x402/Gateway planned-next for submission.

Use the current Arc Testnet USDC proof flow as the live demo:

1. Create a Nano run.
2. Approve the Source Unlock spend.
3. Pay the recipient wallet on Arc Testnet.
4. Verify the real Arc transaction hash.
5. Unlock the Dispatch-hosted starter source capsule.
6. Show the result contribution and receipt trail.

This is safer because it is already implemented, testable, and aligned with the hard proof rule:

> Do not mark anything paid without verified Arc proof.

## Future Phase 15 Implementation Path

If x402/Gateway is implemented after submission, use this sequence:

1. Re-read Circle Gateway, Nanopayments, x402, and Agent Stack docs.
2. Add an isolated `nano-source` endpoint that serves one small source capsule.
3. Add x402/Gateway payment requirement handling for that endpoint.
4. Add a router-side Gateway/x402 proof adapter separate from Arc proof verification.
5. Add shared schema fields for Gateway/x402 proof state without labeling it as Arc proof.
6. Add tests proving local/pending/rejected Gateway/x402 states do not unlock paid status.
7. Add one hosted QA path with real credentials configured outside the repo.
8. Update `/nano` copy only after a real verified source unlock works end-to-end.

## Future Acceptance Checklist

Before claiming x402/Gateway is live:

- [ ] A real source endpoint exists.
- [ ] The endpoint is payment-gated.
- [ ] The payment request is generated by real x402/Gateway-compatible logic.
- [ ] The user or agent can complete payment without fake proof.
- [ ] The backend verifies the payment state from the proper source.
- [ ] The source capsule unlocks only after verified proof.
- [ ] The receipt trail distinguishes Arc proof from Gateway/x402 proof.
- [ ] No fake tx hash, payment, receipt, user, source access, or settlement is seeded.
- [ ] Gateway/x402 tests prove unverified states are not paid.
- [ ] Arc Testnet USDC proof remains available as fallback.

## Claims To Keep Planned-Only

Do not claim yet:

- x402 is live
- Gateway is settling Nano payments
- Gateway receipts are verified
- Nanopayments are live
- Circle Wallets custody is active
- external paid source access is implemented
- source/tool execution happened outside the Dispatch-hosted starter capsule

## Phase 14G Outcome

Docs-only. No code changes.

Nano remains honest and submission-safe:

- live path: Arc Testnet USDC proof
- planned-next path: x402/Gateway source endpoint
- proof rule: paid only after verified proof
