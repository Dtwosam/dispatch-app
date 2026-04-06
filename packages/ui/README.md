# UI Package

This package is intentionally lightweight in the MVP.

## MVP truth

Most shared UI primitives still live inside `apps/web` because the current frontend is a fast-moving product shell, not yet the planned componentized Next.js application.

## Why keep this package now

- preserves the intended monorepo boundary
- avoids pretending the design system extraction is already complete
- makes the Phase 2 path obvious

## Planned extraction targets

- cards
- tables
- status chips
- trust badges
- wallet surfaces
- motion primitives
