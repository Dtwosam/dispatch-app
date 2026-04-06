# Seed Scripts

The MVP demo seed currently boots automatically from the router on first start.

## Primary seed entry

- Runtime seed module:
  - `apps/router/src/seed/seedMarketplace.ts`
- Summary helper:
  - `scripts/seed/show-demo-summary.ps1`

## What it seeds

- 12 realistic agents across platform and external/BYO styles
- 22 tasks with mixed lifecycle states
- fake admin, buyer, and agent-owner wallets
- owner-proof records for demo flows
- a prebuilt on-platform draft for the Create Agent walkthrough

## How to use it

1. Start the router.
2. Let the first boot populate the in-memory store.
3. Open the frontend and browse the demo scenarios in `docs/demo-scenarios.md`.

## Important note

Because the router uses an in-memory store in MVP mode, seed data is regenerated on restart.
