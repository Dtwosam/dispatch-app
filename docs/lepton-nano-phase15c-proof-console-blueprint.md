# Dispatch Nano Phase 15C Proof Console Blueprint

Phase: 15C.1 - Proof console blueprint + full UI/UX matrix

Status: blueprint only. No runtime, backend, contract, wallet, payment, Arc config, settlement, deploy, or secret changes.

## 1. Blueprint Verdict

Dispatch Nano should become a premium proof console, not a longer sequence of separate cards.

The next implementation passes should recompose the existing `/nano` features into fewer visible surfaces:

1. Hero
2. Nano economy stats
3. Focused Nano run console
4. Result + receipt payoff
5. Collapsed supporting details

This does not delete Nano features. It moves current features into clearer layers so a first-time user can understand the core source-payment proof loop in under 60 seconds.

Core flow:

`User goal -> agent decision -> tiny USDC source/tool payment -> Arc proof -> unlocked source/tool value -> final result -> receipt trail`

Nano remains an AI agent source-payment layer for Dispatch. It is not a generic budget dashboard, full autonomous agent economy, fake helper-agent marketplace, fake x402/Gateway demo, production settlement system, or fake traction page.

## 2. TODO Checklist

- [x] Confirm branch, HEAD, and clean scoped state.
- [x] Read `AGENTS.md`.
- [x] Read Phase 15C build order and Nano source docs.
- [x] Inspect current `/nano` render/model/test/CSS structure.
- [x] Map current visible sections into final proof-console structure.
- [x] Define full UI/UX matrix.
- [x] Define Phase 15C.2 through 15C.7 handoff.
- [ ] Run docs-only checks after writing this file.

## 3. Source Grounding

Read before writing this blueprint:

- `AGENTS.md`
- `docs/lepton-nano-phase15c-build-order.md`
- `docs/dispatch-source-of-truth.md`
- `docs/lepton-nano-winning-build-order.md`
- `docs/lepton-nano-source-payment-architecture.md`
- `docs/lepton-demo-flow.md`
- `docs/lepton-nano-x402-gateway-feasibility.md`
- `docs/lepton-nano-phase15-ui-ux-audit.md`
- `apps/web/src/app.js`
- `apps/web/src/styles.css`
- `apps/web/src/ui-models.js`
- `apps/web/src/ui-models.test.mjs`

Current implementation anchors:

- Main route render: `renderNanoPageSimplified` in `apps/web/src/app.js`
- Proof and Nano presentation models: `apps/web/src/ui-models.js`
- Proof-honesty tests: `apps/web/src/ui-models.test.mjs`
- Nano visual system: Nano class block in `apps/web/src/styles.css`

## 4. Product Goal

Applicability: applies directly to Nano.

Required one-sentence goal:

`Nano lets AI agents request tiny USDC source payments, get user approval, verify Arc proof, unlock the source, and show the receipt trail.`

One-paragraph goal:

Nano should make the source-payment loop understandable in under 60 seconds. A user gives an agent a goal and small USDC budget, the agent asks to unlock one source/tool, the user approves the spend, payment happens on Arc Testnet, Nano verifies proof, and only then does the source-backed result and receipt trail unlock.

Phase 15C recommendation:

- Make the hero state the promise once.
- Put honest Nano economy stats directly below the hero.
- Put the whole active run in one `Nano run` console.
- Put source-backed result and receipt payoff immediately after the console.
- Put history, test instructions, live/starter/planned details, handoff, receipt detail, and activity lower in collapsed supporting details.

Current sections affected:

- Hero
- What happens
- Goal/budget
- Agent decision
- Source capsule
- Spend approval
- Proof check
- Result preview
- Payment trail
- Supporting details

Likely later files:

- `apps/web/src/app.js`
- `apps/web/src/styles.css`
- `apps/web/src/ui-models.js`
- `apps/web/src/ui-models.test.mjs`

Risk level: medium, because section recomposition can accidentally alter state visibility.

Model/tests: likely yes for stat labels, console step state, and copy expectations.

Must not change:

- Payment/proof logic
- Wallet logic
- Backend routes
- Arc config
- Receipt verification rules

## 5. Target Users

Applicability: applies directly to Nano.

### Hackathon judge

What they need to understand:

- Nano is an AI source-payment proof layer.
- The agent requests one tiny source spend.
- The user approves before payment.
- Arc proof gates paid status and result unlock.

What they need to trust:

- Approved is not paid.
- Only verified Arc proof unlocks the source/result.
- x402/Gateway/Circle Wallets are planned-only unless implemented and verified.

What they should click first:

- `Start Nano run`

What proof they need to see:

- `Paid with proof`
- valid Arc transaction link only after verified proof
- shareable receipt URL

What should be hidden or collapsed:

- Run history
- optional Dispatch handoff
- technical receipt detail
- live/starter/planned matrix after the main proof loop

### Non-technical user / 10-year-old clarity target

What they need to understand:

- The agent wants to buy one small source.
- They approve it.
- They pay on Arc.
- Nano checks proof.
- The result unlocks after proof.

What they need to trust:

- Nothing is marked paid just because they approved.
- The result does not use paid source content before proof.

What they should click first:

- `Start Nano run`

What proof they need to see:

- Simple proof state text: `Approved, not paid yet`, `Paid with proof`, or `Proof rejected`.

What should be hidden or collapsed:

- Gateway/x402 feasibility details
- receipt row internals
- router/API wording unless an error occurs

### Web3/AI builder

What they need to understand:

- Nano has budget, spend intent, recipient wallet, Arc payment, proof verification, source unlock, and receipt trail primitives.
- Current live path is Arc Testnet USDC proof.
- x402/Gateway is a future adapter path.

What they need to trust:

- Payment and proof states are inspectable.
- No fake tx hash, fake source execution, or fake Gateway state appears.

What they should click first:

- `Start Nano run`, then inspect `View shareable receipt`.

What proof they need to see:

- Amount, token, sender, recipient, proof state, valid Arc tx link.

What should be hidden or collapsed:

- Technical receipt details until they choose to inspect.

## 6. User Journey

Applicability: applies directly to Nano.

Desired journey:

1. Land on `/nano`.
2. Read one clear promise.
3. See honest Nano economy stats.
4. Start or continue a Nano run.
5. Set/confirm goal and budget.
6. See the agent choose one source.
7. Approve source spend.
8. Pay on Arc.
9. Verify proof.
10. See source/result unlock.
11. View shareable receipt.
12. Optionally inspect details/history/live-vs-planned.

Mapping to final five visible interface zones:

- Hero: steps 1 and 2.
- Nano economy stats: step 3.
- Nano run console: steps 4 through 9.
- Result + receipt payoff: steps 10 and 11.
- Collapsed supporting details: step 12.

Current sections affected:

- All current `/nano` visible sections.

Risk level: medium.

Model/tests: likely yes for step summaries and labels.

Must not change:

- Data loading or wallet-scoped behavior.
- Proof verification behavior.

## 7. Information Architecture

Applicability: applies directly to Nano.

### Final primary layer

1. Hero
2. Nano economy stats
3. Nano run console
4. Result + receipt payoff

### Final secondary layer

5. Collapsed supporting details:

- How to test Nano
- What is live vs planned
- Run history
- Optional Dispatch handoff
- Technical receipt details
- Nano activity

### Current section mapping

| Current section | Final location | Action | Rename |
| --- | --- | --- | --- |
| Hero | Hero | Keep visible | Use `AI agents that pay for sources before using them.` |
| What happens | Hero or console intro | Merge into console step summaries | Use `Goal`, `Source`, `Pay + proof`, `Result` |
| Goal/budget | Nano run console | Merge into `Goal` step | Keep `Create Nano budget` |
| Selected run state | Nano run console | Merge into console header/status | `Continue run` summary |
| Agent decision | Nano run console | Merge into `Source` step | Keep `Agent decision` as sublabel |
| Source capsule | Nano run console and payoff | Merge into `Source`; show unlocked state in payoff | Keep `Dispatch-hosted starter source capsule` |
| Agent evaluation | Nano run console | Compress inside `Source` step | `Agent evaluation` |
| Spend approval | Nano run console | Merge into `Pay + proof` step | `Approve source spend` |
| Recipient wallet | Nano run console | Merge into `Pay + proof` step | `Recipient wallet` |
| Proof check | Nano run console | Merge into `Pay + proof` step | Keep `Proof check` |
| Result preview | Result + receipt payoff | Move into payoff | `Result locked` / `Result unlocked` |
| Payment trail | Result + receipt payoff and details | Show short trail in payoff; full trail in details | `Receipt trail` if needed |
| Shareable receipt | Result + receipt payoff | Keep visible | `View shareable receipt` |
| Optional Dispatch handoff | Collapsed supporting details | Move lower/collapse | Keep `Optional Dispatch handoff` |
| Run history | Collapsed supporting details | Move lower/collapse | Keep `Run history` |
| Live/starter/planned | Collapsed supporting details | Move lower/collapse | `What is live vs planned` |
| Nano activity | Nano economy stats and details | Stat strip uses safe values; detail lower | `Nano economy` / `Nano activity` |
| Receipt detail | Collapsed supporting details | Move lower/collapse | `Technical receipt details` |

Risk level: medium.

Model/tests: yes for new stat model and possibly console state model.

Must not change:

- Receipt detail contents or proof logic.
- Run history wallet scoping.

## 8. Navigation

Applicability: applies directly to Nano.

Recommendation:

- No new global nav.
- No sidebar.
- No tabs for the main flow.
- Use downward guided flow.
- Use native `<details>`/`<summary>` or accessible accordions for supporting sections.
- Keep `View shareable receipt` as the main inspectable link.
- Optional anchor links are allowed only if they reduce confusion, for example `#nanoRunConsole` or `#nanoReceipt`.

Why:

Nano should feel like a guided proof console, not an admin dashboard. The product action is sequential: start run, approve spend, pay, verify, inspect receipt.

Current sections affected:

- Run history
- live/starter/planned panel
- receipt detail
- optional handoff
- Nano activity

Risk level: low.

Model/tests: usually no unless labels move into models.

Must not change:

- Route table
- `/nano?receipt=<budgetId>` behavior

## 9. Layout

Applicability: applies directly to Nano.

Page:

- Max width: 1120px to 1200px.
- Desktop horizontal padding: 24px to 32px.
- Tablet horizontal padding: 20px to 24px.
- Mobile horizontal padding: 16px.

Visible zones:

1. Hero full-width.
2. Stats strip compact.
3. Console full-width.
4. Payoff full-width.
5. Details lower/collapsed.

Rules:

- No 10+ visible major sections.
- No equal-weight dashboard panels.
- No two critical sections forced into one row.
- Under 720px everything stacks one-column.

Current sections/components affected:

- `.nano-page--simple`
- `.nano-hero`
- `.nano-how`
- `.nano-demo-card`
- `.nano-two-col`
- `.nano-core-stack`
- `.nano-result-panel`
- `.nano-bottom-grid`
- `.nano-run-history`
- `.nano-receipt-detail`

Risk level: medium.

Model/tests: no for CSS-only, yes if DOM order changes are asserted later.

Must not change:

- Action handlers
- Data fetching
- Proof state computation

## 10. Visual Hierarchy

Applicability: applies directly to Nano.

Priority:

1. Hero promise
2. Nano economy stats
3. Active console step
4. Result/receipt payoff
5. Collapsed details

Recommended sizes:

- Hero headline desktop: 34px to 38px.
- Hero headline mobile: 28px to 30px.
- Hero subtitle desktop: 15px to 16px.
- Hero subtitle mobile: 14px.
- Section title: 19px to 22px.
- Console step title: 15px to 17px.
- Body text: 13px to 15px.
- Helper text: 12px to 13px.
- Badge/chip: 11px to 12px.
- Primary button height: 48px to 52px.
- Secondary button height: 42px to 46px.

Hard rule:

- Homepage hero size must not be reused inside Nano.

Risk level: low.

Model/tests: no unless copy is model-backed.

Must not change:

- Existing Dispatch global type scale outside Nano.

## 11. Typography

Applicability: applies directly to Nano.

Rules:

- Use existing app font stack.
- No new font.
- No oversized inner headings.
- No tiny critical text.
- Calm premium typography.
- Short copy blocks.
- Readable line-height.

Recommended line heights:

- Hero headline: 1.05 to 1.12.
- Subtitle/body: 1.55 to 1.65.
- Card titles: 1.25 to 1.35.

Current components affected:

- Hero panel
- stat cards
- console step cards
- result payoff
- supporting detail summaries

Risk level: low.

Model/tests: no.

Must not change:

- Global app font stack.

## 12. Color System

Applicability: applies directly to Nano.

Use existing tokens only.

Roles:

- Page background: existing Dispatch dark navy background.
- Primary surface: current glass navy panel.
- Secondary surface: quieter `rgba(255,255,255,0.018)` style.
- Border: existing thin mint/white borders.
- Primary action: existing mint primary button.
- Success/verified: verified proof and unlocked source/result only.
- Pending/attention: approved-not-paid, waiting, unavailable.
- Rejected/error: proof rejected, invalid wallet, invalid tx hash.
- Planned/starter: neutral or muted.
- Disabled: muted, non-mint.

Hard color rules:

- Success color only for verified proof/unlocked states.
- Do not use success color for approved but unpaid.
- Do not use success color for local receipt.
- Do not use success color for pending/unavailable/rejected proof.
- Do not use success color for planned Gateway/x402/Circle Wallets.
- Planned/starter must be neutral or muted.

Risk level: medium, because color can accidentally imply payment.

Model/tests: no, but visual QA required.

Must not change:

- `Paid with proof` gating.
- Status labels used in tests.

## 13. Spacing System

Applicability: applies directly to Nano.

Section gaps:

- Hero to stats: 16px to 22px.
- Stats to console: 20px to 28px.
- Console to payoff: 20px to 28px.
- Payoff to details: 34px to 44px.
- Details internal gap: 12px to 18px.

Card padding:

- Hero: 28px to 32px desktop, 20px to 22px mobile.
- Stats cards: 16px to 20px desktop, 14px to 16px mobile.
- Console: 26px to 32px desktop, 18px to 22px mobile.
- Payoff: 24px to 30px desktop, 18px to 22px mobile.
- Detail panels: 16px to 20px.

Grid gaps:

- Stats desktop: 12px to 16px.
- Console internal desktop: 16px to 22px.
- Mobile: 12px to 14px.

Risk level: low.

Model/tests: no.

Must not change:

- Existing non-Nano spacing.

## 14. Components

Applicability: applies directly to Nano.

### Hero panel

Purpose: explain Nano in one promise and one short subtitle.

Visible copy:

- Headline: `AI agents that pay for sources before using them.`
- Subtitle: `Give an agent a goal. It requests one tiny source payment. You approve it, pay on Arc, and Nano unlocks the result only after proof verifies.`
- Badges: `Arc Testnet USDC`, `User-approved spend`, `Paid only with proof`

States: static.

Layout: full-width panel.

Replaces/absorbs: current hero plus some `What happens` explanation.

### Nano economy stat cards

Purpose: show honest top-level state without fake traction.

Visible copy:

- `USDC earned`
- `Agents paid`
- `Sources unlocked`
- `Receipts created`
- `Proof checks`

States:

- Real verified value if supported.
- Honest fallback if not supported.

Layout: compact strip, 5 columns desktop if clean.

Replaces/absorbs: part of current `Nano activity`; detail remains lower.

### Nano run console

Purpose: one main working area for the run.

Visible copy:

- Title: `Nano run`
- Steps: `Goal`, `Source`, `Pay + proof`, `Result`

States:

- no wallet
- no budget
- source planned
- approved, not paid yet
- payment/proof pending
- paid with proof
- result unlocked

Layout: full-width large panel with step row and active step panel.

Replaces/absorbs:

- Goal/budget
- selected run state
- agent decision
- source capsule
- agent evaluation
- spend approval
- recipient wallet
- proof check

### Console step row

Purpose: summarize progress without a separate rail/card stack.

Visible copy: `Goal`, `Source`, `Pay + proof`, `Result`.

States: future, current, complete, blocked.

Layout: compact horizontal row desktop, stacked or wrapping on mobile.

Replaces/absorbs: old `What happens` and run progress surfaces.

### Active step panel

Purpose: show only the current decision/action.

Visible copy depends on step.

States:

- Wallet required.
- Budget ready/invalid/created.
- Source selected.
- Payment ready/blocked.
- Proof verified/rejected/pending.

Layout: one primary card inside console.

Replaces/absorbs: current scattered CTA surfaces.

### Source capsule

Purpose: make paid source concrete without claiming external access.

Visible copy:

- `Dispatch-hosted starter source capsule`
- `Starter source locked`
- `Starter source unlocked`

States:

- locked before verified proof
- unlocked after verified Arc proof

Layout: inside `Source` step and summarized in payoff.

Must not imply: external paid source marketplace is live.

### Compact agent evaluation

Purpose: show cost-vs-value decision.

Visible copy:

- Source Unlock: chosen/payable
- Summary Formatter: skipped/planned
- Claim-check Tool: planned/starter

States: chosen, skipped, planned/starter.

Layout: compact rows inside `Source` step; no pay buttons for skipped/planned options.

### Spend/proof controls

Purpose: make approval, Arc payment, and proof verification clear.

Visible copy:

- `Approve source spend`
- `Pay source on Arc`
- `Verify Arc proof`
- `Approval is not payment.`

States:

- proposed
- approved, not paid yet
- ready to pay
- waiting for proof
- proof rejected
- paid with proof

Layout: `Pay + proof` step inside console.

### Result payoff card

Purpose: show the proof-gated payoff.

Visible copy:

- Before proof: `Result locked`
- After proof: `Result unlocked`

States:

- locked
- unlocked/source-backed

Layout: full-width after console.

### Receipt action

Purpose: main inspectable proof link.

Visible copy:

- `View shareable receipt`

States:

- unavailable
- ready
- shareable

Layout: in payoff card; also available in details/history.

### Collapsed details/accordion

Purpose: preserve information without crowding first-run flow.

Sections:

- How to test Nano
- What is live vs planned
- Run history
- Optional Dispatch handoff
- Technical receipt details
- Nano activity

States: collapsed by default unless a route/receipt context requires it.

### Empty state

Purpose: short, useful missing-state guidance.

Examples:

- `Connect wallet to start a Nano run.`
- `No Nano runs yet. Start one to create a receipt trail.`

### Error state

Purpose: explain blocker and next step without implying payment.

Examples:

- `Proof rejected. Nano could not match the Arc payment to the expected amount, token, sender, and recipient.`
- `Nano router is unavailable. Budget creation and proof checks need the Dispatch router API.`

### Status chip

Purpose: compact state label.

Allowed status labels:

- `Approved, not paid yet`
- `Paid with proof`
- `Proof pending`
- `Proof rejected`
- `Local receipt`
- `Planned next`

### Primary/secondary/quiet buttons

Purpose: enforce one dominant action per active step.

Primary buttons are only for the current active action. Secondary and quiet buttons cannot compete visually.

## 15. Buttons and CTAs

Applicability: applies directly to Nano.

Primary CTAs:

- `Start Nano run`
- `Create Nano budget`
- `Approve source spend`
- `Pay source on Arc`
- `Verify Arc proof`

Secondary CTAs:

- `View shareable receipt`
- `Review result`
- `Start new run`

Quiet CTAs:

- `Refresh`
- `Copy`
- `View run history`
- `Open details`
- `Optional Dispatch handoff`

Button specs:

- Primary height: 48px to 52px.
- Secondary height: 42px to 46px.
- Primary border radius: existing pill/999px style.
- Primary horizontal padding: 18px to 24px.
- Secondary horizontal padding: 16px to 20px.
- Mobile primary buttons full-width when they are the main action.

Hard rule:

- Only one visually dominant primary action should appear per active step.

Current components affected:

- Hero CTA
- goal/budget primary CTA
- pay/proof controls
- receipt actions
- run history buttons
- optional handoff buttons

Risk level: medium.

Model/tests: yes if action labels or primary action state model changes.

Must not change:

- Button handlers or action modes unless explicitly scoped.

## 16. Forms

Applicability: applies directly to Nano.

### Goal input

Label: `Goal`

Placeholder/helper:

- Helper: `Tell the agent what result you want.`

Validation:

- Required before creating budget.

Error state:

- `Enter a goal before creating a budget.`

Disabled state:

- Disabled only during action pending if current behavior requires it.

Success state:

- Goal summary appears in console and receipt.

What not to imply:

- Do not imply a real autonomous external source search has happened.

### Budget preset/custom amount

Label: `Budget`

Helper:

- `Create a small budget before approving a source spend.`

Validation:

- Numeric only.
- No zero.
- No negative.
- No unlimited budgets.
- Respect existing minimum/maximum behavior.
- Up to 2 decimals if currently supported.

Error state:

- Existing validation messages should stay short.

Success state:

- `Budget created`

What not to imply:

- Budget is not escrow unless existing product logic proves escrow.

### Recipient wallet input

Label: `Recipient wallet`

Helper:

- `This is where the approved source payment will be sent on Arc Testnet.`

Validation:

- EVM address validation stays unchanged.
- Invalid wallet blocks payment.

Error state:

- `Add a valid 0x recipient wallet before paying on Arc.`

Success state:

- `Recipient ready`

What not to imply:

- Do not imply Circle Wallet custody is live.

### Tx hash/proof input

Label: `Arc transaction hash`

Helper:

- `Paste the Arc Testnet transaction hash after payment.`

Validation:

- Entered tx hash is not verified until proof verifies.
- Local/manual input is not paid with proof.
- Invalid hash never unlocks source/result.

Error state:

- `Proof rejected. Nano could not match the Arc payment to the expected amount, token, sender, and recipient.`

Success state:

- `Paid with proof`

What not to imply:

- Do not show a tx link for invalid/unverified hashes.

### Wallet connect state

Label/state:

- `Connect wallet`
- `Wallet connected`
- `Switch to Arc Testnet` if existing logic supports it.

Helper:

- `Connect wallet to start a Nano run.`

What not to imply:

- Do not fake balances or readiness.

## 17. Content and Copy

Applicability: applies directly to Nano.

Hero headline:

`AI agents that pay for sources before using them.`

Hero subtitle:

`Give an agent a goal. It requests one tiny source payment. You approve it, pay on Arc, and Nano unlocks the result only after proof verifies.`

Hero badges:

- `Arc Testnet USDC`
- `User-approved spend`
- `Paid only with proof`

Stats:

- `USDC earned` - `0.00 verified` or real verified amount.
- `Agents paid` - `Verified proof only` or real verified count if supported.
- `Sources unlocked` - `1 starter path` or real verified count.
- `Receipts created` - `Real runs only` or real available count.
- `Proof checks` - `Arc verified` or real attempt count.

Console title:

`Nano run`

Console steps:

- `Goal`
- `Source`
- `Pay + proof`
- `Result`

Payoff before proof:

- `Result locked`
- `Nano has not verified Arc proof yet. The source cannot be used in the result.`

Payoff after proof:

- `Result unlocked`
- `The verified source is now used in the final result.`
- `View shareable receipt`

Avoid:

- `judge run`
- `Source Payment Judge Run`
- `generic budget dashboard`
- anything implying x402/Gateway/Circle Wallets are live
- anything implying external paid source access is live
- anything implying local receipt equals paid
- anything implying approval equals payment

Risk level: low to medium.

Model/tests: yes where copy is model-generated.

Must not change:

- Proof-gated labels.

## 18. Interaction Design

Applicability: applies directly to Nano.

Active step behavior:

- Highlight one step as current.
- Show only one dominant action for that step.
- Summarize completed steps compactly.
- Future steps remain visible but muted.

Completed step summary behavior:

- Show status, amount, and proof state.
- Do not show full forms after completion unless editing is safe and existing logic supports it.

Collapsed details behavior:

- Use keyboard-accessible disclosure.
- Keep details closed by default unless receipt route context requires them open.

Button feedback:

- Show pending labels such as `Working...` or `Verifying Arc proof`.
- Do not mark state complete until model/backend state changes.

Hover/focus behavior:

- Subtle only.
- Do not hide critical explanations behind hover.

Receipt action behavior:

- `View shareable receipt` opens the real `/nano?receipt=<budgetId>` path.
- No invented receipt IDs.

Proof state visibility:

- Always visible in `Pay + proof` and payoff.

Rules:

- No flashy animation.
- No hidden critical payment/proof state.
- No hover-only explanations.
- No heavy motion.
- User always knows next action.

## 19. User Feedback States

Applicability: applies directly to Nano.

Wallet:

- Disconnected: `Connect wallet to start a Nano run.`
- Connected: `Wallet connected`
- Unavailable/wrong network if supported: `Switch to Arc Testnet to continue.`

Budget:

- Empty: `Create a small budget before approving a source spend.`
- Invalid: existing validation copy.
- Ready: `Budget ready`
- Created: `Budget created`

Spend:

- Proposed: `Source spend proposed`
- Approved, not paid yet: `Approved, not paid yet`
- Blocked: `This spend exceeds the remaining budget.`
- Oversized/unavailable: `Payment unavailable for this spend.`

Payment/proof:

- Ready to pay: `Pay source on Arc`
- Local/manual receipt: `Local receipt is not paid with proof.`
- Pending proof: `Waiting for proof`
- Proof unavailable: `Arc proof verification is temporarily unavailable.`
- Proof rejected: `Proof rejected`
- Paid with proof: `Paid with proof`

Source:

- Locked: `Starter source locked`
- Unlocked: `Starter source unlocked`

Result:

- Locked: `Result locked`
- Unlocked/source-backed: `Result unlocked`

Receipt:

- Unavailable: `A shareable receipt appears after a real run exists.`
- Ready: `Receipt ready`
- Shareable: `View shareable receipt`

History/activity:

- Empty: `No Nano runs yet. Start one to create a receipt trail.`
- Unavailable: `Run detail unavailable from the current router response.`
- Populated: show real run cards only.

Risk level: medium.

Model/tests: yes for state copy and label rules.

Must not change:

- Source/result unlock logic.

## 20. Accessibility

Applicability: applies directly to Nano.

Required rules:

- Semantic buttons and links.
- No clickable divs for actions.
- Visible focus states.
- Keyboard-accessible collapsed details.
- Status must not rely on color alone.
- All icon-only controls need labels.
- Inputs need labels or accessible names.
- Disabled buttons need visible reason.
- Readable contrast.
- Long wallet/tx/budget/receipt strings wrap.
- Keyboard order follows visual order.
- No hover-only critical info.
- No tiny low-contrast critical text.

Current components affected:

- Hero actions
- preset buttons
- primary action button
- proof input
- receipt buttons
- collapsed support details

Risk level: low to medium.

Model/tests: no for most; manual QA required.

Must not change:

- Existing button handlers.

## 21. Responsive Design

Applicability: applies directly to Nano.

Breakpoints:

- 980px desktop/tablet shift.
- 720px core one-column.
- 640px compact mobile.
- 430px tight mobile.
- 390px smallest QA target.

Rules:

- Stats 5-card row on desktop if clean.
- Stats wrap to 2/3 columns on tablet.
- Stats 2-column or 1-column on mobile.
- Console one-column under 720px.
- Primary buttons full-width on mobile.
- No horizontal overflow.
- Tx hashes/wallets/URLs wrap.

Current components affected:

- Stat strip
- console
- proof controls
- receipt rows
- run history

Risk level: medium.

Model/tests: no; browser QA required.

Must not change:

- Desktop app shell outside Nano.

## 22. Performance

Applicability: applies directly to Nano.

Rules:

- No new heavy dependency.
- No new image-heavy sections.
- No animation-heavy UI.
- Keep static build working.
- Avoid layout jumping.
- Avoid huge DOM duplication.
- Avoid expensive render computations.
- No new client-side library unless absolutely necessary.

Current components affected:

- Any future accordion/details implementation.
- Any future stat model.
- Any future console model.

Risk level: low if only recomposition/CSS.

Model/tests: no unless new model helpers are introduced.

Must not change:

- Startup loading behavior.
- API hydration behavior.

## 23. Trust and Credibility

Applicability: applies directly to Nano.

Visible trust elements:

- `Paid only with proof`
- proof state
- source locked/unlocked state
- receipt action
- live/starter/planned separation
- no fake stats
- no fake tx links
- no fake verified proof

Nano economy stat honesty rules:

`USDC earned`

- Only verified payment total.
- If unavailable, `0.00 verified`.
- Do not count approved/local/pending/rejected.

`Agents paid`

- Only verified count if supported.
- If not supported, `Verified proof only` or `0 verified`.
- Do not imply real agent payouts if not implemented.

`Sources unlocked`

- Only verified source unlock count if supported.
- Otherwise `1 starter path`.
- Do not imply external source marketplace is live.

`Receipts created`

- Only real available run receipts.
- Otherwise `Real runs only`.
- Do not fake count.

`Proof checks`

- Real tracked proof attempts if available.
- Otherwise `Arc verified`.
- Do not fake attempts.

Risk level: high because stats can imply fake traction.

Model/tests: yes. Add tests proving stat fallbacks do not count fake payments/earnings/receipts.

Must not change:

- Metrics calculations that count only verified Arc proof as paid usage.

## 24. Data Display

Applicability: applies directly to Nano.

Show:

- Stat cards: concise top strip only.
- Console step states: one-line labels.
- Spend rows: label, amount, proof state, action availability.
- Proof status: always visible near proof action.
- Source status: locked/unlocked.
- Result status: locked/unlocked/source-backed.
- Receipt status: unavailable/ready/shareable.
- Run history: collapsed detail.
- Activity: collapsed detail.

Rules:

- Show only data that exists.
- Label local/session data clearly.
- Label starter paths clearly.
- Avoid heavy tables in main flow.
- Move detailed rows to collapsed technical details.
- Keep main flow low-density.

Risk level: medium.

Model/tests: yes for stat and proof display.

Must not change:

- Wallet-scoped run history behavior.

## 25. Empty States

Applicability: applies directly to Nano.

Approved empty copy:

- No wallet: `Connect wallet to start a Nano run.`
- No budget: `Create a small budget before approving a source spend.`
- No approved spend: `The agent has not requested a payable source yet.`
- No verified proof: `Result stays locked until Arc proof verifies payment.`
- No receipt: `A shareable receipt appears after a real run exists.`
- No run history: `No Nano runs yet. Start one to create a receipt trail.`
- No activity: `Nano activity appears after real run events.`

Avoid:

- `Nothing here.`

Risk level: low.

Model/tests: yes if model copy changes.

Must not change:

- Unavailable states that prevent fake data display.

## 26. Error States

Applicability: applies directly to Nano.

Required error states:

- wallet disconnected
- invalid wallet address
- wrong/unsupported network if existing logic supports it
- invalid budget
- source spend blocked
- tx hash invalid
- proof pending
- proof unavailable
- proof rejected
- router/API unavailable
- receipt unavailable
- selected run unavailable

Rules:

- Explain what happened.
- Give next step.
- Do not imply payment happened.
- Do not hide failed proof.
- Do not blame user.

Example:

`Proof rejected. Nano could not match the Arc payment to the expected amount, token, sender, and recipient.`

Risk level: medium.

Model/tests: yes for proof and API copy.

Must not change:

- Console/dev error behavior unless scoped.

## 27. Onboarding

Applicability: applies directly to Nano.

Onboarding is embedded in the page, not a modal.

Allowed surfaces:

- Hero
- Stat strip
- Console step summaries
- Payoff card
- Collapsed `How to test Nano`

Do not add:

- Modal tour
- Long checklist above the run
- Fake sample data
- Distracting tutorial layer

Risk level: low.

Model/tests: no unless copy changes.

Must not change:

- Main route behavior.

## 28. Microcopy

Applicability: applies directly to Nano.

Approved microcopy:

- `Approval is not payment.`
- `Paid only after verified Arc proof.`
- `Starter source, not external marketplace access yet.`
- `Real runs only.`
- `Verified proof only.`
- `This does not change Dispatch marketplace settlement.`
- `Gateway and x402 are planned next.`

Rule:

- Microcopy must reduce confusion, not add paragraphs.

Risk level: low.

Model/tests: yes if model-generated.

Must not change:

- Hard proof labels.

## 29. Motion and Animation

Applicability: applies lightly to Nano.

Allowed:

- subtle hover/focus states
- subtle accordion open/close
- subtle status transition if existing system supports it

Avoid:

- big animations
- animated counters implying fake growth
- flashing proof states
- motion that delays comprehension
- motion that hurts performance

Respect reduced-motion if already supported.

Risk level: low.

Model/tests: no.

Must not change:

- No new animation dependency.

## 30. Branding

Applicability: applies directly to Nano.

Nano branding:

- premium dark
- mint proof accent
- precise fintech/Web3 feel
- calm AI product feel
- not a meme dashboard
- not a DeFi farming page
- not a generic admin panel
- not a fake traction landing page

Do not introduce unrelated branding.

Risk level: low.

Model/tests: no.

Must not change:

- Existing Dispatch design direction.

## 31. Icons and Visuals

Applicability: applies lightly to Nano.

Rules:

- Use icons only if current system already supports consistent usage.
- No new icon library unless absolutely necessary.
- Icons must not replace text.
- Proof/payment states must include words.
- Recommended metaphors: goal, source, payment, proof, result, receipt.

If no consistent icon system exists, use text and chips.

Risk level: low.

Model/tests: no.

Must not change:

- No new UI dependency for icons.

## 32. Page Structure

Applicability: applies directly to Nano.

Final visible page structure:

1. Hero
2. Nano economy stats
3. Nano run console
4. Result + receipt payoff
5. Collapsed supporting details

Absorption map:

- Hero absorbs old intro and the plain product promise.
- Nano economy stats absorb a small honest summary from current Nano activity.
- Nano run console absorbs goal/budget, selected run state, agent decision, source capsule, evaluation, spend approval, recipient wallet, and proof check.
- Result + receipt payoff absorbs result preview, payment trail summary, source unlock payoff, and main receipt action.
- Collapsed supporting details absorb How to test Nano, live/starter/planned, run history, optional handoff, receipt detail, and Nano activity.

Risk level: medium.

Model/tests: yes for new console/section model if introduced.

Must not change:

- `/nano?receipt=<budgetId>` shareable receipt route.

## 33. UX Writing for Decisions

Applicability: applies directly to Nano.

The UI must answer:

What is this?

`AI agents that pay for sources before using them.`

What do I do first?

`Start a Nano run.`

Why does the agent need payment?

`The source adds grounded context to the result.`

Who approves?

`You approve the source spend.`

Is approval payment?

`No. Approval is not payment.`

When is it paid?

`Only after Arc proof verifies payment.`

What unlocks?

`The starter source and source-backed result.`

Where is proof?

`View shareable receipt.`

What is planned?

`x402, Gateway, Circle Wallets, and nanopayments are planned next unless implemented and verified.`

Risk level: low.

Model/tests: yes if model-generated.

Must not change:

- Planned-only claims.

## 34. Consistency

Applicability: applies directly to Nano.

Use these labels consistently:

- `Nano run`
- `Nano economy`
- `Goal`
- `Source`
- `Pay + proof`
- `Result`
- `USDC earned`
- `Agents paid`
- `Sources unlocked`
- `Receipts created`
- `Proof checks`
- `Approved, not paid yet`
- `Paid with proof`
- `Proof check`
- `View shareable receipt`
- `How to test Nano`
- `What is live vs planned`
- `Optional Dispatch handoff`
- `Run history`

Do not mix old public labels with new labels.

Risk level: low.

Model/tests: yes for copy snapshots/expectations.

Must not change:

- Internal function names do not need to change unless a later cleanup explicitly scopes it.

## 35. Edge Cases

Applicability: applies directly to Nano.

Later implementation must handle:

- disconnected wallet
- connected wallet with no runs
- invalid recipient wallet
- missing recipient wallet
- budget too small
- budget too large
- source spend larger than budget
- user rejects wallet transaction
- missing tx hash
- invalid tx hash
- proof pending
- proof unavailable
- proof rejected
- local receipt
- verified receipt
- long wallet address
- long tx hash
- long budget ID
- long goal text
- very small mobile screen
- reload mid-flow
- selected run not found
- router/API unavailable
- no run history
- no Nano activity
- planned helper rows
- Gateway/x402 metadata present but not verified

None of these should create fake paid states.

Risk level: high for proof/payment edge cases.

Model/tests: yes. Existing tests cover many proof cases; add tests for any new stat/console state helpers.

Must not change:

- Existing proof guardrails.

## 36. Security UX

Applicability: applies directly to Nano.

Required security UX:

- User approves source spend.
- User pays on Arc.
- Nano verifies proof.
- Approval is not payment.
- Paid means verified proof only.
- Amount/recipient/token/sender/proof state must remain inspectable.
- Tx links only for valid verified Arc transaction hashes.
- Invalid wallet blocks payment.
- Gateway/x402/Circle Wallets are planned-only.

Risk level: high.

Model/tests: yes for any moved security copy/state.

Must not change:

- Arc proof validation.
- Transaction link validation.

## 37. Conversion Flow

Applicability: applies directly to Nano.

Conversion flow:

`Understand Nano -> start run -> create budget -> approve spend -> pay on Arc -> verify proof -> view receipt`

Primary CTA by state:

- no run: `Start Nano run`
- no budget: `Create Nano budget`
- spend ready: `Approve source spend`
- payment ready: `Pay source on Arc`
- proof ready: `Verify Arc proof`
- result ready: `View shareable receipt`

Secondary features must not compete with this path.

Risk level: medium.

Model/tests: yes if primary action model changes.

Must not change:

- Handler logic or action mode behavior unless explicitly scoped.

## 38. Testing and Refinement

Applicability: applies directly to future implementation phases.

Automated checks for future implementation phases:

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

Manual QA for future implementation phases:

- Open `/nano` disconnected.
- Confirm page is not blank.
- Confirm hero is clear.
- Confirm exactly three hero badges.
- Confirm Nano economy stats appear below hero.
- Confirm stats do not fake payments/earnings/receipts.
- Confirm one main Nano run console exists.
- Confirm console has Goal, Source, Pay + proof, Result.
- Confirm old sections are not all visible as separate cards.
- Confirm source is locked before proof.
- Confirm approved spend says `Approved, not paid yet`.
- Confirm approved spend does not say paid.
- Confirm `Paid with proof` only appears after verified Arc proof.
- Confirm invalid/local/pending/unavailable/rejected proof does not unlock source/result.
- Confirm shareable receipt is easy to find.
- Confirm supporting details are collapsed/lower.
- Confirm x402/Gateway/Circle Wallets remain planned-only.
- Confirm mobile at 390px, 430px, 720px.
- Preview deploy only if needed or requested.

Risk level: low.

Model/tests: yes for implementation phases.

Must not change:

- Production deploy remains forbidden unless explicitly requested.

## 39. Design System

Applicability: applies directly to Nano.

Required:

- Reuse existing colors/tokens.
- Reuse existing button style where possible.
- Reuse existing card/panel language.
- Introduce Nano-specific classes only when necessary.
- Keep radius/spacing/type consistent.
- No unrelated visual system.

Target values:

- Large card radius: 26px to 30px.
- Small card radius: 18px to 22px.
- Hero/console/payoff padding desktop: 26px to 32px.
- Hero/console/payoff padding mobile: 18px to 22px.
- Stat card padding desktop: 16px to 20px.
- Stat card padding mobile: 14px to 16px.
- Core section gap: 20px to 28px.
- Supporting break gap: 34px to 44px.
- Primary button: 48px to 52px high.
- Secondary button: 42px to 46px high.
- Badge text: 11px to 12px.
- Body text: 13px to 15px.

Risk level: low.

Model/tests: no.

Must not change:

- Existing Dispatch global visual system.

## 40. Developer Handoff

The next implementation passes must stay phase-specific and avoid broad rewrites.

### Phase 15C.2 - Hero + Nano economy stats

Scope:

- Add/recompose Nano economy stat strip.
- Keep old sections mostly unchanged.
- Implement stat definitions honestly.
- Add CSS for stats only.

Allowed files:

- `apps/web/src/app.js`
- `apps/web/src/styles.css`
- `apps/web/src/ui-models.js`
- `apps/web/src/ui-models.test.mjs`

Stop conditions:

- Any stat requires fake payments, fake earnings, fake receipts, fake users, or fake proof attempts.
- Any backend/API change appears necessary.
- App/runtime files outside the allowed set need changes.

Required checks:

- `git diff --check`
- `node --test apps/web/src/ui-models.test.mjs`
- `npm --workspace apps/web run build`

Manual QA notes:

- Confirm stats appear below hero.
- Confirm fallback stats do not imply real traction.
- Confirm `USDC earned` counts verified proof only if real data supports it.

Commit recommendation:

- Commit only after user review or explicit approval.

### Phase 15C.3 - Nano run console shell

Scope:

- Add one main `Nano run` console.
- Add Goal, Source, Pay + proof, Result step summaries.
- Old sections can remain lower during transition.
- No logic changes.

Allowed files:

- `apps/web/src/app.js`
- `apps/web/src/styles.css`
- `apps/web/src/ui-models.js`
- `apps/web/src/ui-models.test.mjs`

Stop conditions:

- Console requires backend changes.
- Existing payment/proof state must be weakened.
- Multiple primary actions become visually dominant.

Required checks:

- `git diff --check`
- `node --test apps/web/src/ui-models.test.mjs`
- `npm --workspace apps/web run build`

Manual QA notes:

- Confirm one console exists.
- Confirm step row reads Goal, Source, Pay + proof, Result.
- Confirm current step is obvious.

Commit recommendation:

- Commit only after user review or explicit approval.

### Phase 15C.4 - Move core flow into console

Scope:

- Merge goal/budget into Goal step.
- Merge agent decision/source capsule/evaluation into Source step.
- Merge spend approval/recipient wallet/proof check into Pay + proof step.
- Merge result preview/receipt action into Result step.

Allowed files:

- `apps/web/src/app.js`
- `apps/web/src/styles.css`
- `apps/web/src/ui-models.js`
- `apps/web/src/ui-models.test.mjs`

Stop conditions:

- Payment/proof/wallet/backend logic would need changes.
- Source/result unlock rules would weaken.
- Any planned/starter row becomes payable.

Required checks:

- `git diff --check`
- `node --test apps/web/src/ui-models.test.mjs`
- `node --test apps/web/src/chain-client.test.mjs`
- `npm --workspace apps/web run build`

Manual QA notes:

- Confirm the console tells the full story without old panels.
- Confirm approved spend still says `Approved, not paid yet`.
- Confirm verified proof still gates paid/unlocked.

Commit recommendation:

- Commit only after user review or explicit approval.

### Phase 15C.5 - Collapse supporting details

Scope:

- Move How to test Nano, What is live vs planned, Run history, Optional Dispatch handoff, Technical receipt details, and Nano activity into lower collapsed details.
- Preserve all information but reduce visible crowding.

Allowed files:

- `apps/web/src/app.js`
- `apps/web/src/styles.css`
- `apps/web/src/ui-models.js`
- `apps/web/src/ui-models.test.mjs`

Stop conditions:

- Details become inaccessible by keyboard.
- Receipt detail or proof state becomes hidden when it is critical.
- Run history leaks non-wallet-scoped data.

Required checks:

- `git diff --check`
- `node --test apps/web/src/ui-models.test.mjs`
- `npm --workspace apps/web run build`

Manual QA notes:

- Confirm supporting details are lower/collapsed.
- Confirm `View shareable receipt` remains easy to find.
- Confirm live/starter/planned claims remain visible enough to avoid overclaiming.

Commit recommendation:

- Commit only after user review or explicit approval.

### Phase 15C.6 - Premium CSS/mobile/accessibility pass

Scope:

- Spacing.
- Card dimensions.
- Mobile stacking.
- Focus states.
- Button hierarchy.
- Long text/hash wrapping.
- Accessibility polish.

Allowed files:

- `apps/web/src/app.js`
- `apps/web/src/styles.css`
- `apps/web/src/ui-models.js`
- `apps/web/src/ui-models.test.mjs`

Stop conditions:

- Desktop Dispatch pages are affected outside Nano.
- Mobile overflow remains.
- Focus/keyboard access regresses.

Required checks:

- `git diff --check`
- `node --test apps/web/src/ui-models.test.mjs`
- `node --test apps/web/src/chain-client.test.mjs`
- `npm --workspace apps/web run build`
- `npm --workspace apps/web run build:static`
- `git restore -- apps/web/.vercel-static`
- `git status --short --branch`

Manual QA notes:

- Confirm 390px, 430px, and 720px.
- Confirm buttons are tappable.
- Confirm tx/wallet/receipt strings wrap.
- Confirm one dominant primary action per active step.

Commit recommendation:

- Commit only after user review or explicit approval.

### Phase 15C.7 - Full verify + preview QA

Scope:

- Run full checks.
- Browser QA.
- Preview deploy only if needed/requested.
- Commit only after user approval.

Allowed files:

- Ideally no source edits.
- Only fix issues found during verification if explicitly scoped.

Stop conditions:

- Any test fails.
- `.vercel-static` remains dirty and cannot be restored.
- Preview deploy would require production deploy.
- Payment/proof cannot be represented honestly.

Required checks:

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

Manual QA notes:

- Open `/nano`.
- Open `/nano?receipt=<budgetId>` with a real budget ID.
- Check wallet disconnected and connected states.
- Check invalid/local/pending/unavailable/rejected proof states.
- Check verified Arc proof state if a real tx hash is available.
- Check planned-only Gateway/x402/Circle Wallet claims.

Commit recommendation:

- Commit only after all checks and browser QA pass and the user approves.

## 41. Hard Honesty Rules

These rules are mandatory for every Phase 15C implementation pass:

- Approved is not paid.
- Local receipt is not paid with proof.
- Pending proof is not paid.
- Unavailable proof is not paid.
- Rejected proof is not paid.
- `Paid with proof` only appears after verified Arc proof.
- Tx links appear only for valid verified Arc transaction hashes.
- Source capsule unlocks only after verified Arc proof.
- Result/source contribution unlocks only after verified Arc proof.
- Gateway/x402/Circle Wallets/Nanopayments remain planned-only unless actually implemented and verified.
- Starter/planned rows must never appear as live paid rows.
- Do not fake users.
- Do not fake payments.
- Do not fake earnings.
- Do not fake receipts.
- Do not fake tx hashes.
- Do not fake source/tool execution.
- Do not fake traction.
- Do not fake Gateway/x402 activity.
- Do not fake Circle Wallet activity.

## 42. Phase 15C.2 Readiness

Safe to proceed to Phase 15C.2 after this docs-only phase if:

- This blueprint is committed or explicitly accepted as the working plan.
- `git diff --check` passes.
- `npm --workspace apps/web run build` passes or any environment-specific failure is reported.
- Working tree contains only this blueprint document.
- User explicitly asks to begin Phase 15C.2.

Phase 15C.2 should not begin inside this phase.
