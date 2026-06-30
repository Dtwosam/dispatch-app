# Dispatch Nano Phase 15C Build Order

Status: active source-of-truth for Phase 15C.

This document locks the build order for turning `/nano` into a premium proof-console interface.

Current base:
- Branch: lepton-phase-3b-recipient-wallets
- Local Phase 15B commit: 6c55d16 Unify Nano guided source payment flow
- Phase 15B is local and should not be pushed until Phase 15C is verified.

## Locked final interface direction

Final `/nano` structure:

1. Hero
2. General Nano economy stats
3. Focused Nano run console
4. Result + receipt payoff
5. Collapsed supporting details

Nano is not being removed. Existing Nano features must be recomposed into fewer clearer surfaces.

## Core Nano flow

User goal → agent decision → tiny USDC source/tool payment → Arc proof → unlocked source/tool value → final result → receipt trail

## Phase 15C build order

### 15C.0 — Local base lock

Confirm current local base before any work.

Required:

- `git status --short --branch`
- `git log -1 --oneline`

Expected local HEAD:

- `6c55d16 Unify Nano guided source payment flow`

Stop if unrelated dirty files exist.

### 15C.1 — Proof console blueprint + full UI/UX matrix

Type: docs-only.

Create:

- `docs/lepton-nano-phase15c-proof-console-blueprint.md`

Must include the full Nano UI/UX matrix:

- Product goal
- Target users
- User journey
- Information architecture
- Navigation
- Layout
- Visual hierarchy
- Typography
- Color system
- Spacing system
- Components
- Buttons/CTAs
- Forms
- Content/copy
- Interaction design
- Feedback states
- Accessibility
- Responsive design
- Performance
- Trust/credibility
- Data display
- Empty states
- Error states
- Onboarding
- Microcopy
- Motion
- Branding
- Icons/visuals
- Page structure
- UX writing for decisions
- Consistency
- Edge cases
- Security UX
- Conversion flow
- Testing/refinement
- Design system
- Developer handoff

No UI/code changes in 15C.1.

### 15C.2 — Hero + Nano economy stats

Goal:

Add a premium Nano economy stat strip under the hero.

Stats:

- USDC earned — 0.00 verified
- Agents paid — Verified proof only
- Sources unlocked — 1 starter path
- Receipts created — Real runs only
- Proof checks — Arc verified

Rules:

- no fake volume
- no fake payments
- no fake agent payouts
- no fake receipt count
- no fake proof attempts
- use real verified values only if currently supported by repo state

### 15C.3 — Nano run console shell

Goal:

Add one main `Nano run` console with four steps:

1. Goal
2. Source
3. Pay + proof
4. Result

Old sections may remain lower during this transition.

### 15C.4 — Move core flow into console

Goal:

Merge core Nano flow into the console.

Mapping:

- Goal/budget → Goal step
- Agent decision + source capsule + agent evaluation → Source step
- Spend approval + recipient wallet + Pay on Arc + Proof check → Pay + proof step
- Result preview + receipt action → Result step

Do not change payment/proof/wallet/backend logic.

### 15C.5 — Collapse supporting details

Move these into lower collapsed/details panels:

- How to test Nano
- What is live vs planned
- Run history
- Optional Dispatch handoff
- Technical receipt details
- Nano activity

Do not delete information. Recompose it.

### 15C.6 — Premium CSS/mobile/accessibility polish

Focus only on:

- spacing
- card dimensions
- stat strip layout
- console layout
- mobile stacking
- focus states
- contrast
- button hierarchy
- long wallet/tx/receipt wrapping
- accessibility

No product logic changes.

### 15C.7 — Full verification + preview QA

Required checks for implementation phases:

- `git diff --check`
- `node --test apps/web/src/ui-models.test.mjs`
- `node --test apps/web/src/chain-client.test.mjs`
- `npm --workspace apps/router run build`
- `npx tsx ./apps/router/tests/publicBaseUrl.test.ts`
- `npx tsx ./apps/router/tests/nanoArcProofService.test.ts`
- `npm --workspace apps/web run build`
- `npm --workspace apps/web run build:static`
- `git restore -- apps/web/.vercel-static`
- `git restore -- apps/web/.vercel-static/@modules`
- `git status --short --branch`

Preview deploy allowed only if needed:

- `npx vercel deploy --yes`

Production deploy is forbidden unless explicitly requested.

Forbidden:

- `npx vercel deploy --prod --yes`

## Permanent grounding rules

Every Phase 15C prompt must include:

1. Use repo/source docs as source of truth.
2. Keep prompts phase-specific.
3. Inspect git status before editing.
4. Stop on unrelated dirty files.
5. Do not touch backend/routes/contracts/Arc config/secrets/deploy config.
6. Do not change marketplace funding/release/review/dispute lifecycle.
7. Do not fake users, payments, earnings, receipts, tx hashes, source execution, Gateway/x402 activity, Circle Wallet activity, or traction.
8. Approved is not paid.
9. Local receipt is not paid with proof.
10. Pending/unavailable/rejected proof is not paid.
11. `Paid with proof` only appears after verified Arc proof.
12. Tx links only appear for valid verified Arc transaction hashes.
13. Source/result unlock only after verified proof.
14. Gateway/x402/Circle Wallets/Nanopayments remain planned-only unless actually implemented and verified.
15. Codex must report before commit/push.

## Active source-of-truth status

This document is active for Phase 15C and should be used alongside:

- `AGENTS.md`
- `docs/dispatch-source-of-truth.md`
- `docs/lepton-nano-winning-build-order.md`
- `docs/lepton-nano-source-payment-architecture.md`
- `docs/lepton-nano-phase15-ui-ux-audit.md`
