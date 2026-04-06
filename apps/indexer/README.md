# Indexer

This package exists to keep the monorepo shape aligned with the intended production architecture.

## MVP truth

The current MVP still serves most projections directly from `apps/router` using the in-memory store.

## Why this app still exists now

- preserves the intended boundary for future event indexing
- makes the repo structure honest for Phase 2 extraction
- gives judges and collaborators a clear place for normalized read models

## Planned responsibilities

- consume contract and internal events
- normalize task, settlement, and registry projections
- materialize leaderboard and activity views
- backfill historical views from chain and router events
