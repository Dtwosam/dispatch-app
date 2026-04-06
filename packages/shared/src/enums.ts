import { z } from "zod";

// These enums are the canonical vocabulary for every service boundary.
export const capabilityCategories = [
  "research",
  "writing",
  "summarization",
  "coding",
  "code_helper",
  "design",
  "analysis",
  "translation",
  "automation",
  "data_extraction",
  "document_qa",
  "marketing",
  "operations",
  "support",
] as const;

export const originTypes = ["platform", "external"] as const;
export const taskModes = ["direct_hire", "open_market"] as const;
export const evaluationModes = ["human_only", "assisted_scoring", "subjective_consensus"] as const;
export const reviewerTypes = [
  "buyer",
  "admin",
  "machine_assisted",
  "validator_subjective",
  "genlayer_subjective",
  "constraint_auditor",
  "equivalence_reviewer",
  "evidence_risk_reviewer",
  "format_usefulness_reviewer",
] as const;
export const evaluationPaths = ["user_review", "assisted_evaluation", "hybrid_review", "subjective_consensus"] as const;
export const evaluationCriterionKeys = [
  "completion",
  "relevance",
  "correctness_proxy",
  "formatting",
  "usefulness",
  "latency_awareness",
] as const;
export const evaluationDecisionTypes = ["approve", "reject", "needs_human_review"] as const;
export const consensusOutcomes = ["accepted", "rejected", "disputed", "unresolved"] as const;
export const acceptanceSignals = ["accept", "reject", "uncertain"] as const;
export const configTypes = ["prompt_config", "tool_profile", "template_bundle", "hybrid"] as const;
export const taskStatuses = [
  "CREATED",
  "ESCROW_FUNDED",
  "OPEN",
  "ASSIGNED",
  "EXECUTING",
  "SUBMITTED",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "DISPUTED",
  "APPEALED",
  "UNRESOLVED",
  "SETTLED",
  "CANCELLED",
  "REFUNDED",
] as const;

export const submissionStatuses = [
  "submitted",
  "accepted",
  "rejected",
  "withdrawn",
  "superseded",
] as const;

export const leaderboardTrends = ["up", "down", "flat"] as const;
export const agentHealthStatuses = ["unknown", "healthy", "degraded", "unhealthy", "suspended"] as const;
export const compatibilityStatuses = ["unknown", "compatible", "warning", "incompatible"] as const;
export const agentRegistrationStates = ["draft", "verified", "published", "active", "inactive", "suspended"] as const;

export const errorCodes = [
  "VALIDATION_ERROR",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "INVALID_STATE_TRANSITION",
  "AGENT_UNHEALTHY",
  "AGENT_TIMEOUT",
  "ADAPTER_SIGNATURE_INVALID",
  "ESCROW_FUNDING_REQUIRED",
  "SETTLEMENT_BLOCKED",
  "DISPUTE_OPEN",
  "CHAIN_WRITE_FAILED",
  "CHAIN_READ_FAILED",
  "INDEXER_LAGGING",
  "RATE_LIMITED",
] as const;

export const capabilityCategorySchema = z.enum(capabilityCategories);
export const originTypeSchema = z.enum(originTypes);
export const taskModeSchema = z.enum(taskModes);
export const evaluationModeSchema = z.enum(evaluationModes);
export const reviewerTypeSchema = z.enum(reviewerTypes);
export const evaluationPathSchema = z.enum(evaluationPaths);
export const evaluationCriterionKeySchema = z.enum(evaluationCriterionKeys);
export const evaluationDecisionTypeSchema = z.enum(evaluationDecisionTypes);
export const consensusOutcomeSchema = z.enum(consensusOutcomes);
export const acceptanceSignalSchema = z.enum(acceptanceSignals);
export const configTypeSchema = z.enum(configTypes);
export const taskStatusSchema = z.enum(taskStatuses);
export const submissionStatusSchema = z.enum(submissionStatuses);
export const leaderboardTrendSchema = z.enum(leaderboardTrends);
export const agentHealthStatusSchema = z.enum(agentHealthStatuses);
export const compatibilityStatusSchema = z.enum(compatibilityStatuses);
export const agentRegistrationStateSchema = z.enum(agentRegistrationStates);
export const errorCodeSchema = z.enum(errorCodes);

export type CapabilityCategory = z.infer<typeof capabilityCategorySchema>;
export type OriginType = z.infer<typeof originTypeSchema>;
export type TaskMode = z.infer<typeof taskModeSchema>;
export type EvaluationMode = z.infer<typeof evaluationModeSchema>;
export type ReviewerType = z.infer<typeof reviewerTypeSchema>;
export type EvaluationPath = z.infer<typeof evaluationPathSchema>;
export type EvaluationCriterionKey = z.infer<typeof evaluationCriterionKeySchema>;
export type EvaluationDecisionType = z.infer<typeof evaluationDecisionTypeSchema>;
export type ConsensusOutcome = z.infer<typeof consensusOutcomeSchema>;
export type AcceptanceSignal = z.infer<typeof acceptanceSignalSchema>;
export type ConfigType = z.infer<typeof configTypeSchema>;
export type TaskStatus = z.infer<typeof taskStatusSchema>;
export type SubmissionStatus = z.infer<typeof submissionStatusSchema>;
export type LeaderboardTrend = z.infer<typeof leaderboardTrendSchema>;
export type AgentHealthStatus = z.infer<typeof agentHealthStatusSchema>;
export type CompatibilityStatus = z.infer<typeof compatibilityStatusSchema>;
export type AgentRegistrationState = z.infer<typeof agentRegistrationStateSchema>;
export type ErrorCode = z.infer<typeof errorCodeSchema>;
