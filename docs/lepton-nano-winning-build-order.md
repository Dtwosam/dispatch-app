# Dispatch Nano Winning Build Order

## 1. Active Status

- Active branch: `lepton-phase-3b-recipient-wallets`
- Latest pushed commit at time of anchor: `2c2c47c Add Nano Dispatch task handoff`
- Production deploy: not approved / not deployed
- Current state: Nano has source-payment flow, Arc proof verification, budget guardrails, recipient registry, result contribution layer, shareable receipt/proof view, Dispatch task handoff, run history, and Continue run.

## 2. Locked Product Direction

Dispatch Nano is an AI agent source-payment layer for Dispatch.

One-line product:

> Dispatch Nano lets AI agents request tiny USDC payments for sources/tools, get user approval, pay on Arc, verify proof, and show how the paid source improved the final result.

Core flow:

> User goal → agent decision → tiny USDC source/tool payment → Arc proof → unlocked source/tool value → final result → receipt trail.

Nano is not:

- a generic budget dashboard
- a fake helper-agent marketplace
- a full autonomous agent economy yet
- a production settlement system
- a full source marketplace
- a fake x402/Gateway demo

Winning direction:

Nano should become the clearest product for AI agents paying sources/tools with tiny USDC payments, then proving payment before using the source in the result.

## 3. Why The Roadmap Changed

After reviewing previous winners from the same hackathon ecosystem, the roadmap was expanded because winning apps tended to have:

- clear one-line product story
- strong agent decision-making
- money/proof as the core product action
- judge-friendly demo path
- visible honest traction or testing
- strong docs/architecture
- proof/receipt/accountability layer

Nano should now lean harder into:

- agent evaluation
- source/citation payment framing
- source capsule unlock
- judge command center
- real testing/traction
- one perfect shareable receipt
- optional x402/Gateway feasibility only if real and testable
- final full UI/UX unification

Nano should not copy Mimir or Precall directly.

Mimir lesson:

- clear protocol story
- agent decision had economic consequence
- proof and settlement were visible
- docs/architecture made it feel serious

Precall lesson:

- very clear paid-unlock mechanic
- judge-friendly demo path
- visible proof/metrics/reputation
- easy to understand quickly

Nano winning angle:

- agent compares paid resources
- chooses what is worth paying for
- user approves the spend
- Arc verifies USDC payment
- source capsule unlocks only after proof
- result shows the source contribution
- receipt proves what happened
- user testing proves real people understood/tried it

## 4. Completed Product Capabilities

Current completed capabilities:

- `/nano` source-payment flow
- wallet-connected Nano budget creation
- controlled spend plan
- source unlock state model
- recipient wallet validation
- Pay source on Arc action
- Arc proof verification path
- proof-gated paid labels
- honest activity metrics
- run history
- Continue run
- multi-source/tool spend plan
- budget guardrails
- source/tool recipient registry lite
- result & source contribution layer
- shareable receipt/proof view using `/nano?receipt=<budgetId>`
- Dispatch task handoff local preview

Recent commits:

- `2c2c47c Add Nano Dispatch task handoff`
- `42ce4b8 Add Nano shareable receipt view`
- `8507e61 Add Nano source contribution result layer`
- `f21a36d Add Nano recipient registry`
- `06b3428 Add Nano budget guardrails`
- `e97ec0f Add Nano multi-source spend plan`
- `198e571 Add Nano run history and continue run flow`
- `866eb46 Add honest Nano activity metrics`
- `e410927 Harden Nano Arc source payment proof path`
- `e5e5629 Add Nano source unlock state model`

## 5. Live / Starter / Planned Claim Rules

Live-now claims are allowed only if repo behavior supports them:

- Arc Testnet USDC payment proof flow
- user-approved source spend
- recipient wallet validation
- Arc payment proof verification
- proof-gated paid labels
- payment trail
- result contribution unlock after verified proof
- shareable receipt/proof view
- local Dispatch task handoff preview
- run history / Continue run

Starter-only claims:

- Dispatch-hosted starter source capsule
- starter source insight
- starter agent decision if controlled
- planned source/tool rows
- deterministic task handoff preview
- session/local metrics if not backend-backed

Planned-only claims unless actually implemented and verified:

- Gateway nanopayments
- x402 paid source access
- Circle Wallet custody
- Circle Agent Stack runtime
- real external source marketplace
- real tool/API execution marketplace
- creator payouts
- agent-to-agent payouts
- public proof explorer
- production usage dashboard

## 6. Data Honesty Rules

Hard rules:

- no fake payments
- no fake tx hashes
- no fake balances
- no fake users
- no fake testers
- no fake ratings
- no fake reviews
- no fake earnings
- no fake agent-to-agent payouts
- no fake creator payouts
- no fake source/tool execution
- no fake source/tool payment proof
- no fake Gateway settlement
- no fake x402 requests
- no fake production launch
- no fake traction

Payment/proof rules:

- Approved is not paid.
- Local receipt is not paid with proof.
- Pending/unavailable proof is not paid.
- Rejected proof is not paid.
- “Paid with proof” only appears after verified Arc proof.
- Tx links appear only for valid verified Arc transaction hashes.
- Result contribution unlocks only after verified proof.
- Planned/starter rows must never appear as live paid rows.

## 7. Active Build Order Going Forward

This is the active post-Phase13 Nano build order.

### Phase 14A — Agent Evaluation Panel

Goal:

Make the agent feel like it is making a real cost-vs-value decision.

Add:

- agent evaluation panel
- source/tool alternatives
- chosen/skipped/planned states
- cost/value reason
- budget impact
- cache/refetch note if useful
- “why this source is worth paying for”
- “why this option is skipped for now”

Required behavior:

- Source Unlock can be chosen/payable.
- Summary Formatter and Claim-check Tool can remain planned/starter.
- Skipped options must not get pay buttons.
- Do not fake dynamic autonomy if the evaluation is controlled/starter.
- Label controlled logic honestly.

Success:

A judge should understand why the agent chose to pay for a source.

Likely files:

- `apps/web/src/ui-models.js`
- `apps/web/src/ui-models.test.mjs`
- `apps/web/src/app.js`
- `apps/web/src/styles.css`

### Phase 14B — Source Capsule Unlock

Goal:

Make the paid source feel visible and real without faking external source access.

Add:

- Dispatch-hosted starter source capsule
- locked state before proof
- unlocked state after verified Arc proof
- source capsule summary
- source contribution used by result
- source capsule receipt link

Required behavior:

- Before proof: source capsule locked.
- After verified proof: source capsule unlocked.
- If it is not a real external source, label it as Dispatch-hosted starter source capsule.
- Do not claim external paid source access unless implemented.

Success:

The user sees locked source → pay → verified proof → source unlock → better result.

### Phase 14C — Judge Command Center

Goal:

Make judges understand Nano in under 60 seconds.

Add:

- `/nano/demo` route if simple, or a clear “Judge test path” panel if routing is risky
- what Nano is
- what is live
- what is starter
- what is planned
- how to test the flow
- latest/shareable receipt example if available
- proof-state explanation
- “what counts as paid”
- “what to click”

Required behavior:

- No fake demo data.
- If using sample data, label it as sample/starter.
- If linking to a real receipt, it must be real and not invented.
- Must not expose unrelated wallet history.

Success:

A judge can open the page and know exactly how to review Nano.

### Phase 14D — Real Testing / Traction Kit

Goal:

Prepare for real user testing and honest traction recording.

Add docs:

- `docs/lepton-nano-user-testing-sprint.md`
- `docs/lepton-nano-tester-script.md`
- `docs/lepton-nano-feedback-log-template.md`

Optional UI:

- small user testing checklist only if it does not clutter `/nano`

Testing target:

- 5 to 10 real people open `/nano`
- at least a few create budgets
- at least a few attempt test USDC source payment if comfortable
- record honest friction
- record whether users understood Nano in under 60 seconds

Do not:

- fake users
- fake tester count
- fake payment attempts
- fake verified receipts
- fake quotes
- fake traction

Success:

Nano has honest usage/testing evidence before submission polish.

### Phase 14E — Source/Citation Payment Positioning

Goal:

Sharpen public copy so Nano is easy to understand.

Positioning:

- “Nano is the receipt layer for AI agents paying sources/tools.”
- “Nano lets AI agents pay for source-backed work with tiny USDC payments.”
- “The agent pays for a source only after the user approves, and the result unlocks only after Arc proof verifies payment.”

Update:

- `/nano` intro copy
- `README.md` / `SUBMISSION.md` copy if present
- relevant docs
- demo copy

Do not:

- call Nano a generic budget dashboard
- overclaim external source access
- overclaim x402/Gateway
- use public “judge run” wording if the current UI has moved away from it

Success:

A non-technical person can explain Nano after reading the first screen.

### Phase 14F — One Perfect Shareable Receipt Example

Goal:

Create one clean judge-inspectable example receipt flow.

Add:

- one perfect receipt path or seeded starter example only if honest
- clear demo instructions for producing a receipt
- receipt explanation in `/nano/demo` or docs
- “View receipt” path from result/task handoff remains obvious

Required behavior:

- If the receipt is real, show it as real.
- If it is sample/starter, label it as sample/starter.
- Never invent tx hash.
- Never show fake verified proof.

Success:

A judge can inspect a receipt and understand:

goal → agent decision → approved spend → Arc proof → source unlock → result contribution.

### Phase 14G — x402/Gateway Feasibility Spike

Goal:

Investigate whether one tiny real x402/Gateway-style source endpoint can be implemented safely before submission.

This phase starts as research/spike, not assumed implementation.

Allowed:

- read official Circle docs/source docs
- inspect repo payment architecture
- write feasibility doc
- implement only if real, testable, and source-backed
- keep Arc USDC proof as the live fallback path

Do not:

- fake x402
- fake Gateway
- fake nanopayments
- fake source access
- break current Arc proof flow
- introduce secrets or private keys
- touch production settlement

Outcome:

One of:

1. Implement a tiny verified x402/Gateway source endpoint if feasible and safe.
2. Document as planned-next if not feasible before submission.

Success:

Nano either gains one real Circle-specific paid source path or has an honest planned-next explanation.

### Phase 15 — Full Nano UI/UX Unification Review

Goal:

Make Nano feel like one simple product instead of separate sections.

Review the full `/nano` experience:

- hierarchy
- spacing
- copy
- section order
- state labels
- button states
- mobile layout
- receipt/result/handoff flow
- live/starter/planned labels
- proof-state language
- “10-year-old clarity”

Required outcome:

A user should understand:

1. What the agent is trying to do.
2. What it wants to pay for.
3. Why it wants to pay.
4. What the user must approve.
5. What happens on Arc.
6. Why proof matters.
7. What unlocks after proof.
8. Where the receipt is.
9. What is live versus planned.

Do not:

- broad Dispatch redesign
- homepage overhaul unless explicitly requested
- change marketplace lifecycle
- fake polish with unsupported claims

Success:

Nano looks and reads like one premium product.

### Phase 16 — Submission Polish

Goal:

Prepare final Lepton hackathon submission package.

Needs:

- public GitHub repo ready
- final live/preview product link
- final demo script
- sub-3-minute video plan
- what is live vs starter vs planned
- traction/testing answer
- Circle/Arc usage answer
- judge run instructions
- limitations section
- screenshots if useful
- final README/SUBMISSION cleanup

Video flow:

1. Open `/nano` or `/nano/demo`
2. Explain Nano in one sentence
3. Show goal
4. Show agent evaluation
5. Show source capsule locked
6. Create/select budget
7. Approve source spend
8. Pay on Arc
9. Verify proof
10. Unlock source capsule
11. Show result contribution
12. Open shareable receipt
13. Show Dispatch task handoff
14. Explain what is live/starter/planned

Success:

Judges can understand Nano without the builder present.

## 8. Required Checks By Phase Type

Docs-only phases:

```powershell
git diff --check
npm --workspace apps/web run build
git status --short --branch
```

Frontend/model phases:

```powershell
git diff --check
node --test apps/web/src/ui-models.test.mjs
node --test apps/web/src/chain-client.test.mjs
npm --workspace apps/router run build
npx tsx ./apps/router/tests/publicBaseUrl.test.ts
npx tsx ./apps/router/tests/nanoArcProofService.test.ts
npm --workspace apps/web run build
npm --workspace apps/web run build:static
git restore -- apps/web/.vercel-static
git status --short --branch
```

Backend-touched phases:

- run frontend checks above
- run relevant router tests
- run any new/updated backend tests
- confirm no existing task lifecycle/settlement changes unless explicitly scoped

Preview phases:

- `npx vercel deploy --yes` only for preview
- no production deploy unless user explicitly says production
- manual QA on `/nano?apiBase=https://dispatch-router.onrender.com`
- test wallet-connected flow if possible

## 9. Stop Conditions

Stop and report if:

- existing task lifecycle must change
- existing settlement/release/dispute flow would be affected
- contracts must change
- secrets/private keys are required
- Gateway/x402 cannot be verified but implementation claims require them
- production deploy would be needed
- payment proof cannot be represented honestly
- UI requires fake users/usage/payments
- `.vercel-static` remains dirty after static build and cannot be restored
- tests fail

## 10. Files Not To Touch Unless Explicitly Scoped

Do not touch unless specifically requested:

- contracts
- existing marketplace settlement logic
- existing task funding logic
- existing review/release/dispute lifecycle
- wallet funding behavior outside Nano scope
- production deployment config
- private env files
- mainnet settings

## 11. ChatGPT/Codex Operating Rules

Future ChatGPT prompts must:

- cite/source from this document and current Nano source docs
- keep prompts phase-specific
- include hard honesty rules
- include stop conditions
- include required checks
- avoid giant multi-phase implementation prompts
- ask Codex for final report before commit/push
- avoid production deploy unless explicitly requested

Future Codex work must:

- inspect status before editing
- stop on unexpected dirty files
- keep changes scoped to the phase
- keep Gateway/x402 planned-only unless actually implemented and verified
- keep planned/starter rows visibly planned/starter
- never mark anything paid without verified proof
- run required checks
- restore `.vercel-static` after static build
- report files changed, tests run, manual QA status, production deploy status, and risks

## 12. Final Locked Direction

Dispatch Nano should win by being the clearest AI source-payment product:

> The agent compares paid resources, chooses what is worth paying for, asks the user to approve a tiny USDC spend, pays on Arc, verifies proof, unlocks the source-backed result, and gives the judge a shareable receipt.

This is the active roadmap unless the user explicitly changes it.
