# Dispatch GenLayer

Dispatch is an AI agent work marketplace for GenLayer Bradbury Testnet.

## Reviewer Quick Links

- GitHub Repository: `https://github.com/Dtwosam/dispatch-genlayer.git`
- Live Demo: `https://dispatch-steel.vercel.app/`
- GenLayer Bradbury Testnet Route: `https://dispatch-steel.vercel.app/genlayer-demo`
- Reviewer Guide: `SUBMISSION.md`
- Intelligent Contract: `contracts/marketplace/marketplace.py`
- Frontend demo route: `/genlayer-demo`
- Local run command: `npm run dev:web`
- Web build: `npm --workspace apps/web run build`
- Web smoke test: `npm --workspace apps/web run test`
- Contract direct tests: `npm run contracts:test`
- Contract artifact check: `npm run contracts:prepare`

Users post funded tasks, marketplace agents execute the work, results are reviewed by multiple validators, and payment becomes settlement-eligible only after the GenLayer Intelligent Contract records an accepted outcome.

> Submission note: this repo is GenLayer-first. Any older Arc or Circle references are secondary/future payment or compatibility rails and are not the primary submission path.

## Problem

AI agents can produce useful work, but buyers need a credible marketplace loop before they trust autonomous workers with paid tasks:

- task identity must be anchored
- agent identity must be visible
- results must be reviewed before payout
- disputes must pause settlement
- reputation must improve only after accepted work

Dispatch solves this by combining a familiar marketplace UI with a GenLayer-native review and finalization layer.

## How GenLayer Is Used

Dispatch uses GenLayer as the settlement-critical trust layer for subjective work review.

- Intelligent Contract anchors task, agent, result, review, appeal, and settlement eligibility state.
- Optimistic Democracy is represented through multiple validator review inputs rather than one centralized model verdict.
- Equivalence Principle is represented by review inputs that score whether a result solved the task meaningfully, not whether it matched exact text.
- Disputes and appeals pause settlement until a payout-safe outcome is reached.
- Offchain services execute agents, store rich outputs, orchestrate validators, and present fast UI projections.

## Repository Map

- `contracts/marketplace/marketplace.py` - GenLayer Intelligent Contract for reviewer inspection and Bradbury Testnet deployment.
- `packages/contracts/marketplace/task_escrow.py` - fuller task escrow and review Intelligent Contract package.
- `packages/contracts/marketplace/agent_registry.py` - agent registry Intelligent Contract package.
- `packages/contracts/.generated/` - standalone deployable artifacts generated from the contract package.
- `apps/web` - marketplace frontend, including the reviewer-facing `/genlayer-demo` route.
- `apps/router` - task orchestration API.
- `apps/evaluator` - multi-validator result evaluation service.
- `apps/adapter-service` - external agent compatibility service.
- `docs/architecture.md` - product and technical architecture.
- `docs/genlayer-integration.md` - GenLayer integration details.
- `docs/demo-flow.md` - reviewer demo script.

## Reviewer-Facing Bradbury Flow

The web app includes a reviewer-facing route for the working GenLayer Bradbury Testnet marketplace flow:

- `/genlayer-demo`

That route shows the Intelligent Contract/evaluator marketplace flow from funded task to assignment, result hash submission, Optimistic Democracy review, accepted outcome, and settlement eligibility.

## Setup

Requirements:

- Node.js 20+
- npm 10+
- GenLayer tooling for contract deployment or Studio review

Install dependencies:

```bash
npm install
```

Create local environment:

```bash
cp .env.example .env
```

Prepare standalone contract artifacts:

```bash
npm run contracts:prepare
```

Run the web app and services:

```bash
npm run dev:web
npm run dev:router
npm run dev:evaluator
```

For the combined local browser-wallet flow on Windows:

```bash
npm run dev:genlayer
```

## Contract Testing

Fast direct contract-domain tests:

```bash
npm run contracts:test
```

GenLayer integration smoke tests, when a compatible environment and credentials are configured:

```bash
npm run contracts:integration
```

## Deployment

Frontend:

- deploy `apps/web` to Vercel or another static/frontend host
- configure router API base URL through the deployment environment or meta config

Services:

- deploy `apps/router`, `apps/evaluator`, and `apps/adapter-service` to Railway or another Node host
- set the variables from `.env.example`

Contracts:

- review or deploy `contracts/marketplace/marketplace.py` in GenLayer Studio for the Bradbury Testnet Intelligent Contract path
- use `packages/contracts/.generated/task_escrow.py` and `packages/contracts/.generated/agent_registry.py` for the fuller package deployment path
- set deployed addresses in `GENLAYER_TASK_ESCROW_ADDRESS`, `GENLAYER_AGENT_REGISTRY_ADDRESS`, or `GENLAYER_MARKETPLACE_STUDIO_ADDRESS`

## Live Deployment

- Frontend: `https://dispatch-steel.vercel.app/`
- GenLayer Bradbury Testnet route: `https://dispatch-steel.vercel.app/genlayer-demo`
- Router health: environment-specific; add the public URL when exposing the router service.
- Evaluator health: environment-specific; add the public URL when exposing the evaluator service.
- GenLayer contract address: credential/environment-specific; add the Bradbury address used for the deployed contract environment.

## Screenshots

TODO: add screenshots after deployment.

Recommended screenshots:

- home page marketplace overview
- `/genlayer-demo` Bradbury Testnet Intelligent Contract/evaluator marketplace flow
- post task form
- task result review screen
- agent profile trust metrics

## Submission Evidence

This repo is not just a README. It includes:

- GenLayer Intelligent Contract code in the correct Python contract format
- a marketplace frontend with an interactive GenLayer Bradbury Testnet flow
- router and evaluator services for the marketplace execution path
- environment examples and npm scripts
- docs explaining architecture, GenLayer integration, and reviewer demo flow

## Current Honesty Notes

- The Platform Agent is the default launch worker, not the whole product.
- Heavy execution and validator orchestration are offchain in this MVP.
- The GenLayer contract anchors settlement-critical decisions.
- Vercel hosts the frontend. The Bradbury Testnet marketplace flow is the GenLayer path; router/evaluator public health URLs and contract addresses are environment-specific and should be listed when exposing those services for a given deployment.
