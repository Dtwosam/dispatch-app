# GenLayer Submission

## Reviewer Essentials

- Project: Dispatch GenLayer
- GitHub Repository: `https://github.com/Dtwosam/dispatch-genlayer.git`
- Live Demo: `https://dispatch-steel.vercel.app/`
- GenLayer Bradbury Testnet Route: `https://dispatch-steel.vercel.app/genlayer-demo`
- Intelligent Contract: `contracts/marketplace/marketplace.py`
- Reviewer-facing route: `/genlayer-demo`
- Local frontend command: `npm run dev:web`
- Contract artifact check: `npm run contracts:prepare`
- Web build check: `npm --workspace apps/web run build`
- Web smoke test: `npm --workspace apps/web run test`
- Contract direct tests: `npm run contracts:test`

## What This Submission Demonstrates

Dispatch is a marketplace for AI agent work. A buyer posts a funded task, an agent executes, validators review the result, and settlement becomes eligible only after the GenLayer Intelligent Contract records a payout-safe outcome.

The submission is GenLayer-first:

- `contracts/marketplace/marketplace.py` is the GenLayer Intelligent Contract for the Bradbury Testnet marketplace path.
- `packages/contracts/marketplace/task_escrow.py` and `packages/contracts/marketplace/agent_registry.py` are the fuller contract package.
- `/genlayer-demo` shows the reviewer-facing Bradbury Testnet marketplace flow from funded task to review and settlement eligibility.
- `docs/demo-flow.md` gives a reviewer walkthrough.
- `docs/vercel-deployment.md` gives exact frontend deployment steps.

## GenLayer Fit

- Intelligent Contract: anchors task, agent, result hash, review outcome, appeal state, and settlement eligibility.
- Optimistic Democracy: review finalization requires multiple validator inputs and aggregates score, agreement, and confidence.
- Equivalence Principle: validator inputs judge whether the result meaningfully solves the task, not whether text matches exactly.
- Disputes and appeals: rejected, disputed, or unresolved tasks pause settlement and can enter appeal.
- Future of Work: the Platform Agent is the launch worker, while external agents can later compete through the same marketplace rails.

## Live Deployment

Live demo URL:

```text
https://dispatch-steel.vercel.app/
```

Reviewer route:

```text
https://dispatch-steel.vercel.app/genlayer-demo
```

## Implementation Status

Implemented:

- GenLayer Intelligent Contract implementation at `contracts/marketplace/marketplace.py`.
- Marketplace frontend with a reviewer-facing `/genlayer-demo` route for the working Bradbury Testnet flow.
- Platform Agent marketplace framing.
- Multi-validator/evaluator review model in the app architecture.
- Contract direct tests and artifact verification scripts.

Reviewer-facing route:

- The deployed `/genlayer-demo` route showcases the GenLayer Bradbury Testnet marketplace flow without forcing reviewers to provide wallet credentials before they can inspect the product.
- It presents funded task, agent assignment, result hash submission, evaluator review, and settlement eligibility as the Intelligent Contract/evaluator flow used by the marketplace.

Credential or environment-specific actions:

- Publishing a specific Bradbury contract address for a reviewer environment.
- Running write transactions with a funded Bradbury wallet.
- Running GenLayer integration smoke tests against a configured GenLayer environment.

## Secondary Rails Note

If older Arc or Circle wording appears elsewhere in historical docs or implementation paths, treat it as secondary/future payment or compatibility work. The GenLayer Bradbury Testnet submission path is the Intelligent Contract and `/genlayer-demo` flow listed above.

## Resubmission Checklist

- Confirm GitHub repo points to `https://github.com/Dtwosam/dispatch-genlayer.git`.
- Confirm `contracts/marketplace/marketplace.py` is visible in the repo.
- Confirm `/genlayer-demo` works locally or on the deployed site.
- Run `npm --workspace apps/web run build`.
- Run `npm --workspace apps/web run test`.
- Run `npm run contracts:test`.
- Run `npm run contracts:prepare`.
- Open `https://dispatch-steel.vercel.app/`.
- Open `https://dispatch-steel.vercel.app/genlayer-demo`.
- Submit the GitHub repo link, live demo link, Intelligent Contract path, and reviewer-facing Bradbury Testnet route.
