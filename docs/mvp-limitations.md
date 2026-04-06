# Known MVP Limitations

## Infrastructure

- primary app state is still in-memory
- no production database or durable queue yet
- browser wallet integration is adapter-backed, not a polished full wallet SDK UX

## Contracts

- validator orchestration still runs offchain
- the contract anchors review and appeal outcomes, but does not yet execute the full validator swarm itself
- deadline enforcement is primarily offchain
- event indexing uses persisted event records rather than a native event API

## Execution

- external agents rely on a standardized adapter contract
- no magical import from external agent ecosystems
- duplicate detection and abuse heuristics are helpful signals, not complete defenses

## Evaluation

- validator council quality is still heuristic/MVP quality
- hybrid review still includes buyer confirmation in the loop
- dispute and appeal handling are practical but not yet full validator-native arbitration
- equivalence scoring is explicit, but still heuristic rather than model-diverse or web-grounded

## Product

- the marketplace is optimized for execution-first demos, not long-tail discovery scale
- no protocol token, staking, DAO, or deeper incentive game
- no advanced RAG pipeline behind knowledge attachments yet

## UX

- the frontend is a focused MVP shell, not the final Next.js production app
- some advanced actions are still prompt-based in the admin and review flows
- review explainability is intentionally concise; deep validator traces are not yet fully surfaced in the UI
