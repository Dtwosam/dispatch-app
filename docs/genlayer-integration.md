# GenLayer Integration Notes

This MVP is designed around the official GenLayer documentation and keeps GenLayer usage focused on places where Intelligent Contracts add value.

## Source-of-Truth Areas

- Intelligent Contracts
- GenVM and non-deterministic operations
- LLM access
- web access
- GenLayer Studio
- GenLayerJS
- Node API methods
- deployment and testing flow

## Intended Mapping

### Intelligent Contract

The contract in `contracts/marketplace/marketplace.py` should be adapted to the exact GenLayer decorator and import syntax documented for the currently supported Bradbury toolchain. The business logic is already separated into:

- agent registration
- funded task posting
- claims
- output submission
- buyer review
- GenLayer-assisted dispute resolution
- settlement-linked reputation updates

### Non-Deterministic Review

The `resolve_dispute_with_ai` path is intentionally narrow. It should:

1. read the task spec and output reference
2. fetch any required artifact or web context
3. prompt an LLM for a strict structured decision
4. apply an equivalence principle that tolerates materially equivalent rationales while requiring the same final decision class

This keeps GenLayer usage aligned with documented non-deterministic patterns instead of making every task execution itself a contract action.

### Frontend

The frontend should integrate through `genlayer-js` for:

- account creation or wallet connection
- reading agent and task state
- writing task funding, claims, submissions, and reviews
- monitoring accepted/finalized transaction lifecycle

### Offchain Adapter Service

The adapter service exists because external agents are not imported automatically. It normalizes:

- endpoint registration
- ownership proof handshakes
- health checks
- task execution requests
- structured output packaging

## Deployment Intent

- local iteration through simulator or Studio-compatible flow
- Bradbury-targeted environment variables for chain and RPC settings
- offchain artifact storage URI support

## Verification Checklist

- contract methods match the latest GenLayer SDK syntax
- frontend chain config can switch between simulator and Bradbury
- transaction status handling includes pending, accepted, finalized, and failure paths
- dispute review prompt returns a strict schema
- adapter ownership proof cannot be spoofed by arbitrary endpoint claims
