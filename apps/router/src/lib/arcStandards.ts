import { createHash } from "node:crypto";
import { erc8183JobSchema, type Erc8183Job, type RegistryAgentView, type TaskDetailView } from "@marketplace/shared";

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, nested]) => `${JSON.stringify(key)}:${stableStringify(nested)}`);
  return `{${entries.join(",")}}`;
}

function hashPayload(value: unknown) {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function buildConstraints(task: TaskDetailView) {
  const constraints = [
    task.structuredNotes?.trim() || null,
    `evaluation_preference:${task.evaluationPreference}`,
    `max_participants:${task.maxParticipants}`,
    task.attachments.length > 0 ? `attachments:${task.attachments.length}` : null,
  ].filter(Boolean) as string[];

  return [...new Set(constraints)];
}

export function mapDispatchTaskToErc8183Job(task: TaskDetailView, options: {
  providerAgentId?: string | null;
  evaluator?: string | null;
  hook?: string | null;
  state?: Erc8183Job["state"];
  contractAddress?: string | null;
  onchainJobId?: string | null;
  paymentTokenAddress?: string | null;
  paymentTokenSymbol?: string;
  paymentTokenDecimals?: number;
  now?: string;
} = {}): Erc8183Job {
  const createdAt = options.now ?? task.createdAt ?? new Date().toISOString();
  const updatedAt = options.now ?? task.updatedAt ?? createdAt;
  const providerAgentId = options.providerAgentId ?? task.selectedAgentId ?? task.participatingAgentIds[0] ?? null;
  const payload = {
    dispatchTaskId: task.taskId,
    requester: task.creatorWallet,
    providerAgentId,
    evaluator: options.evaluator ?? task.creatorWallet,
    title: task.title,
    description: task.description,
    category: task.category,
    constraints: buildConstraints(task),
    reward: {
      amount: String(task.rewardAmount),
      tokenAddress: options.paymentTokenAddress ?? null,
      tokenSymbol: options.paymentTokenSymbol ?? "USDC",
      tokenDecimals: options.paymentTokenDecimals ?? 6,
    },
    deadlineTimestamp: Math.floor(new Date(task.deadline).getTime() / 1000),
    routing: {
      hiringMode: task.hiringMode,
      selectedAgentId: task.selectedAgentId,
      maxParticipants: task.maxParticipants,
    },
    attachments: task.attachments.map((item) => ({
      name: item.title,
      pointer: item.pointer,
      contentType: item.mimeType ?? "application/octet-stream",
      sizeBytes: item.sizeBytes ?? 0,
    })),
    outputRequirements: {
      resultStatus: "submitted",
      expectedReview: task.evaluationPreference,
      taskId: task.taskId,
    },
    dispatchMetadata: {
      structuredNotes: task.structuredNotes,
      onchainTaskRef: task.onchainTaskRef,
      status: task.status,
      resultStatus: task.resultStatus,
      transactionState: task.transactionState,
    },
    inputPointer: task.attachments[0]?.pointer ?? null,
    hook: options.hook ?? null,
    contractAddress: options.contractAddress ?? null,
    onchainJobId: options.onchainJobId ?? null,
  };

  const payloadHash = hashPayload(payload);
  return erc8183JobSchema.parse({
    standard: "erc-8183",
    mode: options.contractAddress ? "native" : "adapter",
    jobId: `erc8183:${task.taskId}`,
    payloadHash,
    state: options.state ?? "mapped",
    createdAt,
    updatedAt,
    lastDispatchedAt: null,
    lastSubmissionAt: null,
    lastSettledAt: null,
    ...payload,
    notes: [
      "Dispatch remains the source of truth for review, disputes, appeals, reputation, and settlement.",
      "This ERC-8183 envelope is the portable execution request layer for interoperable agent runtimes.",
      options.contractAddress
        ? "Native contract metadata is attached, but Dispatch marketplace lifecycle still governs UX and settlement safety."
        : "No native ERC-8183 contract is required for this adapter path.",
    ],
  });
}

export function mapAgentToErc8004Compatibility(agent: RegistryAgentView, options: {
  metadataUri?: string | null;
  enabled?: boolean;
} = {}) {
  return {
    standard: "erc-8004" as const,
    enabled: options.enabled ?? false,
    agentId: agent.profile.agentId,
    ownerWallet: agent.profile.ownerWallet,
    metadataUri: options.metadataUri ?? agent.profile.endpointUrl ?? `dispatch://agents/${agent.profile.slug}`,
    notes: [
      "Dispatch keeps its internal registry as the operational source of truth.",
      "ERC-8004 remains a future identity anchoring path for external agents on Arc.",
    ],
  };
}
