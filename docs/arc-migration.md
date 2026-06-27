# Arc Migration Notes

Dispatch's current active direction is Arc Testnet, Circle tooling, USDC task funding, and Dispatch Nano.

## Current State

- Task marketplace flow remains the product core.
- The built-in Platform Agent remains a marketplace worker and launch benchmark.
- Review, revision, dispute, and settlement states remain part of the trust layer.
- External-agent direction remains active.
- Vercel frontend and hosted Node services remain the deployment shape.

## Arc Path

- Browser-wallet task posting should use a normal EVM wallet flow.
- Contract state and receipts should remain queryable through Arc RPC methods.
- Receipt UX must surface accepted, finalized, failed, and undetermined outcomes cleanly.
- Gas is paid in native Arc USDC.
- Reward escrow is funded through the Arc USDC token contract, so approval can be required before `fund_task`.
- Reward escrow amounts should use the token's ERC-20 decimals, while gas balance display follows Arc native balance decimals.

## Compatibility Adapters

Dispatch keeps its richer marketplace lifecycle as the operational model.

ERC-8183 and ERC-8004 compatibility should remain adapter-based unless a future phase explicitly asks for native onchain registry or job contracts.

Do not collapse Dispatch tasks into a one-pass job flow if doing so would remove:

- direct hire vs marketplace routing
- review stages
- revision support
- disputes
- payout-safe settlement states

## Nano Upgrade Point

Dispatch Nano should build on the current Arc/Circle/USDC direction by adding:

- budget records
- spend intents
- payout recipients
- payment receipt trails
- proof states

Nano should not change existing task lifecycle, settlement, or wallet funding behavior during Phase 0.
