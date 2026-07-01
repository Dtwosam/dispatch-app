# Dispatch Nano Phase 15H Gateway Buyer Proof Script

Phase: 15H - Circle Gateway Nanopayments Buyer Proof Script

Status: local-only proof script. This does not change the live browser paid/unlocked state.

## What 15H Adds

Phase 15H adds:

```text
scripts/nano-x402-gateway-buyer-proof.mjs
```

The script can inspect the Phase 15G Nano source endpoint and, when locally configured with the Circle Gateway SDK and a test EOA private key, attempt the SDK buyer flow against:

```text
GET /api/nano/x402/source-brief
```

The script never belongs in browser code and never commits or prints private keys.

## How 15H Relates To 15G

Phase 15G added the Nano-scoped source endpoint that returns HTTP `402 Payment Required` metadata.

Phase 15H adds a local buyer-side script that can check that endpoint and optionally try Circle Gateway Nanopayments buyer flow.

The current `/nano` browser flow still uses verified Arc proof for paid/unlocked state.

## Dry-Run Mode

Dry-run mode requires no private key and no Circle SDK install.

```powershell
$env:NANO_X402_DRY_RUN="1"
node scripts/nano-x402-gateway-buyer-proof.mjs
```

Expected result:

- endpoint is requested
- HTTP `402` is required
- `PAYMENT-REQUIRED` metadata is parsed
- script prints `Gateway buyer payment not completed`
- no Nano state is mutated
- no paid/unlocked state is claimed

## Real Buyer Mode

Real buyer mode is local only.

Required env vars:

```text
NANO_X402_SOURCE_URL=http://localhost:4020/api/nano/x402/source-brief
CIRCLE_GATEWAY_CHAIN=arcTestnet
CIRCLE_GATEWAY_PRIVATE_KEY=<local test EOA private key>
CIRCLE_GATEWAY_SKIP_DEPOSIT=1
NANO_X402_DRY_RUN=0
```

Install the official SDK locally if it is not already installed:

```powershell
npm install --save-dev @circle-fin/x402-batching
```

Then run:

```powershell
node scripts/nano-x402-gateway-buyer-proof.mjs
```

The script uses the official buyer pattern from Circle docs:

- initialize `GatewayClient`
- check whether the endpoint supports Gateway payments when supported by the SDK
- call `client.pay(url)`
- print only a safe summary

## Private Key Safety Rules

- Never commit `.env`.
- Never commit a real private key.
- Never paste a private key into chat.
- Never place a private key in frontend code.
- Never put a private key in Vercel config for this local script.
- Never print authorization payloads, payment signatures, or private keys.
- Use testnet-only funds.

## What Counts As Proof

Dry-run proof means:

- the Nano source endpoint is payment-required
- x402/Gateway-shaped metadata is present

Real buyer proof means:

- the Circle Gateway SDK completes the buyer payment flow against the endpoint
- a safe non-secret status is printed

Even if real buyer mode succeeds, `/nano` browser paid/unlocked state must not change until router-side Gateway verification and receipt modeling are implemented honestly.

## What Is Not Claimed

Do not claim:

- Gateway settlement is live in Nano
- Nanopayments are live in the browser
- x402 paid content unlocks `/nano`
- Gateway receipts are verified by Nano
- `Paid with proof` can come from Gateway

## Submission Wording If Dry-Run Works Only

```text
Dispatch Nano includes a Nano-scoped x402/Gateway-compatible source endpoint and a local buyer proof script. Dry-run mode verifies the endpoint returns HTTP 402 payment-required metadata. The browser paid/unlocked path still uses verified Arc proof.
```

## Submission Wording If SDK Buyer Payment Succeeds

```text
Dispatch Nano includes a local Circle Gateway buyer proof script that can complete the Gateway SDK buyer flow against the Nano source endpoint. The live browser paid/unlocked state still uses verified Arc proof until router-side Gateway receipt verification is implemented.
```

## Stop Conditions

Stop if:

- private key handling would enter browser code
- a real private key would need to be committed or logged
- Gateway SDK cannot be imported locally
- Gateway setup or balance is missing
- the endpoint does not return HTTP 402
- payment-required metadata is missing
- paid/unlocked state would need to be faked
- contracts, settlement, task lifecycle, or Arc config would need to change
