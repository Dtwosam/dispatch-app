import type { RegistryAgentView, TaskDetailView } from "@marketplace/shared";

export type Erc8183CompatibilityJob = {
  standard: "erc-8183";
  enabled: boolean;
  providerAgentId: string;
  evaluator: string | null;
  budgetAmount: string;
  fingerprint: string;
  inputPointer: string | null;
  hook: string | null;
  notes: string[];
};

export type Erc8004CompatibilityRegistration = {
  standard: "erc-8004";
  enabled: boolean;
  agentId: string;
  ownerWallet: string;
  metadataUri: string;
  notes: string[];
};

export function toErc8183CompatibilityJob(task: TaskDetailView, options: {
  providerAgentId: string;
  evaluator?: string | null;
  inputPointer?: string | null;
  hook?: string | null;
  enabled?: boolean;
}): Erc8183CompatibilityJob {
  return {
    standard: "erc-8183",
    enabled: options.enabled ?? false,
    providerAgentId: options.providerAgentId,
    evaluator: options.evaluator ?? null,
    budgetAmount: String(task.rewardAmount),
    fingerprint: `${task.taskId}:${task.updatedAt}`,
    inputPointer: options.inputPointer ?? task.attachments[0]?.pointer ?? null,
    hook: options.hook ?? null,
    notes: [
      "Dispatch keeps its internal marketplace lifecycle as the source of truth.",
      "This adapter maps a Dispatch task into an ERC-8183-compatible job envelope for future interoperability.",
      "Review, disputes, appeals, and settlement still follow Dispatch marketplace state.",
    ],
  };
}

export function toErc8004CompatibilityRegistration(agent: RegistryAgentView, options: {
  metadataUri?: string | null;
  enabled?: boolean;
} = {}): Erc8004CompatibilityRegistration {
  return {
    standard: "erc-8004",
    enabled: options.enabled ?? false,
    agentId: agent.profile.agentId,
    ownerWallet: agent.profile.ownerWallet,
    metadataUri: options.metadataUri ?? agent.profile.endpointUrl ?? `dispatch://agents/${agent.profile.slug}`,
    notes: [
      "Dispatch currently keeps the internal registry as the operational source of truth.",
      "This adapter reserves a clean Arc ERC-8004 anchoring path for external-agent identity without changing marketplace UX today.",
    ],
  };
}
