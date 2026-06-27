# AGENTS.md

## Required Reading For Dispatch Work

Before future Codex work on Dispatch, read:

- `docs/dispatch-source-of-truth.md`
- `docs/arc-circle-sources.md`
- `docs/circle-tool-usage.md`
- `docs/lepton-dispatch-nano-spec.md`
- `docs/lepton-dispatch-nano-build-order.md`

Create a TODO checklist before working and follow it.

For Dispatch Nano work, follow the build order. Do not skip phases unless the user explicitly requests it.

## Current Product Direction

Dispatch is a USDC-powered AI work marketplace on Arc Testnet.

Dispatch Nano is the Lepton module: an agent budget router where agents earn from humans, spend from user-funded budgets, pay other agents, and pay creators, sources, and tools per use using tiny USDC payments on Arc.

Current direction:

- Arc
- Circle
- USDC
- Dispatch Nano
- agent budget routing
- agent-to-agent payments
- creator/source/tool payouts
- visible payment trails

Do not reintroduce older chain/product positioning as the active story.

## Hard Locks

Do not change unless explicitly requested:

- backend routes
- contracts
- wallet funding logic
- settlement logic
- task lifecycle logic
- Arc config
- private keys or env secrets
- external agent registration logic
- review/revision/dispute behavior

Do not deploy production unless explicitly asked.

Do not fake:

- payments
- transaction hashes
- balances
- users
- earnings
- ratings
- reviews
- traction
- task history
- completed work
- endpoint health
- owner proof
- compatibility results
- Nano spend receipts

## Built-In Default Agent

The built-in default agent exists to solve the marketplace cold-start problem.

It is not the product. It is the platform's default launch worker inside a multi-agent marketplace.

Stable rules:

- Do not rebuild the built-in default agent from scratch unless explicitly requested.
- Do not turn the product into a single-agent assistant experience.
- Keep the built-in agent visible as a normal marketplace agent profile.
- Treat it as the benchmark worker that future external agents compete against.
- Preserve normal marketplace behavior: registry presence, task stats, approval rate, earnings history, and settlement history.
- Avoid hidden hardcoded shortcut behavior in the UI or execution path when a marketplace-shaped path already exists.

Preferred labels:

- `Platform Agent`
- `Default Agent`

Avoid labels or UI language that imply:

- this is the whole app
- this is the only worker that matters
- this is a privileged standalone assistant surface

## Marketplace Positioning

The marketplace should continue to feel like a marketplace even when the built-in agent is doing useful work.

Stable rules:

- Keep the built-in agent hireable/discoverable through the same marketplace surfaces as other agents.
- Show marketplace-facing identity badges such as `Platform Agent` instead of app-wide assistant framing.
- Let the built-in agent accumulate stats like other agents.
- Present it as the launch benchmark and default worker, not a hidden admin bypass.
- Any UI explanation should clarify that it is the platform's default worker available at launch.

## Quality Engine

The built-in default agent should use a reusable execution-quality engine rather than a one-off hardcoded path.

Current stable pipeline:

1. Task structuring
2. First draft generation
3. Evaluation
4. Improvement
5. Optional polish

Stable rules:

- Reuse and refine the existing staged quality engine instead of duplicating parallel pipelines.
- Keep the quality engine reusable so future external agents can be compared against it or plug into similar evaluation logic.
- Do not scatter stage logic across unrelated files when a shared quality-engine path already exists.
- Prefer incremental improvements to task structuring, evaluation, and polishing over architectural rewrites.

## Quality Modes

### Fast

Required flow:

1. Structure
2. Generate
3. Return

Rules:

- Optimize for speed and acceptable usefulness.
- Skip evaluation and refinement unless explicitly required by a future feature.

### Balanced

Required flow:

1. Structure
2. Generate
3. Evaluate
4. Improve
5. Return

Rules:

- This is the default middle path when the task warrants more than a raw draft.
- Preserve evaluation-guided improvement.

### High Quality

Required flow:

1. Structure
2. Generate
3. Evaluate
4. Improve
5. Optional re-evaluate
6. Polish
7. Return

Rules:

- Use when higher-value, attachment-heavy, or review-sensitive marketplace work warrants the extra pass depth.
- Keep polish meaning-preserving; improve readability and sharpness without changing supported meaning.

## Prompt Layer

Prompts for the built-in default agent must remain centralized, maintainable, and versioned.

Required prompt stages:

- task structuring
- generation
- evaluation
- improvement
- final polish

Stable rules:

- Do not scatter prompt strings throughout runtime code.
- Keep prompts in a clean prompt layer that is easy to update later.
- Version prompts so future benchmark changes can be tracked.
- Make prompt components reusable where possible for future external-agent benchmarking and comparisons.

## Result Quality Expectations

The built-in agent should produce marketplace-worker results, not open-ended assistant chatter.

Stable rules:

- Favor grounded, task-shaped outputs over generic assistant prose.
- Use evaluation dimensions that include relevance, clarity, completeness, format adherence, and usefulness.
- Improvement should respond to evaluation feedback instead of restating the first draft.
- Polish should tighten readability without inventing unsupported detail.
- When source evidence is thin, prefer bounded confidence and explicit uncertainty over confident guessing.

## Persistence And Benchmarking

The built-in default agent is also the platform benchmark worker.

Persist for each run when the infrastructure supports it:

- raw task input
- structured task object
- draft output
- evaluation result
- improved result
- final result
- stage timings
- score
- confidence
- approval or rejection outcome
- settlement outcome

Stable rules:

- Do not remove these stage artifacts casually.
- Treat them as important for debugging, analytics, leaderboard logic, and future agent-vs-agent comparisons.

## Result Screen

Built-in agent task results should feel premium and marketplace-native.

Preferred result metadata:

- Final Output
- Quality Score
- Confidence
- Mode Used
- optional View Draft
- optional Improve Again

Stable rules:

- Keep the interface clean and non-noisy.
- Expose quality metadata without overwhelming the task detail page.
- Present the run as a marketplace worker result, not a chat transcript.

## Arc-Native Review Rules

Stable rules:

- Keep the product marketplace-first: post task, execute work, review result, settle payment, update reputation.
- Do not collapse Dispatch into a chat assistant or protocol dashboard.
- Route the Platform Agent through the same review credibility rails as other agents whenever practical.
- Preserve multi-validator aggregation for AI-backed result verification; do not revert to a single scorer as the source of truth.
- Preserve the Equivalence Principle: accept different outputs when they solve the task equivalently; avoid brittle exact-match logic.
- Keep disputes and appeals payout-blocking until review reaches a payout-safe state.
- Keep the onchain/offchain split honest in code and copy.
- Keep the UI simple: surface quality score, confidence, validator agreement, and result state without exposing protocol internals as the primary experience.

## Change Guidance

When improving Dispatch:

- sharpen the existing implementation before proposing replacement architecture
- preserve marketplace framing
- preserve reusable quality-engine design
- preserve centralized prompt versioning
- preserve benchmarkability and stage persistence
- prefer evolutionary changes over wholesale rewrites unless explicitly requested
- preserve data honesty
- do not deploy unless explicitly instructed
