# Render + Supabase Deploy

Dispatch should run with:

- `Vercel` for the frontend
- `Render` for the `dispatch-router` and `dispatch-evaluator` Node services
- `Supabase Postgres` for persistent router storage

## 1. Create Supabase Postgres storage

Run:

- [supabase/sql/001_dispatch_state_snapshots.sql](C:\Users\dtwof\Desktop\genlayer\New%20folder\supabase\sql\001_dispatch_state_snapshots.sql)

Then copy a Postgres connection string from Supabase.

For persistent backend services, Supabase recommends:

- direct connection if your runtime supports IPv6
- session pooler if you need IPv4 compatibility

Official docs:

- [Supabase connection strings](https://supabase.com/docs/reference/postgres/connection-strings)

## 2. Create Render services

Use the repo-root [render.yaml](C:\Users\dtwof\Desktop\genlayer\New%20folder\render.yaml).

It defines:

- `dispatch-evaluator`
- `dispatch-router`

Official docs:

- [Render Blueprint spec](https://render.com/docs/blueprint-spec)
- [Render health checks](https://render.com/docs/health-checks)

## 3. Render router env vars

Required:

```text
SUPABASE_DATABASE_URL=postgres://...
or
DATABASE_URL=postgres://...

ROUTER_PUBLIC_BASE_URL=https://<your-router>.onrender.com
ALLOWED_ORIGINS=https://dispatch-arc.vercel.app
ADMIN_WALLETS=<wallets>
ROUTER_AGENT_SHARED_SECRET=<secret>
ROUTER_CALLBACK_SECRET=<secret>
EVALUATOR_BASE_URL=https://<your-evaluator>.onrender.com

ARC_RPC_URL=https://rpc.testnet.arc.network
ARC_BROWSER_RPC_URL=https://rpc.testnet.arc.network
ARC_CHAIN_ID=5042002
ARC_CHAIN_KEY=arcTestnet
ARC_CHAIN_MODE=browser_wallet
ARC_NETWORK_NAME=Arc Testnet
ARC_TASK_MARKETPLACE_ADDRESS=0x...
ARC_AGENT_REGISTRY_ADDRESS=0x...
ARC_PAYMENT_TOKEN_ADDRESS=0x3600000000000000000000000000000000000000
ARC_PAYMENT_TOKEN_SYMBOL=USDC
ARC_PAYMENT_TOKEN_DECIMALS=6
ARC_GAS_TOKEN_SYMBOL=USDC
ARC_GAS_TOKEN_DECIMALS=18
ARC_EXPLORER_BASE_URL=https://testnet.arcscan.app
ARC_SERVER_PRIVATE_KEY=0x...
ARC_SERVER_WALLET_ADDRESS=0x...
```

Optional:

```text
ROUTER_STORE_KEY=dispatch_router_store
OWNER_PROOF_VERIFIER_URL=<url>
ALLOW_INSECURE_DEV_OWNER_PROOFS=true
PLATFORM_FEE_BPS=250
EXECUTION_MAX_RETRIES=3
EXECUTION_BASE_BACKOFF_MS=1500
EXECUTION_TIMEOUT_MS=120000
EXECUTION_ENDPOINT_ALLOWLIST=<comma-separated origins>
TRUST_CACHE_TTL_MS=30000
TRUST_RECOMPUTE_INTERVAL_MS=60000
ENABLE_MARKETPLACE_SEEDING=false
```

## 4. Render evaluator env vars

Only `PORT` is required by default.

## 5. Vercel frontend env var

Set:

```text
DISPATCH_API_BASE=https://<your-router>.onrender.com
```

Then redeploy Vercel.

## 6. Notes

- The frontend remains static on Vercel.
- The router and evaluator remain long-running Express services.
- Supabase is used only for Postgres persistence here, not for backend runtime execution.
