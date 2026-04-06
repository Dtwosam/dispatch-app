# Local Setup

Dispatch now runs locally against Arc Testnet assumptions.

## Start the Arc browser-wallet stack

```powershell
npm run dev:arc
```

This starts:

- web on `http://localhost:3005`
- router on `http://localhost:4020`
- evaluator on `http://localhost:4030`
- adapter service on `http://localhost:4010`

## Read-only local mode

```powershell
npm run dev:local
```

That keeps the marketplace usable for UI and backend work without wallet funding.

## Stop the local stack

```powershell
npm run dev:stop
```

## Arc requirements

- Arc RPC: `https://rpc.testnet.arc.network`
- Chain ID: `5042002`
- Explorer: `https://testnet.arcscan.app`
- Native gas token: `USDC` with 18 native balance decimals
- Dispatch reward token: Arc USDC token address `0x3600000000000000000000000000000000000000` using 6 ERC-20 decimals
