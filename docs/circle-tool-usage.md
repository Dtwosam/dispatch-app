# Circle Tool Usage Plan

This document explains how Circle tools relate to Dispatch Nano. It does not claim integrations are complete unless listed as implemented.

## Circle Agent Stack

Purpose:

- agent-native tooling for wallets, onchain transactions, Circle Skills, and service payments
- reference direction for agents that earn, spend, and pay for services

Status:

- planned/referenced only

Dispatch Nano usage:

- guide the architecture for agent budgets and spend plans
- align demo language with agent wallets, x402 services, and USDC spend receipts

Must not claim yet:

- production Circle Agent Stack integration
- live Circle-controlled agent wallets
- autonomous payments without user-approved budgets

## Circle Wallets

Purpose:

- possible wallet model for agent budgets, payouts, and managed spend policies

Status:

- planned

Current repo:

- current task funding uses browser-wallet flow through existing Arc wallet logic

Must not claim yet:

- Circle Wallet custody
- Circle Wallet balances
- Circle Wallet spend policies
- Circle Wallet payouts

## Circle Gateway

Purpose:

- future unified balance and settlement rail for high-frequency USDC payments

Status:

- planned

Dispatch Nano usage:

- future payment proof for source/tool/agent payouts
- possible bridge from budget deposits to spend receipts

Must not claim yet:

- Gateway wallet balances
- Gateway settlement
- Gateway-backed payment receipts

## Nanopayments

Purpose:

- gas-free USDC nanopayments for sub-cent or tiny pay-per-use service access
- relevant to agentic commerce, source unlocks, tools, data, and API calls

Status:

- planned

Dispatch Nano usage:

- tiny per-use payments in the Nano spend plan
- visible receipt trail showing amount, recipient type, and proof state

Must not claim yet:

- live gas-free nanopayments
- sub-cent payment completion
- batched settlement proof

## x402

Purpose:

- HTTP payment pattern where a paid resource can request payment before serving content

Status:

- planned

Dispatch Nano usage:

- source/tool APIs can become x402-protected resources later
- agent spend intent can map to payment-required resource access

Must not claim yet:

- x402 middleware
- x402 service discovery
- x402 paid content access

## Circle Skills / MCP

Purpose:

- source-backed guidance for Circle SDKs, chain IDs, addresses, Gateway, wallets, and Arc usage

Status:

- referenced only

Dispatch Nano usage:

- implementation planning
- verification of addresses, network details, and SDK flows before coding

Must not claim yet:

- MCP-powered runtime
- Circle Skills as product features

## USDC On Arc

Purpose:

- current token and gas direction for Dispatch task funding and future Nano budgets

Status:

- implemented/referenced for current Arc task funding path

Current repo:

- Arc Testnet values appear in `.env.example`
- wallet funding is isolated in `apps/web/src/chain-client.js`
- router chain support is isolated in `apps/router/src/services/arcChainService.ts`

Must not claim yet:

- mainnet settlement
- Nano payment proof
- Circle Gateway receipts

## What Is Already Implemented

- Arc Testnet configuration and docs
- USDC reward/token direction
- browser-wallet task funding path
- receipt polling and sync support
- task review/release lifecycle surfaces

## What Is Planned

- Nano budget records
- agent spend intents
- source/tool/creator/agent payout recipients
- visible Nano receipt trail
- Circle Gateway/Nanopayments/x402 proof where feasible
- judge demo that clearly separates planned proof from implemented proof

## Claims To Avoid

Do not claim:

- Circle Wallets are active
- Gateway is settling Nano payouts
- x402 is wired
- Nanopayments are live
- agent-to-agent payments are complete
- creators/sources/tools have been paid
- receipts are real unless backed by verified payment data
