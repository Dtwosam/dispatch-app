# Dispatch Nano Phase 15 UI/UX Audit

Phase: 15A - Nano UI/UX Audit Only

Status: audit-only. No UI, model, CSS, backend, payment, route, contract, or deploy changes.

## 1. Executive Verdict

Nano is close, but it is not yet understandable in under 60 seconds for a first-time non-technical judge.

It currently feels like a set of strong panels rather than one single product flow. The source-payment story is present, proof honesty is strong, and the receipt path exists, but the user has to assemble the story from too many similarly weighted sections.

Verdict:

- Under 60 seconds: almost, but not reliably.
- One product vs separate panels: currently separate panels.
- Premium/calm/judge-ready: visually aligned and honest, but too dense.
- Biggest UI/UX weakness: too many important sections compete before the user completes the core run.
- Biggest strength: proof honesty is excellent. The UI and models consistently separate approved, local, pending, rejected, and verified Arc proof states.

Phase 15B should not redesign the product. It should compress the first-run path and make this story obvious:

> The agent wants to buy one small source. You approve it. You pay on Arc. Nano checks proof. Then the source unlocks and the result uses it.

## 2. First 5 Seconds Audit

Current first impression:

- Hero headline: `AI agent source payments` is clear and directionally strong.
- Subtitle: explains receipt layer, sources/tools, Arc proof, and result unlock in one sentence. Good, but slightly abstract for beginners.
- Badges: `Arc Testnet USDC`, `User-approved spend`, `Proof-gated unlock`, `Receipt trail` are honest, but four badges add cognitive load.
- Primary CTA: `Start Nano run` is visible and clear.
- Product story: visible, but the judge/test path, step rail, selected run state, and how-it-works card create several nearby "intro" surfaces.
- Density: above-the-fold is credible but crowded. It asks the user to process hero, badges, CTA, proof note, progress rail, selected run, how-it-works, and judge path before reaching the actual goal/budget card.

Recommended direction for Phase 15B:

- Keep hero headline or shorten to `AI agent source payments`.
- Keep one subtitle, but make it more concrete: `An agent requests one tiny source payment. You approve it, pay on Arc, and Nano unlocks the result only after proof verifies.`
- Reduce badges to three: `Arc Testnet USDC`, `User-approved spend`, `Paid only with proof`.
- Move selected run state below the run-start card unless a previous run is active.
- Merge the step rail and how-it-works into one compact "What happens" strip.
- Move the judge/test path lower or collapse it into a compact "How to test" panel after the start card.

## 3. 10-Year-Old Clarity Audit

Simple explanation:

> The agent wants to buy one small source. You approve it. You pay on Arc. Nano checks proof. Then the source unlocks and the result uses it.

Current clarity answers:

- Would a 10-year-old understand what the agent is doing? Partly. "Agent decision" and "source payment" help, but "receipt layer", "proof-gated", "controlled starter evaluation", and "Dispatch task handoff" are abstract.
- Would they understand why payment is needed? Mostly. The source capsule and decision card explain the source is worth paying for.
- Would they understand approval is not payment? Yes. The proof gate says this clearly.
- Would they understand proof? Mostly. "Arc proof matches amount, token, sender, recipient" is honest, but technical.
- Would they understand what unlocks after proof? Yes in the source capsule and result preview, though they appear after several panels.
- Would they know where the receipt is? Eventually. `View shareable receipt` appears in several places, but not as one obvious final step.

Copy areas to simplify:

- `Nano is the receipt layer for AI agents paying sources and tools.` -> Keep in hero or docs, but add a plain sentence near it.
- `Goal, source payment, proof trail.` -> Rename to `What happens`.
- `Judge test path` -> Rename in public UI to `Test path` or `How to test Nano`.
- `Controlled starter evaluation` -> Keep as a badge, but subtitle should say `Starter logic: not dynamic source discovery yet.`
- `Proof gate` repeated as label and title -> Use `Proof check`.
- `Use Nano with a Dispatch task` -> Keep lower; label as `Optional Dispatch handoff`.
- `Wallet-scoped history` -> Rename to `Run history`.

## 4. Flow Order Audit

Current top-to-bottom order:

1. Hero: Keep, simplify.
2. Step rail: Merge with how-it-works.
3. Selected run state: Move down unless active.
4. How it works: Keep, merge with step rail.
5. Judge/test path: Move down or collapse.
6. Goal and budget/start demo card: Move up.
7. Agent decision + source capsule: Keep, move immediately after goal/budget.
8. Agent evaluation panel: Keep, move before or merge near agent decision.
9. Spend plan + proof gate: Keep, but split into clearer approval/pay/proof sequence.
10. Run state + result preview: Keep, result should come before secondary progress if proof is verified.
11. Dispatch task handoff: Move down; optional.
12. Payment trail: Keep, move closer to result/receipt.
13. Run history: Move down.
14. Receipt detail: Move down; only emphasize after run exists.
15. Nano activity + why this matters: Move down; supporting.
16. Planned-next limit note: Keep at bottom.

Ideal Phase 15B order:

1. Hero
2. What happens
3. Goal and budget / primary action
4. Agent decision
5. Source capsule
6. Agent evaluation, compact
7. Approval and spend plan
8. Pay on Arc
9. Proof check
10. Result preview
11. Receipt trail
12. Dispatch handoff, optional
13. Run history
14. Live/starter/planned explanation
15. Nano activity

Section actions:

- Hero: Keep.
- Step rail: Merge.
- Selected run: Move down or conditionally show.
- How it works: Keep, merge.
- Judge test path: Rename and move down.
- Goal/budget: Move up.
- Agent decision: Keep.
- Source capsule: Keep.
- Agent evaluation: Keep, compress.
- Spend plan: Keep, reduce text.
- Proof gate: Rename.
- Result: Keep, make primary after proof.
- Payment trail: Keep, move closer to result.
- Dispatch handoff: Move down.
- Run history: Move down.
- Receipt detail: Hide under details or keep lower.
- Metrics/why: Move down.

## 5. Visual Hierarchy Audit

Current hierarchy:

- Page max width uses existing `var(--max-width)`, likely 1200px. Good.
- Hero headline is `clamp(2rem, 4vw, 2.25rem)` on simple Nano page. Good, not homepage-sized.
- Section headings are `clamp(1.12rem, 1.7vw, 1.3rem)`. Good.
- Body copy is mostly `0.86rem` to `0.98rem`. Good.
- Buttons are visually consistent, but too many secondary actions appear across the page.
- Many panels have the same border/background/padding, so primary vs supporting content is not always clear.
- Proof/payment warnings are visible without shouting. Good.

Target hierarchy:

- Page max width: 1120px to 1200px.
- Hero headline: 34px to 38px desktop, 28px to 30px mobile.
- Hero subtitle: 15px to 16px desktop, 14px mobile.
- Section title: 19px to 22px.
- Card title: 15px to 17px.
- Body copy: 13px to 15px.
- Helper copy: 12px to 13px.
- Badge/pill: 11px to 12px.
- Button height: 48px to 52px primary, 42px to 46px secondary.
- Large panel radius: 26px to 30px.
- Small card radius: 18px to 22px.
- Large panel padding: 24px to 30px desktop, 18px to 22px mobile.
- Section gap: 24px to 32px for related Nano steps, 40px for major breaks.
- Grid gap: 16px to 20px.

Visual priority recommendation:

- Primary: goal/budget action, source capsule, proof/pay action, result.
- Secondary: agent evaluation, spend plan, receipt trail.
- Supporting: judge/test path, run history, Dispatch handoff, metrics, planned-next note.

## 6. Spacing and Layout Audit

Current layout:

- Overall spacing is clean but long. `nano-page--simple` gap is 24px, which keeps sections close enough but makes every panel feel equally important.
- Many cards use similar 18px to 30px padding. Good consistency, but weak hierarchy.
- Two-column sections are used for agent decision/source capsule and spend plan/proof gate. These are reasonable on desktop, but the proof gate may deserve full-width treatment when it contains the primary money/proof action.
- Mobile collapse rules exist at 980px and 640px. Good.
- Horizontal overflow risk is mostly handled with `min-width: 0`, `overflow-wrap:anywhere`, and collapsed trail rows.

Recommended spacing rules:

- Desktop section spacing: 28px between core sequence sections; 40px before supporting areas.
- Mobile section spacing: 20px to 24px between core sequence sections; 32px before supporting areas.
- Card padding: 24px desktop for core cards, 18px to 20px for supporting cards.
- Card gap: 16px desktop, 12px to 14px mobile.
- Max card widths: full width for hero, start card, proof check, result, receipt trail; two-column only for paired conceptual cards.
- Use one-column layout for: start card, proof check, result, receipt trail.
- Use two-column layout for: agent decision + source capsule; metrics + live/starter/planned only if low priority.
- Do not force spend plan and proof gate into one row if the proof gate is the next action.

## 7. Card System Audit

Hero card:

- Current role: explains product and starts run.
- Problem: four badges plus helper note make it slightly busy.
- Priority: primary.
- Recommendation: keep full width, reduce badges to three, simplify subtitle.

Judge/test path card:

- Current role: tells judges what is live/starter/planned and how to test.
- Problem: appears too early and uses public `Judge test path` language.
- Priority: supporting.
- Recommendation: rename to `How to test Nano`, move below first run card or below receipt/result.

Goal card:

- Current role: budget presets, wallet state, goal input, primary CTA.
- Problem: currently appears after several explanatory panels.
- Priority: primary.
- Recommendation: move immediately after "What happens"; keep strong two-column card.

Agent evaluation card:

- Current role: shows Source Unlock vs Summary Formatter vs Claim-check Tool.
- Problem: valuable, but too detailed before the user understands the core source unlock.
- Priority: secondary.
- Recommendation: keep but compress facts; move near agent decision.

Source capsule card:

- Current role: locked/unlocked source value.
- Problem: strong and concrete; should be more central.
- Priority: primary.
- Recommendation: keep paired with agent decision, ensure receipt link is visible after run starts.

Budget card / spend plan:

- Current role: shows plan rows, guardrails, recipient wallet.
- Problem: too much text per spend row; helper tools distract from only payable Source Unlock.
- Priority: secondary.
- Recommendation: reduce row copy to label, amount, reason, state, payment availability.

Recipient wallet card/field:

- Current role: inside Source Unlock spend row.
- Problem: correct but slightly buried.
- Priority: primary only after approval; secondary before that.
- Recommendation: surface wallet field near `Pay source on Arc` when payment is ready.

Proof gate card:

- Current role: tx hash input and proof state.
- Problem: important but shares a row with the dense spend plan.
- Priority: primary when approved or proof pending.
- Recommendation: rename to `Proof check`, make full-width after payment action.

Result preview card:

- Current role: shows starter/unlocked result and source contribution.
- Problem: good but shares a row with run state, which reduces focus.
- Priority: primary after proof, secondary before proof.
- Recommendation: make full-width or visually stronger after proof.

Receipt/payment trail card:

- Current role: spend recipient amount proof state table.
- Problem: currently below result/handoff; final loop is less obvious.
- Priority: secondary before proof, primary after proof.
- Recommendation: move directly after result; keep `View shareable receipt` visible.

Run history card:

- Current role: wallet-scoped previous runs.
- Problem: useful but too prominent for first-run comprehension.
- Priority: supporting.
- Recommendation: keep lower.

Dispatch handoff card:

- Current role: local preview for turning Nano context into Dispatch task context.
- Problem: can distract from Nano core flow.
- Priority: supporting.
- Recommendation: keep below receipt trail and label as optional/local preview.

Live/starter/planned card:

- Current role: judge/test path claim grouping and bottom planned note.
- Problem: split across multiple surfaces.
- Priority: supporting but important for honesty.
- Recommendation: consolidate into one calm `What is live vs planned` panel.

## 8. Copy and Label Audit

Copy is honest, but several labels are still too internal or repeated.

Recommended conventions:

- Use `Approved, not paid yet` for approved spend states.
- Use `Paid with proof` only for verified Arc proof.
- Use `Starter source` and `Starter decision` for controlled starter content.
- Use `Planned next` for x402/Gateway/Circle Wallets.
- Use `Proof check` instead of repeated `Proof gate`.
- Use `How to test Nano` instead of `Judge test path`.
- Use `Run history` instead of `Wallet-scoped history`.
- Use `Optional Dispatch handoff` instead of `Use Nano with a Dispatch task`.

Areas to simplify:

- Hero subtitle: make concrete, not platform-y.
- Agent evaluation subtitle: shorten.
- Spend rows: remove repeated `reason`, `contributionSummary`, and `proofRequirement` paragraphs from primary row display.
- Proof box: keep one sentence plus the tx hash input.
- Result preview: reduce fields; keep goal, source used, proof status, receipt.
- Handoff: keep lower and visibly optional.
- Bottom "Why this matters": merge with live/starter/planned or remove from primary flow.

Public wording to avoid:

- `judge run`
- `Source Payment Judge Run`
- any phrase implying Gateway/x402 is live
- any phrase implying external paid source access is live
- any phrase implying local receipt equals paid

## 9. Button and Action Audit

Current action model:

- Primary button is state-based in the start card. Good.
- Secondary `Refresh` and `Start new run` sit near the primary CTA. Acceptable, but can compete.
- `View shareable receipt` appears in source capsule, result preview, task handoff, payment trail, and run history. Good availability, but repetition makes it feel less special.
- `Pay source on Arc` is primary only when ready. Good.
- Disabled reasons are generally present.

Recommended action hierarchy:

- Primary action: one state-based CTA in the run-start/proof area.
- Secondary action: `Refresh`, `Start new run`, `View result`.
- Quiet action: copy task context, open task draft, auxiliary receipt buttons.
- Disabled action: show one short reason directly under button.
- Receipt action: after budget exists, show `View shareable receipt` in source capsule/result/trail, but make it most prominent after proof or in payment trail.

Specific adjustments:

- Keep `Start Nano run` as hero CTA.
- Keep `Create Nano budget`.
- Keep `Approve source spend`.
- Keep `Pay source on Arc`.
- Keep `Verify Arc proof`.
- Keep `Review result`.
- Use quieter treatment for `Refresh`.
- Do not show more than one mint/primary button per decision area.

## 10. Proof and Payment Honesty Audit

The current proof language and tests are strong.

Verified rules observed:

- Approved is not paid.
- Local receipt is not paid with proof.
- Pending/unavailable proof is not paid.
- Rejected proof is not paid.
- `Paid with proof` appears only after verified Arc proof.
- Tx links are built only from valid Arc transaction hashes.
- Source capsule and result contribution unlock only after verified Arc proof.
- Gateway/x402/Circle Wallets/Nanopayments remain planned-only.

Potential misunderstanding areas:

- The phrase `Live source insight` can imply external source access. Keep nearby `Dispatch-hosted starter source capsule`.
- The receipt view says `Router-backed receipt`, which is true but may sound technical. Consider `Run receipt`.
- The payment trail empty state says receipts appear after a spend is approved, paid, or verified. This could blur approved vs paid. Use `Payment states appear after a spend is proposed or approved. Paid appears only after proof.`
- Helper-agent rows can look payable. Keep `Planned/starter` and `No pay action` visible.

## 11. Receipt / Result / Handoff Audit

The final loop exists but needs clearer ordering.

Current clarity:

- Source payment happened: clear only after proof/receipt exists.
- Proof was checked: clear in proof gate.
- Source unlocked: clear in source capsule.
- Result used the source: clear in result contribution.
- Receipt proves it: clear in receipt proof view and payment trail.
- Dispatch handoff: honestly local preview, good.

Receipt access points:

- Source capsule: visible if `activeReceiptBudgetId` exists.
- Result preview: visible if `activeReceiptBudgetId` exists.
- Payment trail: visible if `activeReceiptBudgetId` exists.
- Task handoff: visible if `activeReceiptBudgetId` exists.
- Run history: visible per run.

Recommendation:

- Keep multiple receipt access points, but make the payment trail the canonical receipt path.
- After verified proof, result preview should show `View shareable receipt` as the main secondary action.
- Handoff should remain optional and lower.
- Receipt detail should be hidden behind or below payment trail, not a primary section for first-run users.

## 12. Mobile Audit

Likely mobile strengths:

- Grids collapse at 980px and 640px.
- Buttons become full width at small widths.
- Trail headers hide and rows stack.
- Long hashes/wallets use `overflow-wrap:anywhere` in key places.

Likely mobile friction:

- Too many sections before the user reaches the goal/budget card.
- Step rail uses horizontal scroll; acceptable, but it may feel like extra chrome.
- Judge/test path, how-it-works, selected run, and hero can create a long intro stack.
- Spend rows contain too many paragraphs on mobile.
- Receipt detail rows can become long because each row includes spend, reason, contribution, payment state, and tx link.

Mobile rules for Phase 15B:

- One-column only for core flow under 720px.
- Hero -> what happens -> start card should fit quickly.
- Hide or move selected run unless active.
- Collapse judge/test path under details on mobile.
- Limit spend row visible text to one reason and one state.
- Full-width primary CTA, 48px to 52px height.
- Keep `View shareable receipt` as a secondary full-width button after proof.
- Ensure wallet, tx hash, budget IDs, and receipt URLs wrap anywhere.

## 13. Premium Calm Design Direction

Nano should feel like a precise source-payment product, not a dashboard.

Direction:

- Page rhythm: fewer primary sections, more obvious sequence.
- Card rhythm: one idea per card; supporting cards lower and quieter.
- Type scale: keep current restrained type; do not increase hero beyond 38px.
- Spacing scale: slightly larger breaks before supporting sections.
- Action style: one mint primary per moment, quiet secondary buttons.
- Badge style: fewer badges, more meaningful labels.
- Receipt/proof style: calm proof chips, never scary unless rejected.

Avoid:

- crowded dashboards
- repeated explanatory cards
- equal-weight panels
- too many badges
- long mobile rows
- generic budget dashboard language
- loud Gateway/x402 planned notes

## 14. Prioritized Fix List

### P0 - Must fix before submission

1. Issue: First-run flow starts too low.
   Why it matters: judges may read explanations but not understand what to click.
   Fix: Move goal/budget card directly after hero/what-happens.
   Likely files: `apps/web/src/app.js`, `apps/web/src/styles.css`.
   Risk: medium.
   Tests: no model tests unless markup state logic changes.

2. Issue: Page feels like separate panels.
   Why it matters: weakens the single source-payment story.
   Fix: Reorder sections into Hero -> What happens -> Goal -> Agent decision -> Source capsule -> Approval/Pay/Proof -> Result -> Receipt.
   Likely files: `apps/web/src/app.js`.
   Risk: medium.
   Tests: run UI model tests if state-dependent rendering is touched.

3. Issue: Judge/test path appears too early and uses internal language.
   Why it matters: can make Nano feel like a demo built for judges rather than a product.
   Fix: Rename to `How to test Nano`; move lower or collapse.
   Likely files: `apps/web/src/ui-models.js`, `apps/web/src/app.js`, `apps/web/src/ui-models.test.mjs`.
   Risk: low.
   Tests: update model tests expecting `Judge test path`.

4. Issue: Spend plan rows are too text-heavy.
   Why it matters: Source Unlock is the only payable choice, but helper rows visually compete.
   Fix: Reduce rows to label, amount, one reason, state, action availability.
   Likely files: `apps/web/src/app.js`, maybe `apps/web/src/ui-models.js`.
   Risk: medium.
   Tests: update model tests if row model changes.

5. Issue: Proof gate should be the clearest money-state step.
   Why it matters: payment trust depends on understanding approved vs paid vs proof.
   Fix: Rename to `Proof check`, make it full-width after pay/approval state.
   Likely files: `apps/web/src/app.js`, `apps/web/src/styles.css`.
   Risk: low.
   Tests: not required unless labels are model-generated.

### P1 - Should fix for premium polish

1. Issue: Four hero badges compete.
   Fix: Reduce to three badges: `Arc Testnet USDC`, `User-approved spend`, `Paid only with proof`.
   Likely files: `apps/web/src/app.js`.
   Risk: low.
   Tests: no.

2. Issue: Selected run card appears before the user has context.
   Fix: Show only when active or move below start card.
   Likely files: `apps/web/src/app.js`.
   Risk: low.
   Tests: no model tests unless selected-run model changes.

3. Issue: Result preview shares emphasis with run state.
   Fix: Make result preview full-width or visually stronger after proof.
   Likely files: `apps/web/src/app.js`, `apps/web/src/styles.css`.
   Risk: low.
   Tests: no.

4. Issue: Dispatch handoff is too prominent for a supporting feature.
   Fix: Move below payment trail and label optional/local preview.
   Likely files: `apps/web/src/app.js`, `apps/web/src/ui-models.js`.
   Risk: low.
   Tests: update model tests if labels change.

5. Issue: Live/starter/planned explanations are split.
   Fix: Consolidate into one supporting panel.
   Likely files: `apps/web/src/app.js`, `apps/web/src/ui-models.js`.
   Risk: low.
   Tests: update judge command center tests if model labels change.

### P2 - Nice to have

1. Issue: Receipt detail is verbose.
   Fix: Put detailed receipt rows under `More receipt details`.
   Likely files: `apps/web/src/app.js`, `apps/web/src/styles.css`.
   Risk: low.
   Tests: no.

2. Issue: Metrics may feel like traction if skimmed.
   Fix: Keep low and label as wallet/run activity only.
   Likely files: `apps/web/src/app.js`, `apps/web/src/ui-models.js`.
   Risk: low.
   Tests: maybe model tests if labels change.

3. Issue: Step rail duplicates run progress.
   Fix: Keep one progress representation.
   Likely files: `apps/web/src/app.js`.
   Risk: low.
   Tests: no.

4. Issue: `Router-backed receipt` sounds technical.
   Fix: Use `Run receipt`.
   Likely files: `apps/web/src/ui-models.js`, `apps/web/src/ui-models.test.mjs`.
   Risk: low.
   Tests: yes if current tests assert receipt title/copy.

5. Issue: Bottom planned-next note repeats hero helper.
   Fix: Keep only in live/starter/planned panel.
   Likely files: `apps/web/src/app.js`.
   Risk: low.
   Tests: no.

## 15. Implementation Blueprint For Phase 15B

Files likely to change:

- `apps/web/src/app.js`
- `apps/web/src/ui-models.js`
- `apps/web/src/ui-models.test.mjs`
- `apps/web/src/styles.css`

Recommended section order:

1. Hero
2. What happens
3. Goal and budget start card
4. Agent decision and source capsule
5. Compact agent evaluation
6. Spend approval and recipient wallet
7. Pay on Arc and proof check
8. Result preview
9. Payment trail and shareable receipt
10. Optional Dispatch handoff
11. Run history
12. Live/starter/planned explanation
13. Nano activity

Copy changes:

- Hero subtitle: make more concrete.
- `Judge test path` -> `How to test Nano`.
- `Proof gate` -> `Proof check`.
- `Wallet-scoped history` -> `Run history`.
- `Use Nano with a Dispatch task` -> `Optional Dispatch handoff`.
- Keep all proof honesty labels unchanged.

CSS/layout changes:

- Make goal/budget card stronger and earlier.
- Make proof check full-width when active.
- Reduce visual weight of supporting sections.
- Reduce spend row text density.
- Add mobile spacing rules for shorter first-run path.
- Keep current dark navy/mint design system.

Model/test changes if needed:

- Update `buildNanoJudgeCommandCenterModel` label expectations.
- Add tests ensuring renamed labels still preserve live/starter/planned honesty.
- Keep tests that prevent Gateway/x402 from unlocking source or paid states.
- Keep tests that `Paid with proof` requires verified Arc proof.

Manual QA checklist:

- Open `/nano` disconnected.
- Confirm a non-technical user sees what Nano does within the first screen.
- Connect wallet.
- Create Nano budget.
- Confirm source capsule remains locked before proof.
- Approve source spend.
- Confirm approved state does not say paid.
- Confirm `Pay source on Arc` appears only when ready.
- Verify invalid/local/pending proof does not unlock result.
- Verify real Arc proof unlocks source/result if available.
- Confirm `View shareable receipt` is easy to find.
- Check `/nano?receipt=<budgetId>` receipt state.
- Check mobile at 390px, 430px, and 720px.

Stop conditions:

- Any change would weaken proof gating.
- Any change would claim Gateway/x402/Circle Wallets/Nanopayments are live.
- Any change would require backend, contract, Arc config, settlement, funding, review/release/dispute, secrets, or deploy changes.
- Any change would add fake source access, fake receipt, fake payment, fake tx hash, fake users, or fake traction.

Phase 15B can proceed safely if it stays UI/order/copy/CSS focused and preserves all current proof-honesty tests.
