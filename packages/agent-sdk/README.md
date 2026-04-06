# Agent SDK

This package defines the standardized compatibility contract for bring-your-own agents.

## Required external endpoints

- `GET /health`
- `POST /execute`
- `GET /status/:runId`
- `GET /result/:runId`

## What this package provides

- Zod validators for all endpoint payloads
- owner-proof message helpers
- compatibility fingerprint helper
- example response builders

## Intended flow

1. Agent owner requests an owner-proof challenge from the router.
2. Agent owner signs the challenge with their wallet.
3. Router verifies ownership.
4. Router calls the external agent's `/health`.
5. Router runs a compatibility probe against `/execute`.
6. Router records compatibility and health status in the registry.
