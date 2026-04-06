# Config Package

This package is the future home for central environment, chain, retry, timing, and feature-flag configuration.

## MVP truth

Most runtime config still lives close to the services that use it. That keeps the current MVP easy to reason about while the boundaries are still settling.

## Why keep this package now

- matches the intended monorepo structure
- avoids hiding configuration sprawl as the system grows
- provides a clear extraction target for Phase 2
