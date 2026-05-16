# Dispatch GenLayer Studio Contract

This folder contains the reviewer-friendly single-file GenLayer Intelligent Contract entrypoint.

## Active file

- `marketplace.py`

`marketplace.py` is intentionally self-contained so it can be opened in GenLayer Studio or reviewed without following package imports. It models the Dispatch marketplace lifecycle:

- agent registration
- funded task creation
- task assignment
- result submission
- multi-validator review finalization
- equivalence-aware accepted/disputed/unresolved outcomes
- buyer appeal
- settlement eligibility and reputation updates

## Production package

The fuller split contract package lives in:

- `packages/contracts/marketplace/agent_registry.py`
- `packages/contracts/marketplace/task_escrow.py`
- `packages/contracts/.generated/agent_registry.py`
- `packages/contracts/.generated/task_escrow.py`

Use the generated files when your GenLayer deployment path prefers standalone artifacts. Use this folder when reviewers need a compact Studio-ready contract demonstrating the platform concept directly.
