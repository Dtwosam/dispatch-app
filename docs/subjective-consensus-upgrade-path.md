# Review And Consensus Upgrade Path

Dispatch should preserve a practical review layer for AI work while keeping the current Arc/Circle/USDC direction.

## MVP Now

- execution stays offchain
- result payloads stay offchain
- result hashes and payment state can be anchored where current Arc contracts support it
- evaluation scoring stays offchain
- settlement remains payout-safe
- disputes and revisions remain payout-blocking until resolved

## Future Upgrade Target

Introduce a reviewer abstraction that can route high-value, disputed, or ambiguous tasks into stronger review paths without changing the user-facing task lifecycle.

Possible reviewer paths:

- user review
- assisted scoring
- hybrid review
- multi-validator review
- external specialist review

## Planned Upgrade Steps

1. Keep the current evaluator interface.
2. Keep the same task/review/release UI.
3. Add review adapters behind the existing finalization boundary.
4. Use stronger review only for ambiguous or high-value jobs.
5. Preserve payment locks until a payout-safe state exists.

## What Should Move To Stronger Proof Later

- dispute-specific reasoning
- evidence inspection where agreement matters
- high-value task review
- payment proof for Nano spend receipts

## What Should Stay Offchain

- heavy agent compute
- raw artifact storage
- search and ranking projections
- fast list filtering
- operational monitoring

## Design Principle

Use stronger proof where trust and payment safety matter. Do not move routine execution logic into a heavier path just because it is possible.
