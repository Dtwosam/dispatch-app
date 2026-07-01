# Dispatch Nano Phase 15G x402/Gateway Source Endpoint

Phase: 15G - x402/Gateway Source Endpoint

Status: implemented as an unpaid, Nano-scoped payment-required endpoint. Buyer-side Gateway payment and settlement proof remain Phase 15H.

## What Changed

Dispatch Nano now includes a router endpoint:

```text
GET /api/nano/x402/source-brief
```

An unpaid request returns HTTP `402 Payment Required` with x402/Gateway-compatible payment requirement metadata for a locked source brief.

The endpoint does not return unlocked source content, a paid state, a transaction hash, a Gateway receipt, or any fake settlement proof.

## Official Sources Used

- Circle Gateway Nanopayments: https://developers.circle.com/gateway/nanopayments
- Circle x402 concept: https://developers.circle.com/gateway/nanopayments/concepts/x402
- Circle seller quickstart: https://developers.circle.com/gateway/nanopayments/quickstarts/seller
- Circle SDK reference: https://developers.circle.com/gateway/nanopayments/references/sdk
- Arc docs: https://docs.arc.network/

## Source Metadata

```text
sourceId: nano-source-brief-stablecoin-payments
sourceTitle: Stablecoin payments source brief
sourceType: source
price: 0.001
currency: USDC
chain: Arc Testnet
paymentProtocol: x402
paymentRail: Circle Gateway Nanopayments-compatible
state: payment_required
```

Reason:

```text
The agent wants paid context before producing the final brief.
```

## How To Test The Unpaid 402 Path

Run the router, then request:

```powershell
Invoke-WebRequest "http://localhost:4020/api/nano/x402/source-brief" -Method GET
```

Expected result:

- HTTP status is `402`.
- Response includes a `PAYMENT-REQUIRED` header.
- Response body includes `state: "payment_required"`.
- Response body includes `paid: false`.
- Response body includes `unlocked: false`.
- Response body includes `unlockedPayload: null`.
- Response body does not include a fake `txHash`.
- Response body does not include a fake `gatewayReceipt`.

## Live Versus Not Live

Live:

- Nano can expose a payment-required source endpoint.
- Nano can describe the source, price, rail, chain, and reason.
- Nano can keep source content locked when no verified buyer proof exists.
- The browser Nano flow still uses verified Arc proof for paid/unlocked state.

Not live yet:

- Buyer-side Gateway payment.
- Gateway Nanopayments settlement.
- x402 paid resource retry with a valid buyer signature.
- Gateway receipt ingestion.
- Any paid/unlocked label from Gateway proof.

## Why This Strengthens Nano

This makes Nano more than a mock interface: a real router endpoint can now behave like a paid source path by returning HTTP `402 Payment Required`.

It still preserves the core honesty rule: the endpoint is payment-required, not paid. Nano only marks the browser source/result as paid and unlocked after verified Arc proof in the current live flow.

## Honest Demo Wording

Use:

```text
Nano includes a Nano-scoped x402/Gateway-compatible source endpoint that returns HTTP 402 payment-required metadata. The live browser unlock path still uses verified Arc proof until Gateway/Nanopayments buyer proof is implemented.
```

Avoid:

- Gateway payment is live.
- Nanopayments are settling Nano source access.
- x402 has unlocked source content.
- Gateway receipt verified.
- Paid with Gateway proof.

## Phase 15H Needed

Phase 15H should add buyer-side proof only if it can be implemented honestly:

- real buyer payment signature
- real Gateway verification or settlement path
- distinct Gateway/x402 receipt model
- tests proving invalid, pending, or unavailable Gateway proof does not unlock content
- UI labels that keep Arc proof and Gateway proof separate
