import { z } from "zod";
import {
  agentHealthStatusSchema,
  agentRegistrationStateSchema,
  capabilityCategorySchema,
  compatibilityStatusSchema,
  configTypeSchema,
  originTypeSchema,
  reviewerTypeSchema,
  taskStatusSchema,
} from "./enums";
import {
  agentReputationSchema,
  agentProfileSchema,
  agentVersionSchema,
  evaluationResultSchema,
  evaluationScoreSchema,
  evaluationRequestSchema,
  healthcheckResponseSchema,
  latencyRangeSchema,
  recentOutcomePointSchema,
  trustBadgeSchema,
  userTrustSchema,
  userReviewDecisionSchema,
  erc8183JobSchema,
} from "./schemas";

export const ownerProofChallengeRequestSchema = z.object({
  walletAddress: z.string().min(3),
});

export const ownerProofChallengeResponseSchema = z.object({
  challengeId: z.string().min(1),
  walletAddress: z.string().min(3),
  message: z.string().min(1),
  nonce: z.string().min(1),
  expiresAt: z.string().datetime(),
});

export const ownerProofVerifyRequestSchema = z.object({
  challengeId: z.string().min(1),
  walletAddress: z.string().min(3),
  signature: z.string().min(1),
});

export const ownerProofVerifyResponseSchema = z.object({
  verified: z.boolean(),
  proofId: z.string().min(1).nullable(),
  verifiedAt: z.string().datetime().nullable(),
  mode: z.enum(["external_verifier", "development"]),
});

export const agentCompatibilityDeclarationSchema = z.object({
  supportedCategories: z.array(capabilityCategorySchema).min(1),
  declaredLatencyEstimateMs: z.number().int().positive(),
  declaredMaxPayloadSize: z.number().int().positive(),
  versionHashOrFingerprint: z.string().min(1),
});

export const registerAgentInputSchema = z.object({
  ownerProofId: z.string().min(1),
  ownerWallet: z.string().min(3),
  publicName: z.string().min(2).max(80),
  slug: z.string().min(2),
  description: z.string().min(10).max(2000),
  avatarUrl: z.string().url().nullable(),
  originType: originTypeSchema,
  category: capabilityCategorySchema,
  capabilityTags: z.array(z.string().min(1)).max(24),
  skills: z.array(z.string().min(1)).max(16).default([]),
  skillCategories: z.array(z.string().min(1)).max(8).default([]),
  endpointUrl: z.string().url().nullable(),
  expectedLatencyMsRange: latencyRangeSchema,
  pricingHint: z.string().max(120),
  activeVersionHash: z.string().min(1),
  compatibility: agentCompatibilityDeclarationSchema.optional(),
}).superRefine((value, ctx) => {
  if (value.originType === "external") {
    if (!value.endpointUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endpointUrl"],
        message: "endpointUrl is required for external agents",
      });
    }
    if (!value.compatibility) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["compatibility"],
        message: "compatibility declaration is required for external agents",
      });
    }
  }
});

export const updateAgentMetadataInputSchema = z.object({
  ownerWallet: z.string().min(3),
  publicName: z.string().min(2).max(80).optional(),
  description: z.string().min(10).max(2000).optional(),
  avatarUrl: z.string().url().nullable().optional(),
  category: capabilityCategorySchema.optional(),
  capabilityTags: z.array(z.string().min(1)).max(24).optional(),
  skills: z.array(z.string().min(1)).max(16).optional(),
  skillCategories: z.array(z.string().min(1)).max(8).optional(),
  pricingHint: z.string().max(120).optional(),
  expectedLatencyMsRange: latencyRangeSchema.optional(),
});

export const publishAgentVersionInputSchema = z.object({
  ownerWallet: z.string().min(3),
  version: agentVersionSchema.extend({
    configType: configTypeSchema,
  }),
  runHealthcheck: z.boolean().default(true),
  runCompatibilityProbe: z.boolean().default(true),
});

export const agentActivationInputSchema = z.object({
  actorWallet: z.string().min(3),
});

export const adminSuspendAgentInputSchema = z.object({
  adminWallet: z.string().min(3),
  reason: z.string().min(3).max(500),
});

export const compatibilityTestRequestSchema = z.object({
  actorWallet: z.string().min(3),
  runExecutionProbe: z.boolean().default(true),
});

export const healthcheckRequestSchema = z.object({
  actorWallet: z.string().min(3),
});

export const performanceSummarySchema = z.object({
  tasksAttempted: z.number().int().nonnegative(),
  tasksCompleted: z.number().int().nonnegative(),
  approvals: z.number().int().nonnegative(),
  totalReviews: z.number().int().nonnegative(),
  rejectionCount: z.number().int().nonnegative(),
  disputeCount: z.number().int().nonnegative(),
  successRate: z.number().min(0).max(1),
  approvalRate: z.number().min(0).max(1),
  averageScore: z.number().min(0).max(100),
  averageResponseTimeMs: z.number().int().nonnegative(),
  averageLatencyMs: z.number().int().nonnegative(),
  totalEarnings: z.number().nonnegative(),
  reliabilityScore: z.number().min(0).max(100),
  rankScore: z.number().min(0).max(100),
  rankPosition: z.number().int().positive().nullable(),
  status: z.enum(["active", "new", "unavailable"]),
  trend: z.enum(["up", "down", "flat"]),
  recentOutcomes: z.array(recentOutcomePointSchema).default([]),
  trustBadges: z.array(trustBadgeSchema).default([]),
  specialistCategory: capabilityCategorySchema.nullable(),
});

export const compatibilityCheckSchema = z.object({
  compatible: z.boolean(),
  compatibilityStatus: compatibilityStatusSchema,
  checkedAt: z.string().datetime(),
  notes: z.array(z.string()),
  healthcheck: healthcheckResponseSchema.nullable(),
  executeProbeAccepted: z.boolean().nullable(),
  executeProbeMode: z.enum(["sync", "async"]).nullable(),
});

export const registryAgentViewSchema = z.object({
  profile: agentProfileSchema,
  registrationState: agentRegistrationStateSchema,
  healthStatus: agentHealthStatusSchema,
  compatibilityStatus: compatibilityStatusSchema,
  latestVersion: agentVersionSchema.nullable(),
  compatibilityReport: compatibilityCheckSchema.nullable(),
  performanceSummary: performanceSummarySchema,
  suspensionReason: z.string().nullable(),
});

export const leaderboardBucketSchema = z.object({
  key: z.enum([
    "top_earning_agents",
    "highest_approval_rate",
    "fastest_reliable_agents",
    "trending_this_week",
    "newest_promising_agents",
  ]),
  title: z.string().min(1),
  description: z.string().min(1),
  items: z.array(
    z.object({
      rank: z.number().int().positive(),
      agentId: z.string().min(1),
      displayName: z.string().min(1),
      avatarUrl: z.string().url().nullable(),
      successRate: z.number().min(0).max(1),
      approvalRate: z.number().min(0).max(1),
      averageScore: z.number().min(0).max(100),
      averageResponseTimeMs: z.number().int().nonnegative(),
      totalEarnings: z.number().nonnegative(),
      averageLatencyMs: z.number().int().nonnegative(),
      reliabilityScore: z.number().min(0).max(100),
      rankScore: z.number().min(0).max(100),
      status: z.enum(["active", "new", "unavailable"]),
      trustBadges: z.array(trustBadgeSchema).default([]),
      trend: z.enum(["up", "down", "flat"]),
    }),
  ),
});

export const leaderboardResponseSchema = z.object({
  generatedAt: z.string().datetime(),
  buckets: z.array(leaderboardBucketSchema),
});

export const agentTrustProfileSchema = z.object({
  agentId: z.string().min(1),
  displayName: z.string().min(1),
  reputation: agentReputationSchema.extend({
    recentOutcomes: z.array(recentOutcomePointSchema).default([]),
    trustBadges: z.array(trustBadgeSchema).default([]),
    specialistCategory: capabilityCategorySchema.nullable(),
  }),
});

export const userTrustResponseSchema = z.object({
  userTrust: userTrustSchema,
});

export const listRegistryAgentsResponseSchema = z.object({
  items: z.array(registryAgentViewSchema),
  total: z.number().int().nonnegative(),
});

export const registerAgentResponseSchema = registryAgentViewSchema;
export const publishAgentVersionResponseSchema = registryAgentViewSchema;

export const toolRegistryItemSchema = z.object({
  id: z.enum([
    "web_retrieval_stub",
    "document_retrieval_stub",
    "structured_formatter",
    "summarizer_helper",
    "classification_helper",
    "no_tool_mode",
  ]),
  enabled: z.boolean(),
  config: z.record(z.string(), z.unknown()).default({}),
});

export const knowledgeAttachmentSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["file", "url", "note"]),
  title: z.string().min(1),
  pointer: z.string().min(1),
  mimeType: z.string().nullable().optional(),
  sizeBytes: z.number().int().nonnegative().nullable().optional(),
  retrievalHint: z.string().max(280).optional(),
});

export const inputFieldSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(["string", "number", "boolean", "enum", "array", "object"]),
  required: z.boolean(),
  description: z.string().max(280),
  enumValues: z.array(z.string()).optional(),
});

export const outputFieldSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(["string", "number", "boolean", "array", "object"]),
  description: z.string().max(280),
});

export const createAgentDraftSchema = z.object({
  draftId: z.string().min(1),
  ownerWallet: z.string().min(3),
  currentStep: z.number().int().min(1).max(7),
  identity: z.object({
    publicName: z.string().min(2).max(80),
    slug: z.string().min(2),
    tagline: z.string().min(6).max(120),
    category: capabilityCategorySchema,
    capabilityTags: z.array(z.string().min(1)).max(24),
    avatarUrl: z.string().min(1).nullable(),
  }),
  behavior: z.object({
    systemInstructions: z.string().min(1),
    prohibitedBehaviors: z.array(z.string().min(1)),
    toneStyle: z.string().min(1),
    structuredOutputRequired: z.boolean(),
    domainConstraints: z.array(z.string().min(1)),
    qualityPreference: z.number().min(0).max(100),
  }),
  tools: z.object({
    selectedTools: z.array(toolRegistryItemSchema),
    advancedOpen: z.boolean().default(false),
  }),
  knowledge: z.object({
    attachments: z.array(knowledgeAttachmentSchema),
    retrievalHooks: z.array(z.string().min(1)),
    notes: z.array(z.string().min(1)),
  }),
  schemaDefinition: z.object({
    inputFields: z.array(inputFieldSchema),
    outputFields: z.array(outputFieldSchema),
    outputExample: z.record(z.string(), z.unknown()),
  }),
  lastTestRun: z
    .object({
      runId: z.string().min(1),
      sampleTask: z.string().min(1),
      result: z.unknown(),
      latencyMs: z.number().int().nonnegative(),
      parseValid: z.boolean(),
      errors: z.array(z.string()),
      runAt: z.string().datetime(),
    })
    .nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const createAgentDraftInputSchema = createAgentDraftSchema.omit({
  draftId: true,
  lastTestRun: true,
  createdAt: true,
  updatedAt: true,
});

export const updateAgentDraftStepSchema = z.object({
  currentStep: z.number().int().min(1).max(7),
  identity: createAgentDraftSchema.shape.identity.optional(),
  behavior: createAgentDraftSchema.shape.behavior.optional(),
  tools: createAgentDraftSchema.shape.tools.optional(),
  knowledge: createAgentDraftSchema.shape.knowledge.optional(),
  schemaDefinition: createAgentDraftSchema.shape.schemaDefinition.optional(),
});

export const agentTestRunRequestSchema = z.object({
  sampleTask: z.string().min(10),
  sampleInput: z.record(z.string(), z.unknown()).default({}),
});

export const agentTestRunResponseSchema = z.object({
  runId: z.string().min(1),
  result: z.unknown(),
  latencyMs: z.number().int().nonnegative(),
  parseValid: z.boolean(),
  errors: z.array(z.string()),
  toolTrace: z.array(z.string()),
  runAt: z.string().datetime(),
});

export const publishAgentDraftRequestSchema = z.object({
  ownerProofId: z.string().min(1),
  ownerWallet: z.string().min(3),
  activateAfterPublish: z.boolean().default(true),
});

export const publishAgentDraftResponseSchema = z.object({
  draftId: z.string().min(1),
  versionHash: z.string().min(1),
  registryAgent: registryAgentViewSchema,
  publicProfilePath: z.string().min(1),
});

export const taskAttachmentSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  pointer: z.string().min(1),
  mimeType: z.string().nullable().optional(),
  sizeBytes: z.number().int().nonnegative().nullable().optional(),
  textContent: z.string().max(20000).nullable().optional(),
});

export const taskEvaluationPreferenceSchema = z.enum([
  "user_review_only",
  "assisted_evaluation",
  "hybrid_review",
]);

export const taskVisibilityModeSchema = z.enum(["direct_hire", "open_market"]);
export const taskResultStatusSchema = z.enum(["not_started", "in_progress", "submitted", "approved", "rejected", "disputed", "appealed", "unresolved", "settled"]);
export const taskTransactionStateSchema = z.enum(["idle", "draft_saved", "pending_wallet", "pending_chain", "accepted", "failed"]);
export const taskSettlementStateSchema = z.enum(["reward_funded", "pending_settlement", "settled", "refunded", "disputed", "unresolved"]);

export const taskCreateRequestSchema = z.object({
  title: z.string().min(3).max(140),
  description: z.string().min(20).max(5000),
  category: capabilityCategorySchema,
  rewardAmount: z.number().positive(),
  deadline: z.string().datetime(),
  hiringMode: taskVisibilityModeSchema,
  selectedAgentId: z.string().min(1).nullable(),
  attachments: z.array(taskAttachmentSchema),
  evaluationPreference: taskEvaluationPreferenceSchema,
  structuredNotes: z.string().max(2000).nullable(),
  creatorWallet: z.string().min(3),
  maxParticipants: z.number().int().positive().max(20).default(1),
}).superRefine((value, ctx) => {
  if (value.hiringMode === "direct_hire" && !value.selectedAgentId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["selectedAgentId"],
      message: "Direct hire tasks require a selected agent",
    });
  }
});

export const taskTimelineEventSchema = z.object({
  id: z.string().min(1),
  kind: z.enum([
    "task_created",
    "escrow_pending",
    "escrow_funded",
    "agent_invited",
    "agent_accepted",
    "execution_started",
    "execution_failed",
    "submission_received",
    "review_started",
    "approved",
    "rejected",
    "cancelled",
    "disputed",
    "appeal_opened",
    "appeal_resolved",
    "result_unresolved",
    "result_verified",
    "settled",
    "refund_completed",
  ]),
  title: z.string().min(1),
  description: z.string().min(1),
  createdAt: z.string().datetime(),
});

export const taskSummaryViewSchema = z.object({
  taskId: z.string().min(1),
  title: z.string().min(1),
  category: capabilityCategorySchema,
  rewardAmount: z.number().positive(),
  deadline: z.string().datetime(),
  status: taskStatusSchema,
  resultStatus: taskResultStatusSchema,
  creatorWallet: z.string().min(3),
  selectedAgentId: z.string().min(1).nullable(),
  participatingAgentIds: z.array(z.string().min(1)),
  maxParticipants: z.number().int().positive(),
  transactionState: taskTransactionStateSchema,
  onchainTaskRef: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const taskDetailViewSchema = taskSummaryViewSchema.extend({
  description: z.string().min(1),
  attachments: z.array(taskAttachmentSchema),
  evaluationPreference: taskEvaluationPreferenceSchema,
  structuredNotes: z.string().nullable(),
  hiringMode: taskVisibilityModeSchema,
  timeline: z.array(taskTimelineEventSchema),
  creatorDisplay: z.string().min(1),
  selectedAgents: z.array(
    z.object({
      agentId: z.string().min(1),
      displayName: z.string().min(1),
      originType: originTypeSchema,
    }),
  ),
  reviewActions: z.array(z.enum(["approve", "reject", "dispute", "appeal", "settle", "refund", "cancel"])),
  latestCreateTxHash: z.string().min(1).nullable().optional(),
  latestFundTxHash: z.string().min(1).nullable().optional(),
  latestAssignTxHash: z.string().min(1).nullable().optional(),
  latestSubmissionId: z.string().min(1).nullable().optional(),
  latestSubmissionTxHash: z.string().min(1).nullable().optional(),
  latestEvaluation: evaluationResultSchema.nullable().optional(),
  userReview: userReviewDecisionSchema.nullable().optional(),
  erc8183Job: erc8183JobSchema.nullable().optional(),
  settlementState: taskSettlementStateSchema.default("reward_funded"),
  latestSettlement: z
    .object({
      settlementId: z.string().min(1),
      grossReward: z.number().nonnegative(),
      platformFee: z.number().nonnegative(),
      agentPayout: z.number().nonnegative(),
      refundAmount: z.number().nonnegative(),
      payoutWallet: z.string().min(3).nullable().optional(),
      platformFeeWallet: z.string().min(3).nullable().optional(),
      settlementTimestamp: z.string().datetime(),
      txReference: z.string().nullable(),
      outcome: z.enum(["paid", "refunded", "paused", "admin_resolved"]),
    })
    .nullable()
    .optional(),
  disputeRecord: z
    .object({
      disputeId: z.string().min(1),
      reason: z.string().min(3),
      status: z.enum(["open", "resolved"]),
      openedByWallet: z.string().min(3),
      openedAt: z.string().datetime(),
      resolvedAt: z.string().datetime().nullable(),
      resolution: z.string().nullable(),
    })
    .nullable()
    .optional(),
  appealRecord: z
    .object({
      appealId: z.string().min(1),
      appealRound: z.number().int().positive(),
      reason: z.string().min(3),
      openedByWallet: z.string().min(3),
      openedAt: z.string().datetime(),
      resolvedAt: z.string().datetime().nullable(),
      resolutionOutcome: z.enum(["accepted", "rejected", "disputed", "unresolved"]).nullable(),
    })
    .nullable()
    .optional(),
});

export const taskCreateResponseSchema = z.object({
  task: taskDetailViewSchema,
  rollbackToken: z.string().nullable(),
});

export const taskListResponseSchema = z.object({
  allOpenTasks: z.array(taskSummaryViewSchema),
  myPostedTasks: z.array(taskSummaryViewSchema),
  tasksAssignedToMyAgents: z.array(taskSummaryViewSchema),
  activeTasks: z.array(taskSummaryViewSchema),
  completedTasks: z.array(taskSummaryViewSchema),
  rejectedTasks: z.array(taskSummaryViewSchema),
  disputedTasks: z.array(taskSummaryViewSchema),
});

export const taskActionRequestSchema = z.object({
  actorWallet: z.string().min(3),
});

export const taskActionResponseSchema = z.object({
  task: taskDetailViewSchema,
});

export const settlementCreateRequestSchema = z.object({
  actorWallet: z.string().min(3),
  taskId: z.string().min(1),
  winningAgentId: z.string().min(1),
  grossReward: z.number().nonnegative(),
});

export const disputeOpenRequestSchema = z.object({
  actorWallet: z.string().min(3),
  reason: z.string().min(3).max(500),
});

export const appealOpenRequestSchema = z.object({
  actorWallet: z.string().min(3),
  reason: z.string().min(3).max(500),
});

export const adminResolutionRequestSchema = z.object({
  adminWallet: z.string().min(3),
  outcome: z.enum(["approve_payout", "refund_buyer"]),
  resolution: z.string().min(3).max(500),
});

export const settlementReceiptSchema = z.object({
  settlementId: z.string().min(1),
  taskId: z.string().min(1),
  grossReward: z.number().nonnegative(),
  platformFee: z.number().nonnegative(),
  agentPayout: z.number().nonnegative(),
  refundAmount: z.number().nonnegative(),
  payoutWallet: z.string().min(3).nullable().optional(),
  platformFeeWallet: z.string().min(3).nullable().optional(),
  settlementTimestamp: z.string().datetime(),
  txReference: z.string().nullable(),
  settlementState: taskSettlementStateSchema,
  outcome: z.enum(["paid", "refunded", "paused", "admin_resolved"]),
});

export const settlementHistoryResponseSchema = z.object({
  items: z.array(settlementReceiptSchema),
});

export const evaluationRunRequestSchema = evaluationRequestSchema.extend({
  submissionPayload: z.record(z.string(), z.unknown()),
});

export const evaluationRunResponseSchema = evaluationResultSchema;

export const hybridReviewConfirmRequestSchema = z.object({
  evaluationId: z.string().min(1),
  reviewerWallet: z.string().min(3),
  confirmDecision: z.enum(["approve", "reject"]),
  feedback: z.string().max(500).nullable().optional(),
});

export const evaluationAggregateRequestSchema = z.object({
  taskId: z.string().min(1),
  submissionId: z.string().min(1),
  findings: z.array(
    z.object({
      reviewerType: reviewerTypeSchema,
      overallScore: z.number().min(0).max(100),
      decision: z.enum(["approve", "reject", "needs_human_review"]),
      acceptanceSignal: z.enum(["accept", "reject", "uncertain"]).default("uncertain"),
      confidence: z.number().min(0).max(1).default(0.5),
      summary: z.string().min(1),
      reasoning: z.string().min(1),
    }),
  ).min(1),
});

export const evaluationAggregateResponseSchema = z.object({
  finalDecision: z.enum(["approve", "reject", "needs_human_review"]),
  overallScore: z.number().min(0).max(100),
  summary: z.string().min(1),
  finalOutcome: z.enum(["accepted", "rejected", "disputed", "unresolved"]),
  consensusScore: z.number().min(0).max(100),
  validatorAgreement: z.number().min(0).max(1),
  consensusConfidence: z.number().min(0).max(1),
  equivalenceSummary: z.string().min(1),
});

export const chainModeSchema = z.enum(["read_only", "server_signer_proxy", "browser_wallet"]);
export const chainReceiptStatusSchema = z.enum(["PENDING", "ACCEPTED", "FINALIZED", "UNDETERMINED", "FAILED", "UNKNOWN"]);

export const chainPublicConfigSchema = z.object({
  rpcUrl: z.string().url(),
  browserRpcUrl: z.string().url().nullable().optional(),
  chainKey: z.enum(["arcTestnet", "custom"]),
  chainMode: chainModeSchema,
  chainId: z.number().int().positive(),
  networkName: z.string().min(1),
  taskEscrowAddress: z.string().nullable(),
  agentRegistryAddress: z.string().nullable(),
  paymentTokenAddress: z.string().nullable().optional(),
  paymentTokenSymbol: z.string().min(1).default("USDC"),
  paymentTokenDecimals: z.number().int().min(0).default(6),
  gasTokenSymbol: z.string().min(1).default("USDC"),
  gasTokenDecimals: z.number().int().min(0).default(18),
  requiresTokenApproval: z.boolean().default(false),
  explorerBaseUrl: z.string().url().nullable(),
  notes: z.array(z.string()),
});

export const chainStatusResponseSchema = z.object({
  ok: z.boolean(),
  config: chainPublicConfigSchema,
  rpcReachable: z.boolean(),
  detectedChainId: z.number().int().positive().nullable(),
  expectedChainId: z.number().int().positive(),
  contractAddressesConfigured: z.boolean(),
  diagnostics: z.array(z.string()),
});

export const chainReceiptViewSchema = z.object({
  hash: z.string().min(1),
  status: chainReceiptStatusSchema,
  accepted: z.boolean(),
  finalized: z.boolean(),
  undetermined: z.boolean(),
  contractAddress: z.string().nullable().optional(),
  blockNumber: z.string().nullable().optional(),
  raw: z.unknown().optional(),
});

export const chainContractStateRequestSchema = z.object({
  address: z.string().min(3),
  status: z.enum(["accepted", "finalized"]).optional(),
  blockNumber: z.string().optional(),
});

export const chainContractStateResponseSchema = z.object({
  address: z.string().min(3),
  status: z.enum(["accepted", "finalized"]),
  blockNumber: z.string().nullable(),
  rawStateHex: z.string(),
});

export const taskDraftCreateResponseSchema = z.object({
  task: taskDetailViewSchema,
});

export const chainTaskWriteRequestSchema = z.object({
  taskId: z.string().min(1),
  creatorWallet: z.string().min(3),
  rewardAmount: z.number().positive(),
  deadlineTimestamp: z.number().int().positive(),
  taskMode: z.enum(["single", "multi"]),
  metadataUri: z.string().min(1),
  metadataHash: z.string().min(1),
  selectedAgentId: z.string().nullable().optional(),
});

export const chainTaskWriteResponseSchema = z.object({
  taskId: z.string().min(1),
  createTxHash: z.string().min(1),
  fundTxHash: z.string().min(1),
  assignTxHash: z.string().nullable(),
  latestReceipt: chainReceiptViewSchema,
  onchainTaskRef: z.string().nullable(),
  notes: z.array(z.string()),
});

export const taskChainSyncRequestSchema = z.object({
  createTxHash: z.string().min(1),
  fundTxHash: z.string().min(1),
  assignTxHash: z.string().nullable().optional(),
  latestReceipt: chainReceiptViewSchema,
  onchainTaskRef: z.string().nullable().optional(),
});

export const taskChainSyncResponseSchema = z.object({
  task: taskDetailViewSchema,
  syncedReceipt: chainReceiptViewSchema,
});

// Backwards-compatible aliases during the GenLayer -> Arc migration.
export const genLayerChainModeSchema = chainModeSchema;
export const genLayerReceiptStatusSchema = chainReceiptStatusSchema;
export const genLayerPublicConfigSchema = chainPublicConfigSchema;
export const genLayerChainStatusResponseSchema = chainStatusResponseSchema;
export const genLayerReceiptViewSchema = chainReceiptViewSchema;
export const genLayerContractStateRequestSchema = chainContractStateRequestSchema;
export const genLayerContractStateResponseSchema = chainContractStateResponseSchema;
export const genLayerTaskWriteRequestSchema = chainTaskWriteRequestSchema;
export const genLayerTaskWriteResponseSchema = chainTaskWriteResponseSchema;

export const adminPauseTaskRequestSchema = z.object({
  adminWallet: z.string().min(3),
  reason: z.string().min(3).max(500),
});

export const adminBlacklistEndpointRequestSchema = z.object({
  adminWallet: z.string().min(3),
  endpointUrl: z.string().url(),
  reason: z.string().min(3).max(500),
});

export const adminAuditLogSchema = z.object({
  id: z.string().min(1),
  actorWallet: z.string().min(3),
  action: z.enum(["pause_task", "refund_task", "resolve_dispute", "disable_agent", "blacklist_endpoint"]),
  subjectType: z.enum(["task", "agent", "endpoint"]),
  subjectId: z.string().min(1),
  reason: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()),
  createdAt: z.string().datetime(),
});

export const moderationFlagSchema = z.object({
  id: z.string().min(1),
  kind: z.enum([
    "endpoint_blacklisted",
    "task_spam",
    "duplicate_result",
    "abusive_user",
    "suspicious_dispute_rate",
    "suspicious_rejection_rate",
    "execution_failure_pattern",
  ]),
  severity: z.enum(["low", "medium", "high"]),
  subjectType: z.enum(["task", "agent", "user", "endpoint"]),
  subjectId: z.string().min(1),
  summary: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()),
  createdAt: z.string().datetime(),
});

export const adminOverviewResponseSchema = z.object({
  tasks: z.array(taskSummaryViewSchema),
  pausedTaskIds: z.array(z.string().min(1)),
  blacklistedEndpoints: z.array(
    z.object({
      endpointUrl: z.string().url(),
      reason: z.string().min(1),
      actorWallet: z.string().min(3),
      createdAt: z.string().datetime(),
      active: z.boolean(),
    }),
  ),
  suspiciousPatterns: z.array(moderationFlagSchema),
  auditLogs: z.array(adminAuditLogSchema),
});

export type OwnerProofChallengeRequest = z.infer<typeof ownerProofChallengeRequestSchema>;
export type OwnerProofChallengeResponse = z.infer<typeof ownerProofChallengeResponseSchema>;
export type OwnerProofVerifyRequest = z.infer<typeof ownerProofVerifyRequestSchema>;
export type OwnerProofVerifyResponse = z.infer<typeof ownerProofVerifyResponseSchema>;
export type RegisterAgentInput = z.infer<typeof registerAgentInputSchema>;
export type UpdateAgentMetadataInput = z.infer<typeof updateAgentMetadataInputSchema>;
export type PublishAgentVersionInput = z.infer<typeof publishAgentVersionInputSchema>;
export type AgentActivationInput = z.infer<typeof agentActivationInputSchema>;
export type AdminSuspendAgentInput = z.infer<typeof adminSuspendAgentInputSchema>;
export type CompatibilityTestRequest = z.infer<typeof compatibilityTestRequestSchema>;
export type HealthcheckRequest = z.infer<typeof healthcheckRequestSchema>;
export type PerformanceSummary = z.infer<typeof performanceSummarySchema>;
export type CompatibilityCheck = z.infer<typeof compatibilityCheckSchema>;
export type RegistryAgentView = z.infer<typeof registryAgentViewSchema>;
export type ListRegistryAgentsResponse = z.infer<typeof listRegistryAgentsResponseSchema>;
export type LeaderboardBucket = z.infer<typeof leaderboardBucketSchema>;
export type LeaderboardResponse = z.infer<typeof leaderboardResponseSchema>;
export type AgentTrustProfile = z.infer<typeof agentTrustProfileSchema>;
export type UserTrustResponse = z.infer<typeof userTrustResponseSchema>;
export type ToolRegistryItem = z.infer<typeof toolRegistryItemSchema>;
export type KnowledgeAttachment = z.infer<typeof knowledgeAttachmentSchema>;
export type InputField = z.infer<typeof inputFieldSchema>;
export type OutputField = z.infer<typeof outputFieldSchema>;
export type CreateAgentDraft = z.infer<typeof createAgentDraftSchema>;
export type CreateAgentDraftInput = z.infer<typeof createAgentDraftInputSchema>;
export type UpdateAgentDraftStepInput = z.infer<typeof updateAgentDraftStepSchema>;
export type AgentTestRunRequest = z.infer<typeof agentTestRunRequestSchema>;
export type AgentTestRunResponse = z.infer<typeof agentTestRunResponseSchema>;
export type PublishAgentDraftRequest = z.infer<typeof publishAgentDraftRequestSchema>;
export type PublishAgentDraftResponse = z.infer<typeof publishAgentDraftResponseSchema>;
export type TaskAttachment = z.infer<typeof taskAttachmentSchema>;
export type TaskCreateRequest = z.infer<typeof taskCreateRequestSchema>;
export type TaskTimelineEvent = z.infer<typeof taskTimelineEventSchema>;
export type TaskSummaryView = z.infer<typeof taskSummaryViewSchema>;
export type TaskDetailView = z.infer<typeof taskDetailViewSchema>;
export type TaskCreateResponse = z.infer<typeof taskCreateResponseSchema>;
export type TaskListResponse = z.infer<typeof taskListResponseSchema>;
export type TaskActionRequest = z.infer<typeof taskActionRequestSchema>;
export type TaskActionResponse = z.infer<typeof taskActionResponseSchema>;
export type SettlementCreateRequest = z.infer<typeof settlementCreateRequestSchema>;
export type DisputeOpenRequest = z.infer<typeof disputeOpenRequestSchema>;
export type AppealOpenRequest = z.infer<typeof appealOpenRequestSchema>;
export type AdminResolutionRequest = z.infer<typeof adminResolutionRequestSchema>;
export type SettlementReceipt = z.infer<typeof settlementReceiptSchema>;
export type SettlementHistoryResponse = z.infer<typeof settlementHistoryResponseSchema>;
export type EvaluationRunRequest = z.infer<typeof evaluationRunRequestSchema>;
export type EvaluationRunResponse = z.infer<typeof evaluationRunResponseSchema>;
export type HybridReviewConfirmRequest = z.infer<typeof hybridReviewConfirmRequestSchema>;
export type EvaluationAggregateRequest = z.infer<typeof evaluationAggregateRequestSchema>;
export type EvaluationAggregateResponse = z.infer<typeof evaluationAggregateResponseSchema>;
export type ChainMode = z.infer<typeof chainModeSchema>;
export type ChainReceiptStatus = z.infer<typeof chainReceiptStatusSchema>;
export type ChainPublicConfig = z.infer<typeof chainPublicConfigSchema>;
export type ChainStatusResponse = z.infer<typeof chainStatusResponseSchema>;
export type ChainReceiptView = z.infer<typeof chainReceiptViewSchema>;
export type ChainContractStateRequest = z.infer<typeof chainContractStateRequestSchema>;
export type ChainContractStateResponse = z.infer<typeof chainContractStateResponseSchema>;
export type GenLayerChainMode = z.infer<typeof genLayerChainModeSchema>;
export type GenLayerReceiptStatus = z.infer<typeof genLayerReceiptStatusSchema>;
export type GenLayerPublicConfig = z.infer<typeof genLayerPublicConfigSchema>;
export type GenLayerChainStatusResponse = z.infer<typeof genLayerChainStatusResponseSchema>;
export type GenLayerReceiptView = z.infer<typeof genLayerReceiptViewSchema>;
export type GenLayerContractStateRequest = z.infer<typeof genLayerContractStateRequestSchema>;
export type GenLayerContractStateResponse = z.infer<typeof genLayerContractStateResponseSchema>;
export type TaskDraftCreateResponse = z.infer<typeof taskDraftCreateResponseSchema>;
export type ChainTaskWriteRequest = z.infer<typeof chainTaskWriteRequestSchema>;
export type ChainTaskWriteResponse = z.infer<typeof chainTaskWriteResponseSchema>;
export type GenLayerTaskWriteRequest = z.infer<typeof genLayerTaskWriteRequestSchema>;
export type GenLayerTaskWriteResponse = z.infer<typeof genLayerTaskWriteResponseSchema>;
export type TaskChainSyncRequest = z.infer<typeof taskChainSyncRequestSchema>;
export type TaskChainSyncResponse = z.infer<typeof taskChainSyncResponseSchema>;
export type AdminPauseTaskRequest = z.infer<typeof adminPauseTaskRequestSchema>;
export type AdminBlacklistEndpointRequest = z.infer<typeof adminBlacklistEndpointRequestSchema>;
export type AdminAuditLog = z.infer<typeof adminAuditLogSchema>;
export type ModerationFlag = z.infer<typeof moderationFlagSchema>;
export type AdminOverviewResponse = z.infer<typeof adminOverviewResponseSchema>;
