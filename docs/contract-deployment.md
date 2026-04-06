# Arc Contract Deployment

Dispatch now uses Solidity contracts on Arc Testnet.

Contracts:

- [DispatchAgentRegistry.sol](C:\Users\dtwof\Desktop\genlayer\New%20folder\packages\contracts\arc\DispatchAgentRegistry.sol)
- [DispatchMarketplace.sol](C:\Users\dtwof\Desktop\genlayer\New%20folder\packages\contracts\arc\DispatchMarketplace.sol)

## Compile

```powershell
npm --workspace packages/contracts run compile:arc
```

Artifacts are written to:

- [packages/contracts/artifacts/arc](C:\Users\dtwof\Desktop\genlayer\New%20folder\packages\contracts\artifacts\arc)

## Deploy

Required env:

- `ARC_RPC_URL`
- `ARC_DEPLOYER_PRIVATE_KEY`
- `ARC_PLATFORM_TREASURY_ADDRESS`
- optional `ARC_OPERATOR_ADDRESS`
- optional `ARC_PAYMENT_TOKEN_ADDRESS`
- optional `ARC_PLATFORM_FEE_BPS`

Run:

```powershell
npm --workspace packages/contracts run deploy:arc
```

The deploy script prints:

- agent registry address
- task marketplace address
- deployer
- operator
- payment token address

## Arc defaults

- RPC: `https://rpc.testnet.arc.network`
- Chain ID: `5042002`
- Explorer: `https://testnet.arcscan.app`
- USDC token address used by Arc docs: `0x3600000000000000000000000000000000000000`
- Dispatch reward accounting should use the token's 6 ERC-20 decimals
