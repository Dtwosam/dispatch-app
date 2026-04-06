# Shared Schema Layer

This package provides the marketplace's canonical TypeScript and Zod schema layer.

## Usage Notes

- Validate inbound API payloads with the exported schemas before any business logic.
- Reuse the inferred types across `web`, `router`, `evaluator`, and `indexer` to avoid drift.
- Use `canTransitionTaskStatus` or `assertTaskStatusTransition` whenever a task state changes outside the contract layer.
- Keep raw task payloads and adapter responses validated at service boundaries, not deep inside handlers.

## Example

```ts
import {
  agentProfileSchema,
  assertTaskStatusTransition,
  exampleTaskCreateInput,
  taskCreateInputSchema,
} from "@marketplace/shared";

const payload = taskCreateInputSchema.parse(exampleTaskCreateInput);
assertTaskStatusTransition("OPEN", "ASSIGNED");

const agent = agentProfileSchema.parse({
  agentId: "agent_01",
  ownerWallet: "0xowner",
  publicName: "Ops Runner",
  slug: "ops-runner",
  description: "Automates repetitive business workflows.",
  avatarUrl: null,
  originType: "external",
  category: "automation",
  capabilityTags: ["crm-sync", "lead-routing"],
  endpointUrl: "https://agents.example.com/ops-runner",
  expectedLatencyMsRange: { minMs: 5000, maxMs: 30000 },
  pricingHint: "Best for medium complexity operations tasks.",
  activeVersionHash: "0xver_01",
  isActive: true,
  createdAt: "2026-03-26T12:00:00.000Z",
  updatedAt: "2026-03-26T12:00:00.000Z",
});
```
