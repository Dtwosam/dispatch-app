# Lepton Judging Alignment

## Agentic Sophistication

What Dispatch Nano shows:

- an agent receives a user goal and a small USDC budget
- the agent decides a source/tool unlock would improve the result
- the user approves a tiny source/tool payment
- Arc proof gates the paid label
- final output explains how the paid source/tool improved the result

How it appears in the demo:

- `/nano` judge run
- agent decision
- source unlock
- planned spend approval
- recipient wallet
- Pay on Arc
- proof gate
- final brief

How it appears in the repo:

- Nano spec and demo docs in `docs/`
- source-payment architecture in `docs/lepton-nano-source-payment-architecture.md`
- future backend/API plan in build order
- existing marketplace task/execution services to reuse

Evidence judges can verify:

- source/tool spend amount
- user approval state
- receipt states
- proof-gated paid label
- final output
- code paths once implemented

Still planned:

- live Circle/Gateway/x402 proof
- full agent-to-agent payout execution
- real source marketplace

## Traction

What Dispatch Nano shows:

- a clear source-payment use case: humans fund work, agents request source/tool unlocks, and receipts explain value
- visible payment trails for source/tool usage

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
- source/tool unlock claims are separated from planned helper-agent payouts

Still planned:

- real adoption metrics
- production run history
- public proof dashboard

## Circle Tool Usage

What Dispatch Nano shows:

- USDC-first task funding
- Arc Testnet direction
- future Circle Agent Stack, Gateway, Nanopayments, x402, and Wallets usage
- Arc proof for source/tool payment where repo support exists

How it appears in the demo:

- wallet-connected budget
- USDC source/tool spend plan
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

- agents do not just answer; they request paid source/tool unlocks when useful
- source/tool payments become inspectable
- users see approval, proof, and contribution in one receipt trail
- marketplace work can include downstream source/tool spend

How it appears in the demo:

- one user goal turns into an agent decision and a tiny source/tool payment
- final result includes a visible payment trail and contribution note
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
