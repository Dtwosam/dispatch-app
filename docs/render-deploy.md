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

Both services are long-running Node/Express web services. Do not move these services into Supabase Edge Functions.
The Blueprint uses Render `free` plans by default for testnet/demo deployment. Upgrade if you need always-on services without cold starts.

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
OWNER_PROOF_VERIFIER_URL=<owner-proof verifier url>

ARC_RPC_URL=https://rpc.testnet.arc.network
ARC_BROWSER_RPC_URL=https://rpc.testnet.arc.network
ARC_CHAIN_ID=5042002
ARC_CHAIN_KEY=arcTestnet
ARC_CHAIN_MODE=browser_wallet
ARC_NETWORK_NAME=Arc Testnet
ARC_TASK_MARKETPLACE_ADDRESS=0xbd79cff0ff452b566f7c84ffc4dd4a2ee24c73eb
ARC_AGENT_REGISTRY_ADDRESS=0x9bd24fdf0563e6cf6827e02eb5dfd4f84ae20eeb
ARC_PAYMENT_TOKEN_ADDRESS=0x3600000000000000000000000000000000000000
ARC_PAYMENT_TOKEN_SYMBOL=USDC
ARC_PAYMENT_TOKEN_DECIMALS=6
ARC_GAS_TOKEN_SYMBOL=USDC
ARC_GAS_TOKEN_DECIMALS=18
ARC_EXPLORER_BASE_URL=https://testnet.arcscan.app
ARC_SERVER_WALLET_ADDRESS=0x85DCC174dE5e785Cda3069154D097172F1B39aAA
ARC_SERVER_PRIVATE_KEY=<set in Render secret env only>
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
DISPATCH_ENABLE_DEMO_FUNDING_FALLBACK=false
```

Enable `DISPATCH_ENABLE_DEMO_FUNDING_FALLBACK=true` only on a demo/staging service where demo-funded tasks should be publicly available.

For external-agent registration in hosted production, set `OWNER_PROOF_VERIFIER_URL`. For Arc Testnet demos only, you may explicitly set `ALLOW_INSECURE_DEV_OWNER_PROOFS=true`, but do not treat that as production-grade wallet ownership verification.

## 4. Render evaluator env vars

Required:

```text
PORT=4030
NODE_ENV=production
```

The evaluator does not need Arc private keys or database credentials by default.

## 5. Vercel frontend env var

Set:

```text
DISPATCH_API_BASE=https://<your-router>.onrender.com
```

Then redeploy Vercel.

Do not set backend secrets in Vercel. Vercel should not receive `ARC_SERVER_PRIVATE_KEY`, `ARC_DEPLOYER_PRIVATE_KEY`, `SUPABASE_DATABASE_URL`, or `DATABASE_URL`.

## 6. Verify deployed router

After Render deploys, check:

```powershell
Invoke-RestMethod https://<your-router>.onrender.com/health | ConvertTo-Json -Depth 8
Invoke-RestMethod https://<your-router>.onrender.com/api/chain/config | ConvertTo-Json -Depth 8
Invoke-RestMethod https://<your-router>.onrender.com/api/chain/status | ConvertTo-Json -Depth 8
```

Expected:

- `chainMode: browser_wallet`
- `chainId: 5042002`
- `taskEscrowAddress: 0xbd79cff0ff452b566f7c84ffc4dd4a2ee24c73eb`
- `agentRegistryAddress: 0x9bd24fdf0563e6cf6827e02eb5dfd4f84ae20eeb`
- `paymentTokenAddress: 0x3600000000000000000000000000000000000000`
- `rpcReachable: true`
- `contractAddressesConfigured: true`

## 7. Notes

- The frontend remains static on Vercel.
- The router and evaluator remain long-running Express services.
- Supabase is used only for Postgres persistence here, not for backend runtime execution.
- Dispatch settlement is Arc Testnet/testnet USDC only until production payment integration is explicitly added.
