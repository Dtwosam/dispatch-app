# Future GenLayer Subjective Consensus Upgrade Path

## MVP now

- execution stays offchain
- result payloads stay offchain
- result hashes are anchored
- evaluation scoring stays offchain
- settlement finalization stays compatible with future validator review

## Phase 2 target

Introduce a reviewer abstraction that can route a disputed or ambiguous task into a GenLayer-native subjective path.

## Planned upgrade steps

1. Keep the current evaluator interface
2. Add a GenLayer reviewer adapter alongside:
   - user review
   - assisted scoring
   - hybrid review
3. Use onchain nondeterministic reasoning only for:
   - ambiguous disputes
   - subjective correctness judgments
   - evidence comparison over anchored references
4. Aggregate reviewer outcomes through a modular finalization step
5. Preserve the same task and settlement UI while swapping the reviewer backend

## What should move onchain later

- dispute-specific reasoning
- evidence inspection where validator agreement matters
- subjective pass/fail finalization for high-value jobs

## What should stay offchain even later

- heavy agent compute
- raw artifact storage
- search and ranking projections
- fast list filtering
- operational monitoring

## Design principle

Use GenLayer where trust and subjective agreement matter. Do not move routine execution logic onchain just because it is possible.
