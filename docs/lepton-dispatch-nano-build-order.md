# Lepton Dispatch Nano Build Order

Future Codex work must follow this build order and must not skip phases unless the user explicitly requests it.

## Active Nano Direction

Dispatch Nano is now documented as AI agent source/tool unlock with Arc USDC proof.

The source of truth for the active Nano direction is [lepton-nano-source-payment-architecture.md](lepton-nano-source-payment-architecture.md).

Budget, spend intent, and receipt models remain implementation architecture. Do not present Nano as a generic budget dashboard.

Current source-payment build order:

- Phase 0: Stabilize current Nano UX
- Phase 1: Add this source-of-truth doc
- Phase 2: Source Payment Judge Run UI
- Phase 3: Source Unlock State Model
- Phase 4: Real Arc Source Payment Path
- Phase 5: Honest usage/traction surface
- Phase 6: Preview deployment
- Phase 7: User testing sprint
- Phase 8: Submission polish

Do not claim Gateway/x402, full agent-to-agent payouts, a real source marketplace, or production traction until the repo proves them.

## Phase 0 - Story/source/docs cleanup

Goal:

- make Arc/Circle/USDC and Dispatch Nano the active product story
- remove old active positioning from current-facing docs
- create source-backed Nano planning docs
- keep source/tool unlock with Arc proof as the active Nano product story

Allowed scope:

- README
- env comments
- AGENTS guidance
- docs only

Files likely changed:

- `README.md`
- `.env.example`
- `AGENTS.md`
- `docs/dispatch-source-of-truth.md`
- `docs/arc-circle-sources.md`
- `docs/circle-tool-usage.md`
- `docs/lepton-dispatch-nano-spec.md`
- `docs/lepton-demo-flow.md`
- `docs/lepton-judging-alignment.md`
- `docs/lepton-dispatch-nano-build-order.md`
- `docs/lepton-nano-source-payment-architecture.md`

Hard locks:

- no backend routes
- no contracts
- no wallet funding logic
- no settlement logic
- no task lifecycle logic
- no Arc config changes beyond docs/env example comments
- no private keys or secrets
- no production deploy

Acceptance checklist:

- source-of-truth updated
- official Arc/Circle sources listed
- Nano spec created
- Nano source-payment architecture created
- build order created
- README points to current docs
- no fake integration claims

Required checks:

- `git diff --check`
- `npm --workspace apps/web run build`

Stop conditions:

- dirty unrelated working tree
- required docs missing and scope unclear
- code references look risky to remove

What must not be touched:

- runtime code
- backend API behavior
- contracts
- wallet/payment/review logic

## Phase 1 - Nano backend/data model/API

Goal:

- add Nano data structures and API surfaces for budget, source/tool spend intents, receipts, and run state

Allowed scope:

- schemas
- router service modules
- tests
- storage/read-model extensions
- route handlers for Nano only

Files likely changed:

- `packages/shared/src/schemas.ts`
- `apps/router/src/server.ts`
- new Nano service under `apps/router/src/services/`
- router tests

Hard locks:

- do not change existing task lifecycle
- do not change existing settlement logic
- do not change wallet funding behavior
- do not change contracts

Acceptance checklist:

- budget schema
- spend intent schema
- receipt schema
- Nano API route contracts
- honest proof states
- tests for empty/loading/failure cases

Required checks:

- router/shared tests
- web typecheck if shared types affect frontend

Stop conditions:

- API shape requires contract changes
- payment proof cannot be represented honestly
- existing task lifecycle would be altered
- source/tool unlock would require fake proof or fake recipients

What must not be touched:

- existing task market behavior
- existing review/release/dispute behavior

## Phase 2 - Nano frontend/UI flow

Goal:

- create `/nano` UI flow for judge run intro, goal, budget, agent decision, source unlock, approval, recipient wallet, Pay on Arc, proof gate, result preview, and payment trail

Allowed scope:

- frontend route
- frontend copy
- Nano-specific CSS
- local section-level loading/error states

Files likely changed:

- `apps/web/src/app.js`
- `apps/web/src/app-config.js`
- `apps/web/src/app-ui.js`
- `apps/web/src/styles.css`
- static build output after build

Hard locks:

- do not redesign existing pages
- do not change wallet handlers
- do not fake payment state

Acceptance checklist:

- `/nano` route
- wallet-required state
- 1 USDC budget UI
- source/tool unlock spend plan UI
- visible receipt trail
- honest proof labels
- mobile-safe flow

Required checks:

- web tests
- typecheck
- web build
- static build if requested

Stop conditions:

- UI needs unsupported payment claims
- shared wallet behavior would need changes
- Nano drifts into a generic budget dashboard

What must not be touched:

- existing marketplace routes except nav link addition if requested
- existing funding/release logic

## Phase 3 - Arc/Circle payment proof

Goal:

- connect Nano source/tool spend receipts to real Arc/Circle payment proof where feasible

Allowed scope:

- Nano payment adapter
- proof verification
- receipt proof state
- Circle/Gateway/x402 integration if selected and source-backed

Files likely changed:

- new payment service/adapter files
- `.env.example`
- Nano backend tests
- Nano frontend receipt rendering

Hard locks:

- do not change existing task funding contracts
- do not invent addresses
- do not hardcode secrets
- do not claim mainnet

Acceptance checklist:

- real proof state
- no fake tx hashes
- invalid/missing proof fallback
- source-backed Circle/Arc implementation notes
- tests for failure/unavailable paths
- proof-gated paid label only after valid proof

Required checks:

- payment adapter tests
- web/router builds
- `git diff --check`

Stop conditions:

- Circle credentials unavailable
- Gateway/x402 path cannot be verified
- integration requires existing settlement logic changes

What must not be touched:

- existing task settlement
- existing review/release logic
- private keys/env secrets

## Phase 4 - Review/reputation/traction metrics

Goal:

- add honest Nano source-payment metrics and connect reviewed Nano work to reputation only where supported

Allowed scope:

- read-model metrics
- dashboard Nano section if requested
- review state display
- tests

Files likely changed:

- router read-model services
- frontend dashboard/Nano route
- shared schemas

Hard locks:

- no fake traction
- no fake earnings
- no fake ratings/reviews
- no reputation updates without supported data

Acceptance checklist:

- metrics explain their source
- empty states for no runs
- real receipt counts only
- review state is clear

Required checks:

- relevant unit tests
- web build
- router build/test

Stop conditions:

- metrics require fake or inferred production volume
- review state conflicts with existing lifecycle

What must not be touched:

- existing dashboard calculations unless explicitly scoped
- existing settlement calculations

## Phase 5 - Demo polish/testing/submission package

Goal:

- prepare the Lepton submission package with a clear judge path and verified claims

Allowed scope:

- demo docs
- screenshots
- smoke tests
- local preview instructions
- final copy polish

Files likely changed:

- README
- docs
- frontend copy
- test scripts if needed

Hard locks:

- no production deploy unless explicitly requested
- no fake payments or tx hashes
- no last-minute logic rewrites

Acceptance checklist:

- judge script works
- claims match repo behavior
- checks pass
- deployment status is explicit
- remaining limitations are documented

Required checks:

- full requested app checks
- local preview
- `git diff --check`

Stop conditions:

- demo depends on unavailable credentials
- payment proof cannot be verified
- production deploy not explicitly requested

What must not be touched:

- contracts
- settlement logic
- wallet funding logic
- private keys/secrets
