# Arc Migration Notes

Dispatch migrated from GenLayer to Arc Testnet with the smallest stable surface change possible.

## Preserved

- task marketplace flow
- built-in Platform Agent behavior
- result review flow
- settlement flow
- external-agent direction
- Vercel frontend + Railway backend split

## Replaced

- GenLayer Python contracts -> Arc Solidity contracts
- GenLayer chain service -> Arc EVM chain service
- GenLayer browser client -> Arc browser wallet client
- GEN reward wording -> USDC reward wording
- Bradbury explorer/RPC wiring -> Arcscan / Arc RPC wiring

## ERC-8183 decision

Dispatch keeps its richer marketplace lifecycle as the operational model.

ERC-8183 is added as a compatibility adapter, not as a hard replacement, because Dispatch tasks include:

- direct hire vs open market routing
- review stages
- disputes
- appeals
- payout-safe settlement states

Those are richer than the reference job flow and would be harmed by a forced one-pass collapse.

## ERC-8183 implementation status

Dispatch now persists an ERC-8183-compatible job envelope for each marketplace task in the router store.

Relationship:

- Dispatch task = internal source of truth
- ERC-8183 job = portable execution envelope
- agent runtime = built-in platform worker or external endpoint

Runtime behavior:

- built-in Platform Agent continues to use the Dispatch-native execution pipeline
- external-agent dispatch payloads now include an `interop.erc8183Job` object
- compatibility probes also use the same envelope shape
- settlement and review continue to be governed by Dispatch plus Arc contracts, not by the ERC-8183 adapter

Current mode:

- integration type: adapter-based
- native onchain ERC-8183 contract requirement: not required for current production path
- future upgrade point: attach `ARC_ERC8183_ADDRESS` and an onchain job reference when a native Arc job registry becomes worthwhile

## ERC-8004 decision

Dispatch keeps its internal registry as the operational source of truth today.

ERC-8004 is scaffolded as a future Arc-native identity anchoring path, especially for external agents.
