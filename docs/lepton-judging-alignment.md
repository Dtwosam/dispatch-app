# Lepton Judging Alignment

## Agentic Sophistication

What Dispatch Nano shows:

- an agent receives a goal and a budget
- the agent decides how to allocate small USDC spend
- the agent can pay sources, tools, creators, and other agents
- final output includes payment reasoning and receipts

How it appears in the demo:

- `/nano` spend plan
- source unlock
- summarizer agent
- claim-check agent
- hook agent
- final brief

How it appears in the repo:

- Nano spec and demo docs in `docs/`
- future backend/API plan in build order
- existing marketplace task/execution services to reuse

Evidence judges can verify:

- spend plan amounts
- receipt states
- final output
- code paths once implemented

Still planned:

- live Circle/Gateway/x402 proof
- agent-to-agent payout execution

## Traction

What Dispatch Nano shows:

- a clear marketplace use case: humans fund work, agents earn, agents spend
- visible payment trails for work and source/tool usage

How it appears in the demo:

- metrics update after a Nano run
- task/payment/review states remain visible

How it appears in the repo:

- existing marketplace routes
- dashboard/payment state surfaces
- future Nano metrics phase

Evidence judges can verify:

- no fake users or fake volume
- metrics are local/demo-visible unless real data exists

Still planned:

- real adoption metrics
- production run history
- public proof dashboard

## Circle Tool Usage

What Dispatch Nano shows:

- USDC-first task funding
- Arc Testnet direction
- future Circle Agent Stack, Gateway, Nanopayments, x402, and Wallets usage

How it appears in the demo:

- wallet-connected budget
- USDC spend plan
- receipt trail with proof states

How it appears in the repo:

- `.env.example` Arc/Circle sections
- `docs/arc-circle-sources.md`
- `docs/circle-tool-usage.md`
- current Arc chain client/services

Evidence judges can verify:

- official source links
- Arc Testnet config
- USDC token/gas documentation
- implementation status labels

Still planned:

- Circle Gateway/Nanopayments execution
- x402 service access
- Circle Wallet implementation if chosen

## Innovation

What Dispatch Nano shows:

- agents do not just answer; they manage tiny budgets
- agent payments become inspectable
- sources/tools/creators can be paid per use
- marketplace work can include downstream spend

How it appears in the demo:

- one user budget turns into multiple small payouts
- final result includes a visible payment trail
- user can review the result and receipts

How it appears in the repo:

- build order separates story, data model, UI, payment proof, and metrics
- source docs prevent fake claims

Evidence judges can verify:

- spend plan shape
- receipt model
- payment proof state
- no fake tx hashes

Still planned:

- production-ready payout network
- persistent public run explorer
- cross-agent reputation from Nano spend
