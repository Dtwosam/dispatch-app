import { z } from "zod";
import {
  acceptanceSignalSchema,
  agentHealthStatusSchema,
  capabilityCategorySchema,
  consensusOutcomeSchema,
  configTypeSchema,
  errorCodeSchema,
  evaluationCriterionKeySchema,
  evaluationDecisionTypeSchema,
  evaluationPathSchema,
  evaluationModeSchema,
  leaderboardTrendSchema,
  originTypeSchema,
  reviewerTypeSchema,
  submissionStatusSchema,
  taskModeSchema,
  taskStatusSchema,
} from "./enums";

// Shared scalar shapes used across multiple payloads.
const isoDateTimeSchema = z.string().datetime();
const walletAddressSchema = z.string().min(3);
const hashLikeSchema = z.string().min(3);
const urlSchema = z.string().url();
const slugSchema = z
  .string()
  .min(2)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const latencyRangeSchema = z.object({
  minMs: z.number().int().nonnegative(),
  maxMs: z.number().int().nonnegative(),
}).refine((value) => value.maxMs >= value.minMs, {
  message: "maxMs must be greater than or equal to minMs",
});

export const userProfileSchema = z.object({
  id: z.string().min(1),
  walletAddress: walletAddressSchema,
  username: z.string().min(2).max(40),
  avatarUrl: urlSchema.nullable(),
  bio: z.string().max(280),
  createdAt: isoDateTimeSchema,
});

export const agentProfileSchema = z.object({
  agentId: z.string().min(1),
  onchainAgentId: z.string().min(1).nullable().optional(),
  ownerWallet: walletAddressSchema,
  publicName: z.string().min(2).max(80),
  slug: slugSchema,
  description: z.string().min(10).max(2000),
  avatarUrl: urlSchema.nullable(),
  originType: originTypeSchema,
  developerName: z.string().min(1).max(120).optional(),
  category: capabilityCategorySchema,
  capabilityTags: z.array(z.string().min(1)).max(24),
  skills: z.array(z.string().min(1)).max(16).default([]),
  skillCategories: z.array(z.string().min(1)).max(8).default([]),
  endpointUrl: urlSchema.nullable(),
  webhookUrl: urlSchema.nullable().optional(),
  adapterType: z.enum(["platform", "http", "webhook", "erc8183_adapter"]).optional(),
  outputSchema: z.union([z.string().min(1), z.record(z.string(), z.unknown())]).optional(),
  payoutWallet: walletAddressSchema.optional(),
  erc8183Compatible: z.boolean().optional(),
  connectionStatus: z.enum(["unknown", "connected", "degraded", "offline"]).optional(),
  expectedLatencyMsRange: latencyRangeSchema,
  pricingHint: z.string().max(120),
  activeVersionHash: hashLikeSchema,
  isActive: z.boolean(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export const agentVersionSchema = z.object({
  versionHash: hashLikeSchema,
  agentId: z.string().min(1),
  configType: configTypeSchema,
  systemPrompt: z.string().min(1),
  tools: z.array(z.string().min(1)),
  outputSchema: z.union([z.string().min(1), z.record(z.string(), z.unknown())]),
  knowledgeAssetRefs: z.array(z.string().min(1)),
  publishedAt: isoDateTimeSchema,
});

export const taskCreateInputSchema = z.object({
  title: z.string().min(3).max(140),
  description: z.string().min(10).max(5000),
  category: capabilityCategorySchema,
  rewardAmount: z.number().positive(),
  deadlineTimestamp: z.number().int().positive(),
  taskMode: taskModeSchema,
  selectedAgentId: z.string().min(1).nullable(),
  evaluationPreference: evaluationModeSchema,
  attachmentRefs: z.array(z.string().min(1)),
  creatorWallet: walletAddressSchema,
}).superRefine((value, ctx) => {
  // Direct hire requires a concrete target agent at creation time.
  if (value.taskMode === "direct_hire" && !value.selectedAgentId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["selectedAgentId"],
      message: "selectedAgentId is required for direct_hire tasks",
    });
  }
});

export const taskRecordSchema = z.object({
  taskId: z.string().min(1),
  creatorWallet: walletAddressSchema,
  onchainTaskRef: z.string().min(1),
  metadataHash: hashLikeSchema,
  status: taskStatusSchema,
  rewardAmount: z.number().positive(),
  deadlineTimestamp: z.number().int().positive(),
  taskMode: taskModeSchema,
  selectedAgentId: z.string().min(1).nullable(),
  assignedAgentIds: z.array(z.string().min(1)),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export const taskSubmissionSchema = z.object({
  submissionId: z.string().min(1),
  taskId: z.string().min(1),
  agentId: z.string().min(1),
  resultHash: hashLikeSchema,
  rawResultPointer: z.string().min(1),
  executionDurationMs: z.number().int().nonnegative(),
  status: submissionStatusSchema,
  submittedAt: isoDateTimeSchema,
});

export const evaluationCriterionSchema = z.object({
  key: evaluationCriterionKeySchema,
  label: z.string().min(1),
  weight: z.number().min(0).max(1),
  description: z.string().min(1),
});

export const reviewerScoreBreakdownSchema = z.object({
  completionScore: z.number().min(0).max(100),
  relevanceScore: z.number().min(0).max(100),
  correctnessProxyScore: z.number().min(0).max(100),
  formatComplianceScore: z.number().min(0).max(100),
  usefulnessScore: z.number().min(0).max(100),
  latencyAwarenessScore: z.number().min(0).max(100).nullable().optional(),
});

export const userReviewDecisionSchema = z.object({
  taskId: z.string().min(1),
  submissionId: z.string().min(1),
  reviewerWallet: walletAddressSchema,
  decision: z.enum(["approve", "reject"]),
  starRating: z.number().int().min(1).max(5).nullable().optional(),
  feedback: z.string().max(500).nullable().optional(),
  rejectionReason: z.string().min(3).max(500).nullable().optional(),
}).superRefine((value, ctx) => {
  if (value.decision === "reject" && !value.rejectionReason) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["rejectionReason"],
      message: "rejectionReason is required when rejecting a submission",
    });
  }
});

export const evaluationRequestSchema = z.object({
  taskId: z.string().min(1),
  submissionIds: z.array(z.string().min(1)).min(1),
  evaluationMode: evaluationModeSchema,
  evaluationPath: evaluationPathSchema.default("assisted_evaluation"),
  criteria: z.array(evaluationCriterionSchema).min(1),
  reviewerType: reviewerTypeSchema,
  taskSnapshot: z.record(z.string(), z.unknown()).optional(),
  resultSnapshot: z.record(z.string(), z.unknown()).optional(),
  outputSchema: z.union([z.string().min(1), z.record(z.string(), z.unknown())]).optional(),
});

export const evaluationScoreSchema = z.object({
  submissionId: z.string().min(1),
  agentId: z.string().min(1),
  score: z.number().min(0).max(100),
  normalizedScore: z.number().min(0).max(1),
  notes: z.string().min(1),
  breakdown: reviewerScoreBreakdownSchema.optional(),
});

export const reviewerFindingSchema = z.object({
  reviewerId: z.string().min(1),
  reviewerType: reviewerTypeSchema,
  decision: evaluationDecisionTypeSchema,
  acceptanceSignal: acceptanceSignalSchema,
  overallScore: z.number().min(0).max(100),
  confidence: z.number().min(0).max(1),
  summary: z.string().min(1),
  reasoning: z.string().min(1),
  criteriaScores: reviewerScoreBreakdownSchema,
  createdAt: isoDateTimeSchema,
});

export const evaluationResultSchema = z.object({
  evaluationId: z.string().min(1),
  taskId: z.string().min(1),
  winningSubmissionId: z.string().min(1).nullable(),
  scores: z.array(evaluationScoreSchema).min(1),
  summary: z.string().min(1),
  reasoning: z.string().min(1),
  normalizedScore: z.number().min(0).max(1),
  overallScore: z.number().min(0).max(100).optional(),
  finalDecision: evaluationDecisionTypeSchema.optional(),
  finalOutcome: consensusOutcomeSchema.optional(),
  consensusScore: z.number().min(0).max(100).optional(),
  validatorAgreement: z.number().min(0).max(1).optional(),
  consensusConfidence: z.number().min(0).max(1).optional(),
  equivalenceSummary: z.string().min(1).optional(),
  appealRound: z.number().int().nonnegative().optional(),
  path: evaluationPathSchema.optional(),
  findings: z.array(reviewerFindingSchema).default([]),
  reviewerType: reviewerTypeSchema,
  createdAt: isoDateTimeSchema,
});

export const settlementRecordSchema = z.object({
  settlementId: z.string().min(1),
  taskId: z.string().min(1),
  grossReward: z.number().nonnegative(),
  protocolFee: z.number().nonnegative(),
  netPayout: z.number().nonnegative(),
  receiverWallet: walletAddressSchema,
  txHash: z.string().min(1).nullable(),
  settledAt: isoDateTimeSchema,
}).superRefine((value, ctx) => {
  // Settlement math should always be derivable and internally consistent.
  if (value.grossReward < value.protocolFee) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["protocolFee"],
      message: "protocolFee cannot exceed grossReward",
    });
  }
  if (value.netPayout !== value.grossReward - value.protocolFee) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["netPayout"],
      message: "netPayout must equal grossReward minus protocolFee",
    });
  }
});

export const agentReputationSchema = z.object({
  agentId: z.string().min(1),
  tasksAttempted: z.number().int().nonnegative(),
  tasksCompleted: z.number().int().nonnegative(),
  paidTasksCompleted: z.number().int().nonnegative().default(0),
  approvals: z.number().int().nonnegative(),
  totalReviews: z.number().int().nonnegative(),
  rejectionCount: z.number().int().nonnegative(),
  refundedTasks: z.number().int().nonnegative().default(0),
  disputeCount: z.number().int().nonnegative(),
  successRate: z.number().min(0).max(1),
  approvalRate: z.number().min(0).max(1),
  averageScore: z.number().min(0).max(100),
  averageResponseTimeMs: z.number().int().nonnegative(),
  averageLatencyMs: z.number().int().nonnegative(),
  totalEarnings: z.number().nonnegative(),
  paidEarnings: z.number().nonnegative().default(0),
  pendingEarnings: z.number().nonnegative().default(0),
  reliabilityScore: z.number().min(0).max(100),
  rankScore: z.number().min(0).max(100),
  rankPosition: z.number().int().positive().nullable(),
  status: z.enum(["active", "new", "unavailable"]),
  trend: leaderboardTrendSchema,
});

export const userTrustSchema = z.object({
  walletAddress: walletAddressSchema,
  tasksPosted: z.number().int().nonnegative(),
  cancellationCount: z.number().int().nonnegative(),
  disputeFrequency: z.number().min(0).max(1),
  approvalBehaviorConsistency: z.number().min(0).max(1),
});

export const trustBadgeSchema = z.object({
  id: z.enum([
    "verified_compatible",
    "fast_response",
    "high_approval",
    "specialist_category",
    "reliable_operator",
    "new_promising",
  ]),
  label: z.string().min(1),
  tone: z.enum(["neutral", "good", "warn"]),
});

export const recentOutcomePointSchema = z.object({
  label: z.string().min(1),
  value: z.number().min(0).max(100),
  outcome: z.enum(["approved", "rejected", "disputed", "settled", "refunded", "pending"]),
});

export const leaderboardEntrySchema = z.object({
  rank: z.number().int().positive(),
  agentId: z.string().min(1),
  displayName: z.string().min(1),
  avatarUrl: urlSchema.nullable(),
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
  trend: leaderboardTrendSchema,
});

export const healthcheckResponseSchema = z.object({
  ok: z.boolean(),
  version: z.string().min(1),
  supportedTaskTypes: z.array(capabilityCategorySchema),
  maxInputBytes: z.number().int().positive(),
  averageLatencyHintMs: z.number().int().nonnegative(),
  signedOwnerProof: z
    .object({
      walletAddress: walletAddressSchema,
      signature: z.string().min(1),
      message: z.string().min(1),
    })
    .nullable()
    .optional(),
  schemaVersion: z.string().min(1),
});

export const agentAdapterAuthSchema = z.object({
  ownerWallet: walletAddressSchema,
  signature: z.string().min(1),
  timestamp: z.number().int().positive(),
});

export const erc8183JobStateSchema = z.enum([
  "mapped",
  "dispatched",
  "submitted",
  "completed",
  "rejected",
  "disputed",
  "refunded",
  "settled",
  "failed",
]);

export const erc8183JobSchema = z.object({
  standard: z.literal("erc-8183"),
  mode: z.enum(["adapter", "native"]),
  dispatchTaskId: z.string().min(1),
  jobId: z.string().min(1),
  payloadHash: z.string().min(1),
  state: erc8183JobStateSchema,
  requester: walletAddressSchema,
  providerAgentId: z.string().min(1).nullable(),
  evaluator: z.string().min(1).nullable(),
  title: z.string().min(1),
  description: z.string().min(1),
  category: capabilityCategorySchema,
  constraints: z.array(z.string().min(1)).default([]),
  reward: z.object({
    amount: z.string().min(1),
    tokenAddress: walletAddressSchema.nullable(),
    tokenSymbol: z.string().min(1),
    tokenDecimals: z.number().int().min(0),
  }),
  deadlineTimestamp: z.number().int().positive(),
  routing: z.object({
    hiringMode: z.enum(["direct_hire", "open_market"]),
    selectedAgentId: z.string().min(1).nullable(),
    maxParticipants: z.number().int().positive(),
  }),
  attachments: z.array(
    z.object({
      name: z.string().min(1),
      pointer: z.string().min(1),
      contentType: z.string().min(1),
      sizeBytes: z.number().int().nonnegative(),
    }),
  ).default([]),
  outputRequirements: z.union([z.string().min(1), z.record(z.string(), z.unknown())]),
  dispatchMetadata: z.record(z.string(), z.unknown()).default({}),
  inputPointer: z.string().min(1).nullable(),
  hook: z.string().min(1).nullable(),
  contractAddress: walletAddressSchema.nullable(),
  onchainJobId: z.string().min(1).nullable(),
  notes: z.array(z.string()).default([]),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  lastDispatchedAt: isoDateTimeSchema.nullable().optional(),
  lastSubmissionAt: isoDateTimeSchema.nullable().optional(),
  lastSettledAt: isoDateTimeSchema.nullable().optional(),
});

export const agentAdapterTaskRequestSchema = z.object({
  requestId: z.string().min(1),
  taskId: z.string().min(1),
  taskType: capabilityCategorySchema,
  title: z.string().min(1),
  description: z.string().min(1),
  structuredInput: z.record(z.string(), z.unknown()),
  attachments: z.array(
    z.object({
      name: z.string().min(1),
      contentType: z.string().min(1),
      pointer: z.string().min(1),
      sizeBytes: z.number().int().nonnegative(),
    }),
  ),
  expectedOutputSchema: z.union([z.string().min(1), z.record(z.string(), z.unknown())]),
  deadlineTimestamp: z.number().int().positive(),
  callbackUrl: urlSchema.nullable(),
  auth: agentAdapterAuthSchema,
  interop: z.object({
    erc8183Job: erc8183JobSchema,
  }).optional(),
});

export const agentAdapterTaskResponseSchema = z.object({
  accepted: z.boolean(),
  executionMode: z.enum(["sync", "async"]),
  runId: z.string().min(1),
  estimatedCompletionMs: z.number().int().nonnegative(),
  immediateResult: z.unknown().optional(),
  error: z
    .object({
      code: errorCodeSchema,
      message: z.string().min(1),
    })
    .nullable()
    .optional(),
});

export const agentAdapterRegistrationSchema = z.object({
  ownerWallet: walletAddressSchema,
  agentId: z.string().min(1),
  endpointUrl: urlSchema,
  healthcheckUrl: urlSchema,
  metadataHash: hashLikeSchema,
  signature: z.string().min(1),
});

export const agentStatusResponseSchema = z.object({
  state: z.enum(["queued", "running", "completed", "failed", "cancelled"]),
  progress: z.number().min(0).max(1),
  resultPointer: z.string().min(1).nullable().optional(),
  error: z
    .object({
      code: errorCodeSchema,
      message: z.string().min(1),
    })
    .nullable()
    .optional(),
});

export const agentResultResponseSchema = z.object({
  result: z.unknown(),
  confidence: z.number().min(0).max(1).nullable().optional(),
  structuredMetadata: z.record(z.string(), z.unknown()),
  completedAt: isoDateTimeSchema,
});

const usdcAmountSchema = z.number().nonnegative();
const optionalTxHashSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{64}$/)
  .nullable();

export const nanoBudgetStatusSchema = z.enum([
  "draft",
  "funding_proof_recorded",
  "spending",
  "completed",
  "unavailable",
]);

export const nanoSpendIntentStatusSchema = z.enum([
  "proposed",
  "approved",
  "payment_recorded",
  "failed",
  "skipped",
]);

export const nanoPayeeTypeSchema = z.enum(["source", "tool", "creator", "agent", "platform"]);
export const nanoProofTypeSchema = z.enum(["none", "local", "arc_tx", "circle_gateway", "x402", "external_reference"]);
export const nanoPaymentStateSchema = z.enum(["not_paid", "authorized", "recorded", "failed", "unavailable"]);

export const nanoPayeeSchema = z.object({
  payeeId: z.string().min(1),
  type: nanoPayeeTypeSchema,
  label: z.string().min(1).max(120),
  walletAddress: walletAddressSchema.nullable().optional(),
  externalRef: z.string().min(1).nullable().optional(),
});

export const nanoPolicySchema = z.object({
  maxBudgetAmount: usdcAmountSchema,
  maxSpendAmount: usdcAmountSchema,
  allowedPayeeTypes: z.array(nanoPayeeTypeSchema).min(1),
  requireApprovalForEachSpend: z.boolean().default(true),
  notes: z.array(z.string().max(240)).default([]),
}).superRefine((value, ctx) => {
  if (value.maxSpendAmount > value.maxBudgetAmount) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["maxSpendAmount"],
      message: "maxSpendAmount cannot exceed maxBudgetAmount",
    });
  }
});

export const nanoPaymentProofSchema = z.object({
  proofType: nanoProofTypeSchema.exclude(["none"]),
  paymentState: nanoPaymentStateSchema.exclude(["not_paid", "authorized"]),
  txHash: optionalTxHashSchema.default(null),
  proofReference: z.string().min(1),
  recordedAt: isoDateTimeSchema,
  notes: z.array(z.string().max(240)).default([]),
}).superRefine((value, ctx) => {
  if (value.proofType === "arc_tx" && !value.txHash) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["txHash"],
      message: "A valid txHash is required for arc_tx proof",
    });
  }
});

export const nanoBudgetSchema = z.object({
  budgetId: z.string().min(1),
  ownerWallet: walletAddressSchema,
  runId: z.string().min(1),
  goal: z.string().min(3).max(2000),
  amount: usdcAmountSchema,
  tokenSymbol: z.literal("USDC"),
  tokenDecimals: z.literal(6),
  network: z.literal("Arc Testnet"),
  status: nanoBudgetStatusSchema,
  policy: nanoPolicySchema,
  fundingProof: nanoPaymentProofSchema.nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export const nanoSpendIntentSchema = z.object({
  intentId: z.string().min(1),
  budgetId: z.string().min(1),
  runId: z.string().min(1),
  ownerWallet: walletAddressSchema,
  payee: nanoPayeeSchema,
  amount: usdcAmountSchema,
  reason: z.string().min(3).max(1000),
  status: nanoSpendIntentStatusSchema,
  estimated: z.boolean().default(false),
  createdAt: isoDateTimeSchema,
  approvedAt: isoDateTimeSchema.nullable(),
  updatedAt: isoDateTimeSchema,
});

export const nanoSpendReceiptSchema = z.object({
  receiptId: z.string().min(1),
  intentId: z.string().min(1),
  budgetId: z.string().min(1),
  runId: z.string().min(1),
  ownerWallet: walletAddressSchema,
  payee: nanoPayeeSchema,
  amount: usdcAmountSchema,
  paymentState: nanoPaymentStateSchema,
  proof: nanoPaymentProofSchema,
  contributionSummary: z.string().min(1).max(1000),
  createdAt: isoDateTimeSchema,
});

export const nanoRunContextSchema = z.object({
  runId: z.string().min(1),
  budgetId: z.string().min(1),
  ownerWallet: walletAddressSchema,
  goal: z.string().min(3).max(2000),
  spendPlanSummary: z.string().max(2000).nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export const nanoMetricsSchema = z.object({
  generatedAt: isoDateTimeSchema,
  budgetCount: z.number().int().nonnegative(),
  spendIntentCount: z.number().int().nonnegative(),
  approvedSpendIntentCount: z.number().int().nonnegative(),
  sourceRequestCount: z.number().int().nonnegative(),
  receiptCount: z.number().int().nonnegative(),
  verifiedSourceUnlockCount: z.number().int().nonnegative(),
  verifiedArcReceiptCount: z.number().int().nonnegative(),
  totalAuthorizedBudget: usdcAmountSchema,
  totalApprovedIntentValue: usdcAmountSchema,
  totalRecordedPaymentValue: usdcAmountSchema,
  availableBudget: usdcAmountSchema,
  walletsWithBudgets: z.number().int().nonnegative(),
});

export type UserProfile = z.infer<typeof userProfileSchema>;
export type AgentProfile = z.infer<typeof agentProfileSchema>;
export type AgentVersion = z.infer<typeof agentVersionSchema>;
export type TaskCreateInput = z.infer<typeof taskCreateInputSchema>;
export type TaskRecord = z.infer<typeof taskRecordSchema>;
export type TaskSubmission = z.infer<typeof taskSubmissionSchema>;
export type EvaluationCriterion = z.infer<typeof evaluationCriterionSchema>;
export type ReviewerScoreBreakdown = z.infer<typeof reviewerScoreBreakdownSchema>;
export type UserReviewDecision = z.infer<typeof userReviewDecisionSchema>;
export type EvaluationRequest = z.infer<typeof evaluationRequestSchema>;
export type EvaluationScore = z.infer<typeof evaluationScoreSchema>;
export type ReviewerFinding = z.infer<typeof reviewerFindingSchema>;
export type EvaluationResult = z.infer<typeof evaluationResultSchema>;
export type SettlementRecord = z.infer<typeof settlementRecordSchema>;
export type AgentReputation = z.infer<typeof agentReputationSchema>;
export type UserTrust = z.infer<typeof userTrustSchema>;
export type TrustBadge = z.infer<typeof trustBadgeSchema>;
export type RecentOutcomePoint = z.infer<typeof recentOutcomePointSchema>;
export type LeaderboardEntry = z.infer<typeof leaderboardEntrySchema>;
export type HealthcheckResponse = z.infer<typeof healthcheckResponseSchema>;
export type Erc8183Job = z.infer<typeof erc8183JobSchema>;
export type AgentAdapterTaskRequest = z.infer<typeof agentAdapterTaskRequestSchema>;
export type AgentAdapterTaskResponse = z.infer<typeof agentAdapterTaskResponseSchema>;
export type AgentAdapterRegistration = z.infer<typeof agentAdapterRegistrationSchema>;
export type NanoBudgetStatus = z.infer<typeof nanoBudgetStatusSchema>;
export type NanoSpendIntentStatus = z.infer<typeof nanoSpendIntentStatusSchema>;
export type NanoPayeeType = z.infer<typeof nanoPayeeTypeSchema>;
export type NanoProofType = z.infer<typeof nanoProofTypeSchema>;
export type NanoPaymentState = z.infer<typeof nanoPaymentStateSchema>;
export type NanoPayee = z.infer<typeof nanoPayeeSchema>;
export type NanoPolicy = z.infer<typeof nanoPolicySchema>;
export type NanoPaymentProof = z.infer<typeof nanoPaymentProofSchema>;
export type NanoBudget = z.infer<typeof nanoBudgetSchema>;
export type NanoSpendIntent = z.infer<typeof nanoSpendIntentSchema>;
export type NanoSpendReceipt = z.infer<typeof nanoSpendReceiptSchema>;
export type NanoRunContext = z.infer<typeof nanoRunContextSchema>;
export type NanoMetrics = z.infer<typeof nanoMetricsSchema>;
