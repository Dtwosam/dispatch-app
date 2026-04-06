# Chain Integration

## Flow

1. The web app creates an offchain draft through `POST /api/task-market/tasks/draft`.
2. The web app calls the Arc browser wallet wrapper in `apps/web/src/chain-client.js`.
3. The chain adapter writes `create_task`, then `fund_task`, and `assign_task` for direct hire when configured.
4. The frontend polls receipts through `/api/chain/receipts/:hash`.
5. Once a receipt reaches `ACCEPTED`, `FINALIZED`, `FAILED`, or `UNDETERMINED`, the web app syncs the task through `POST /api/chain/tasks/:taskId/sync`.
6. Task detail reads both offchain state and an optional onchain snapshot.

## Modes

- `read_only`
  - reads and receipt queries only
- `server_signer_proxy`
  - router uses an operator key for limited Arc admin or maintenance writes
- `browser_wallet`
  - frontend signs buyer-side task writes directly through an injected wallet such as MetaMask

## Arc Testnet Path

The current live-network localhost path is:

1. Set Arc environment values from [C:\Users\dtwof\Desktop\genlayer\New folder\.env.arc.example](C:\Users\dtwof\Desktop\genlayer\New%20folder\.env.arc.example).
2. Keep `ARC_CHAIN_KEY=arcTestnet`.
3. Choose one:
   - `ARC_CHAIN_MODE=server_signer_proxy` for operator-maintained writes
   - `ARC_CHAIN_MODE=browser_wallet` for browser-signed buyer flows
4. Run `npm run dev:arc`.

The app now supports both paths:

- operator-signed writes for limited admin workflows
- browser-signed writes for user-wallet task posting in the static shell

## Arc assumptions

- Frontend task posting should use a normal EVM wallet flow.
- Contract state and receipts should remain queryable through Arc RPC methods.
- Receipt UX must surface accepted, finalized, failed, and undetermined outcomes cleanly.
- Gas is paid in native Arc USDC.
- Reward escrow is funded through the Arc USDC token contract, so approval can be required before `fund_task`.
- Reward escrow amounts should use the token's ERC-20 decimals, while gas balance display follows Arc native balance decimals.

## Current Explicit Assumptions

- The current static-shell frontend keeps wallet logic isolated behind the frontend adapter instead of scattering EVM calls through UI code.
- The Arc server signer proxy requires:
  - `ARC_SERVER_PRIVATE_KEY`
  - `ARC_TASK_MARKETPLACE_ADDRESS`
  - `ARC_RPC_URL`
- Reward amounts are treated as 6-decimal ERC-20 USDC token amounts.
- Buyer-funded task posting should normally run through `browser_wallet` mode because ERC-20 escrow transfers cannot safely be proxied from the router for arbitrary user wallets.
