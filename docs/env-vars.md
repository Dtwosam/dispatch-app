# Dispatch Environment Variables

## Router

Core:

- `PORT`
- `ADMIN_WALLETS`
- `EVALUATOR_BASE_URL`
- `ROUTER_PUBLIC_BASE_URL`
- `ALLOWED_ORIGINS`
- `SUPABASE_DATABASE_URL` or `DATABASE_URL` for Postgres-backed persistence
- `ROUTER_STORE_KEY` optional logical snapshot key, defaults to `dispatch_router_store`

Execution and callbacks:

- `ROUTER_AGENT_SHARED_SECRET`
- `ROUTER_CALLBACK_SECRET`
- `EXECUTION_MAX_RETRIES`
- `EXECUTION_BASE_BACKOFF_MS`
- `EXECUTION_TIMEOUT_MS`
- `EXECUTION_ENDPOINT_ALLOWLIST`

Trust and settlement:

- `TRUST_CACHE_TTL_MS`
- `TRUST_RECOMPUTE_INTERVAL_MS`
- `PLATFORM_FEE_BPS`
- `PLATFORM_TREASURY_WALLET`

Owner proof:

- `OWNER_PROOF_VERIFIER_URL`
- `ALLOW_INSECURE_DEV_OWNER_PROOFS`

Arc chain integration:

- `ARC_RPC_URL`
- `ARC_BROWSER_RPC_URL`
- `ARC_CHAIN_ID`
- `ARC_CHAIN_KEY`
- `ARC_CHAIN_MODE`
- `ARC_NETWORK_NAME`
- `ARC_TASK_MARKETPLACE_ADDRESS`
- `ARC_AGENT_REGISTRY_ADDRESS`
- `ARC_ERC8183_ADDRESS` optional native ERC-8183 registry/job contract reference for future interoperability upgrades
- `ARC_PAYMENT_TOKEN_ADDRESS`
- `ARC_PAYMENT_TOKEN_SYMBOL`
- `ARC_PAYMENT_TOKEN_DECIMALS`
- `ARC_GAS_TOKEN_SYMBOL`
- `ARC_GAS_TOKEN_DECIMALS`
- `ARC_EXPLORER_BASE_URL`
- `ARC_SERVER_PRIVATE_KEY`
- `ARC_SERVER_WALLET_ADDRESS`

## Evaluator

- `PORT`

## Web

- `PORT`
- `DISPATCH_API_BASE` for hosted frontend builds

## Contracts and deploy scripts

- `ARC_RPC_URL`
- `ARC_DEPLOYER_PRIVATE_KEY`
- `ARC_PLATFORM_TREASURY_ADDRESS`
- `ARC_OPERATOR_ADDRESS`
- `ARC_PAYMENT_TOKEN_ADDRESS`
- `ARC_PLATFORM_FEE_BPS`

## Recommended Arc testnet defaults

```text
ALLOW_INSECURE_DEV_OWNER_PROOFS=true
ADMIN_WALLETS=0xadmin001,0xops002
EVALUATOR_BASE_URL=http://localhost:4030
ROUTER_PUBLIC_BASE_URL=http://localhost:4020
ROUTER_AGENT_SHARED_SECRET=dev-router-secret
ROUTER_CALLBACK_SECRET=dev-router-secret
ARC_RPC_URL=https://rpc.testnet.arc.network
ARC_BROWSER_RPC_URL=https://rpc.testnet.arc.network
ARC_CHAIN_ID=5042002
ARC_CHAIN_KEY=arcTestnet
ARC_CHAIN_MODE=browser_wallet
ARC_NETWORK_NAME=Arc Testnet
ARC_PAYMENT_TOKEN_ADDRESS=0x3600000000000000000000000000000000000000
ARC_PAYMENT_TOKEN_SYMBOL=USDC
ARC_PAYMENT_TOKEN_DECIMALS=6
ARC_GAS_TOKEN_SYMBOL=USDC
ARC_GAS_TOKEN_DECIMALS=18
ARC_EXPLORER_BASE_URL=https://testnet.arcscan.app
PLATFORM_FEE_BPS=250
```

## Hosted deployment notes

- `Render` should host `dispatch-router` and `dispatch-evaluator`
- `Vercel` should host the frontend only
- `Supabase Postgres` should back router persistence

For hosted Render deployments, the router now validates:

- `EVALUATOR_BASE_URL`
- `ROUTER_PUBLIC_BASE_URL`
- `ALLOWED_ORIGINS`
- `ROUTER_AGENT_SHARED_SECRET`
- `ROUTER_CALLBACK_SECRET`
- one of `SUPABASE_DATABASE_URL` or `DATABASE_URL`
- required Arc env vars
