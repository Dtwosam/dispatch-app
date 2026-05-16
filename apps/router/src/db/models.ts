import type {
  LeaderboardBucket,
  SettlementReceipt,
  AgentHealthStatus,
  AgentProfile,
  AgentRegistrationState,
  AgentVersion,
  CreateAgentDraft,
  CompatibilityCheck,
  CompatibilityStatus,
  ErrorCode,
  RegistryAgentView,
  TaskDetailView,
  UserTrust,
  Erc8183Job,
  CapabilityCategory,
  LeaderboardTrend,
  RecentOutcomePoint,
  TrustBadge,
} from "@marketplace/shared";

export interface OwnerProofChallengeRow {
  challengeId: string;
  walletAddress: string;
  message: string;
  nonce: string;
  expiresAt: string;
  createdAt: string;
  verifiedAt: string | null;
  proofId: string | null;
  signature: string | null;
  status: "issued" | "verified" | "expired";
}

export interface AgentCompatibilityDeclarationRow {
  supportedCategories: string[];
  declaredLatencyEstimateMs: number;
  declaredMaxPayloadSize: number;
  versionHashOrFingerprint: string;
}

export interface AgentRegistryRow {
  profile: AgentProfile;
  registrationState: AgentRegistrationState;
  healthStatus: AgentHealthStatus;
  compatibilityStatus: CompatibilityStatus;
  latestVersionHash: string | null;
  suspensionReason: string | null;
  compatibilityDeclaration: AgentCompatibilityDeclarationRow | null;
}

export interface AgentVersionRow {
  version: AgentVersion;
  publishedByWallet: string;
}

export interface AgentHealthcheckRow {
  id: string;
  agentId: string;
  status: AgentHealthStatus;
  checkedAt: string;
  latencyMs: number;
  response: unknown;
  errorMessage: string | null;
}

export interface AgentCompatibilityCheckRow {
  id: string;
  agentId: string;
  report: CompatibilityCheck;
}

export interface AgentPerformanceRow {
  agentId: string;
  tasksAttempted: number;
  tasksCompleted: number;
  paidTasksCompleted: number;
  approvals: number;
  totalReviews: number;
  rejectionCount: number;
  refundedTasks: number;
  disputeCount: number;
  successRate: number;
  approvalRate: number;
  averageScore: number;
  averageResponseTimeMs: number;
  averageLatencyMs: number;
  totalEarnings: number;
  paidEarnings: number;
  pendingEarnings: number;
  reliabilityScore: number;
  rankScore: number;
  rankPosition: number | null;
  status: "active" | "new" | "unavailable";
  trend: LeaderboardTrend;
  recentOutcomes: RecentOutcomePoint[];
  trustBadges: TrustBadge[];
  specialistCategory: CapabilityCategory | null;
}

export interface UserTrustRow extends UserTrust {}

export interface LeaderboardCacheRow {
  generatedAt: string;
  buckets: LeaderboardBucket[];
}

export interface RegistryDatabase {
  ownerProofChallenges: Map<string, OwnerProofChallengeRow>;
  agents: Map<string, AgentRegistryRow>;
  versions: Map<string, AgentVersionRow[]>;
  healthchecks: Map<string, AgentHealthcheckRow[]>;
  compatibilityChecks: Map<string, AgentCompatibilityCheckRow[]>;
  performance: Map<string, AgentPerformanceRow>;
  userTrust: Map<string, UserTrustRow>;
  leaderboardCache: LeaderboardCacheRow | null;
  agentDrafts: Map<string, CreateAgentDraft>;
  tasks: Map<string, TaskDetailView>;
  erc8183Jobs: Map<string, Erc8183JobRow>;
  taskEvaluations: Map<string, unknown[]>;
  settlements: Map<string, SettlementReceipt[]>;
  executionRuns: Map<string, ExecutionRunRow>;
  executionLogs: Map<string, ExecutionLogRow[]>;
  executionRequestIds: Set<string>;
  executionCallbackNonces: Set<string>;
  executionMetrics: ExecutionMetricRow[];
  internalEvents: InternalEventRow[];
  adminAuditLogs: AdminAuditLogRow[];
  blacklistedEndpoints: Map<string, EndpointBlacklistRow>;
  moderationFlags: ModerationFlagRow[];
  pausedTasks: Map<string, TaskPauseRow>;
}

export interface Erc8183JobRow extends Erc8183Job {}

export type ExecutionFailureCategory =
  | "endpoint_unavailable"
  | "invalid_response_schema"
  | "task_timeout"
  | "callback_mismatch"
  | "malformed_result"
  | "unauthorized_agent_response"
  | "empty_result"
  | "partial_result";

export type ExecutionState =
  | "queued"
  | "dispatching"
  | "running"
  | "awaiting_callback"
  | "polling"
  | "completed"
  | "failed"
  | "timed_out"
  | "cancelled";

export interface ExecutionRunRow {
  runId: string;
  requestId: string;
  taskId: string;
  agentId: string;
  ownerWallet: string;
  endpointUrl: string;
  callbackUrl: string;
  state: ExecutionState;
  attempt: number;
  maxRetries: number;
  nextRetryAt: string | null;
  timeoutAt: string;
  executionMode: "sync" | "async" | null;
  remoteRunId: string | null;
  resultPointer: string | null;
  resultHash: string | null;
  rawPayload: unknown | null;
  normalizedPayload: unknown | null;
  errorCode: ErrorCode | null;
  failureCategory: ExecutionFailureCategory | null;
  lastErrorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface ExecutionLogRow {
  id: string;
  runId: string;
  taskId: string;
  agentId: string;
  level: "info" | "warn" | "error";
  event: string;
  message: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface ExecutionMetricRow {
  id: string;
  kind: "dispatch" | "status_poll" | "result_fetch" | "callback" | "retry" | "timeout";
  runId: string;
  taskId: string;
  value: number;
  unit: "ms" | "count";
  createdAt: string;
}

export interface InternalEventRow {
  id: string;
  topic: string;
  taskId: string;
  runId: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface AdminAuditLogRow {
  id: string;
  actorWallet: string;
  action:
    | "pause_task"
    | "refund_task"
    | "resolve_dispute"
    | "disable_agent"
    | "blacklist_endpoint";
  subjectType: "task" | "agent" | "endpoint";
  subjectId: string;
  reason: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface EndpointBlacklistRow {
  endpointUrl: string;
  reason: string;
  actorWallet: string;
  createdAt: string;
  active: boolean;
}

export interface ModerationFlagRow {
  id: string;
  kind:
    | "endpoint_blacklisted"
    | "task_spam"
    | "duplicate_result"
    | "abusive_user"
    | "suspicious_dispute_rate"
    | "suspicious_rejection_rate"
    | "execution_failure_pattern";
  severity: "low" | "medium" | "high";
  subjectType: "task" | "agent" | "user" | "endpoint";
  subjectId: string;
  summary: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface TaskPauseRow {
  taskId: string;
  reason: string;
  actorWallet: string;
  createdAt: string;
  active: boolean;
}

export function toRegistryAgentView(
  row: AgentRegistryRow,
  latestVersion: AgentVersion | null,
  compatibilityReport: CompatibilityCheck | null,
  performanceSummary: AgentPerformanceRow,
): RegistryAgentView {
  return {
    profile: row.profile,
    registrationState: row.registrationState,
    healthStatus: row.healthStatus,
    compatibilityStatus: row.compatibilityStatus,
    latestVersion,
    compatibilityReport,
    performanceSummary,
    suspensionReason: row.suspensionReason,
  };
}
