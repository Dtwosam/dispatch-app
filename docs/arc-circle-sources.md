# Arc And Circle Source Map

This file tracks official Arc/Circle sources for Dispatch Nano. It is a source map, not proof that every integration is complete.

## Source Table

| Area | Official source | Official URL | Why it matters for Dispatch Nano | Repo area affected | Status | Honesty note |
| --- | --- | --- | --- | --- | --- | --- |
| Arc Testnet | Arc Docs index | https://docs.arc.network/llms.txt | Arc is the current testnet rail for USDC task funding and future Nano payment proof. | `apps/web/src/chain-client.js`, `apps/router/src/services/arcChainService.ts`, `docs/chain-integration.md` | Implemented for current Arc task funding path | Do not claim mainnet. Arc is testnet only in current docs. |
| Arc USDC gas | Arc Docs index and Circle Arc Skill | https://docs.arc.network/llms.txt, https://raw.githubusercontent.com/circlefin/skills/master/plugins/circle/skills/use-arc/SKILL.md | Arc uses USDC as native gas, which fits USDC-first agent payments. | Chain config, wallet copy, funding UX | Implemented/referenced | Native gas and ERC-20 reward USDC use different decimals. Keep copy precise. |
| Arc chain ID/RPC/explorer/faucet | Circle Arc Skill | https://raw.githubusercontent.com/circlefin/skills/master/plugins/circle/skills/use-arc/SKILL.md | Provides Arc Testnet chain ID `5042002`, RPC, explorer, and faucet references. | `.env.example`, chain docs, wallet setup | Implemented/referenced | Do not invent addresses. Use official sources or existing repo config only. |
| Circle Developer Docs | Circle docs index | https://developers.circle.com/llms.txt | Primary source index for Circle tooling and product docs. | Docs, future Nano implementation research | Referenced only | Read relevant product docs/skills before implementation. |
| Circle Agent Stack | Circle Agent Stack | https://developers.circle.com/agent-stack | Supports agent wallets, agent nanopayments, x402 service discovery, and Circle Skills. | Nano architecture, future backend/API | Planned | Do not claim agent wallets or Circle nanopayments are implemented until repo proves it. |
| Circle Wallets | Circle docs index | https://developers.circle.com/llms.txt | Potential wallet model for agent-managed budgets and payouts. | Future Nano backend/payment services | Planned | Current app uses browser wallet path; do not claim Circle Wallet custody is active. |
| Circle Gateway | Circle docs index and Gateway docs | https://developers.circle.com/llms.txt, https://developers.circle.com/gateway/nanopayments | Gateway can support unified balances and batched nanopayment settlement. | Future Nano payment proof | Planned | Gateway integration is not complete in this repo. |
| Circle Nanopayments | Circle Gateway Nanopayments | https://developers.circle.com/gateway/nanopayments | Supports gas-free USDC nanopayments and x402 payment flows for agentic commerce. | Nano source/tool/agent payout model | Planned | Planned for Lepton phases; do not fake nanopayment receipts. |
| x402 | Circle Gateway Nanopayments | https://developers.circle.com/gateway/nanopayments | Provides a pay-per-request model for sources/tools that respond with payment requirements. | Future source/tool marketplace and API access | Planned | No x402 runtime should be claimed until implemented and tested. |
| Circle MCP / Skills | Circle docs index and Arc Skill | https://developers.circle.com/llms.txt, https://raw.githubusercontent.com/circlefin/skills/master/plugins/circle/skills/use-arc/SKILL.md | Skills/MCP guide agents through Circle SDKs, chain IDs, addresses, and safe patterns. | Docs, future implementation workflow | Referenced only | MCP/Skills are planning/research aids unless explicitly wired into tooling. |
| USDC contract/address/decimals | Circle Arc Skill and Arc contract addresses | https://raw.githubusercontent.com/circlefin/skills/master/plugins/circle/skills/use-arc/SKILL.md, https://docs.arc.io/arc/references/contract-addresses.md | Nano budgets and task rewards must use real USDC decimals and addresses. | `.env.example`, `chain-client.js`, Arc services | Implemented/referenced | Existing Arc Testnet USDC address is in repo config; future changes must use official source. |
| App Kit / Unified Balance | Arc Docs index | https://docs.arc.network/llms.txt | Could simplify future crosschain USDC balance and spend UX. | Future wallet/balance UX | Referenced only | Not implemented unless a future phase adds it. |

## Current Implementation Boundary

Implemented today:

- Arc Testnet config exists in repo docs/env.
- Browser-wallet task funding path exists behind current frontend chain client.
- Router-side Arc service exists for chain status, receipts, and server-side chain support.
- USDC reward wording and decimals are part of the current Arc path.

Planned for Nano:

- Circle Agent Stack usage
- Circle Wallet selection
- Gateway/Nanopayments/x402 usage
- source/tool/creator payout proof
- Nano receipt trails backed by verified payment data

## Honesty Rule

Do not claim Circle Gateway, Circle Wallets, x402, Nanopayments, App Kit, or agent-to-agent payment proof is complete unless the repo includes working code and checks for it.
