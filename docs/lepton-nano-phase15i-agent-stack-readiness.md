# Dispatch Nano Phase 15I Agent Stack Readiness Pack

Phase: 15I - Agent Stack / Circle Wallet Readiness Pack

Status: local-only readiness check. This does not create wallets, change custody, or change Nano browser payment/proof behavior.

## What 15I Adds

Phase 15I adds:

```text
scripts/nano-agent-stack-readiness.mjs
```

The script checks local development readiness for the Circle Agent Stack path:

- Node.js version
- Circle CLI availability
- Circle CLI help surface for `wallet`, `gateway`, and `services`
- `arc-canteen` availability
- optional `arc-canteen status`

It prints a safe readiness summary and never creates wallets, imports keys, funds wallets, transfers funds, logs into services, or changes Dispatch runtime state.

## Why Agent Stack And Circle Wallets Matter For Nano

Circle Agent Stack is relevant because Nano is an AI agent source-payment layer. Future Nano phases can use agent-native tooling for managed spend policies, source/tool payments, and service discovery.

Circle Wallets matter because future agent-managed budgets may need controlled custody, signing policies, or backend-managed wallet infrastructure.

This phase does not implement those runtime paths. It only shows the local development checklist for them.

## What Is Live Now

- Arc proof browser flow.
- Nano x402 payment-required source endpoint.
- Local Gateway buyer proof script.
- Local Agent Stack / Circle CLI readiness check.

## What Is Not Live

- Circle Wallet custody.
- Agent wallet spending.
- Autonomous agent payment execution.
- Circle Wallet balances.
- Managed wallet creation.
- Circle Wallet browser payment flow.

## How To Run

```powershell
node scripts/nano-agent-stack-readiness.mjs
```

To allow a partial readiness summary when tools are missing:

```powershell
$env:NANO_AGENT_STACK_READINESS_ALLOW_PARTIAL="1"
node scripts/nano-agent-stack-readiness.mjs
```

## Expected Safe Output

The summary includes:

```json
{
  "nodeReady": true,
  "circleCliReady": false,
  "arcCanteenReady": false,
  "agentWalletRuntimeLive": false,
  "circleWalletCustodyLive": false,
  "browserPaymentChanged": false,
  "recommendedNext": "Use Agent Stack/Circle Wallets later for agent-managed spending policies after Nano Gateway proof is verified."
}
```

The exact tool readiness values depend on local installs and login state.

## Stop Conditions

Stop if:

- a private key, mnemonic, seed phrase, API key, or token would need to be committed
- a wallet would need to be created or imported
- Circle Wallet custody would need to enter the browser flow
- payment execution commands would need to run
- Nano paid/unlocked state would need to change
- Arc proof verification would need to change
- contracts, settlement, review, dispute, or task lifecycle would need to change

## Honest Submission Wording

Use:

```text
Dispatch Nano now has a local Agent Stack readiness check: Circle CLI, arc-canteen, and Circle Wallet/Agent Stack path are verified as development tooling/readiness, while live browser paid/unlocked state still uses Arc proof. Circle Wallet custody and autonomous agent spending are not claimed live.
```

Avoid:

- Circle Wallets are live.
- Agent wallets are active.
- Nano agents autonomously spend from Circle Wallets.
- Circle Wallet balances are available.
- Circle Wallet custody is used in the browser.
- Agent Stack is running production payments.

## Official Sources Used

- Circle Agent Stack: https://developers.circle.com/agent-stack
- Circle CLI: https://developers.circle.com/agent-stack/circle-cli
- Circle Wallets: https://developers.circle.com/wallets
- Circle Gateway Nanopayments: https://developers.circle.com/gateway/nanopayments
- Circle x402: https://developers.circle.com/gateway/nanopayments/concepts/x402
- Arc docs: https://docs.arc.network/
