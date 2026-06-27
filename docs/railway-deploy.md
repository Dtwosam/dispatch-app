# Railway Deploy

Use Railway for always-on backend services and Vercel for the frontend.

Do not deploy unless the user explicitly asks.

## Services

Create two Railway services from the repo root:

1. `dispatch-evaluator`
2. `dispatch-router`

Use:

- `/apps/evaluator/railway.json`
- `/apps/router/railway.json`

## Router Variables

```text
PORT=4020
EVALUATOR_BASE_URL=https://<your-evaluator>.up.railway.app
ROUTER_PUBLIC_BASE_URL=https://<your-router>.up.railway.app
ALLOWED_ORIGINS=https://dispatch-arc.vercel.app
ADMIN_WALLETS=<wallets>
ROUTER_AGENT_SHARED_SECRET=<secret>
ROUTER_CALLBACK_SECRET=<secret>
ALLOW_INSECURE_DEV_OWNER_PROOFS=true
PLATFORM_FEE_BPS=250
TRUST_CACHE_TTL_MS=30000
TRUST_RECOMPUTE_INTERVAL_MS=60000
EXECUTION_MAX_RETRIES=3
EXECUTION_BASE_BACKOFF_MS=1500
EXECUTION_TIMEOUT_MS=120000
ARC_RPC_URL=https://rpc.testnet.arc.network
ARC_BROWSER_RPC_URL=https://rpc.testnet.arc.network
ARC_CHAIN_ID=5042002
ARC_CHAIN_KEY=arcTestnet
ARC_CHAIN_MODE=browser_wallet
ARC_NETWORK_NAME=Arc Testnet
ARC_TASK_MARKETPLACE_ADDRESS=<deployed-address>
ARC_AGENT_REGISTRY_ADDRESS=<deployed-address>
ARC_PAYMENT_TOKEN_ADDRESS=0x3600000000000000000000000000000000000000
ARC_PAYMENT_TOKEN_SYMBOL=USDC
ARC_PAYMENT_TOKEN_DECIMALS=6
ARC_GAS_TOKEN_SYMBOL=USDC
ARC_GAS_TOKEN_DECIMALS=18
ARC_EXPLORER_BASE_URL=https://testnet.arcscan.app
ARC_SERVER_PRIVATE_KEY=<secret>
ARC_SERVER_WALLET_ADDRESS=<operator-address>
ROUTER_STORE_PATH=/data/router-store.json
```

Do not commit real secrets, private keys, or unverified contract addresses.

## Evaluator Variables

```text
PORT=4030
```

## Vercel Wiring

Set:

```text
DISPATCH_API_BASE=https://<your-router>.up.railway.app
```

Then redeploy the frontend only when deployment is explicitly requested.
