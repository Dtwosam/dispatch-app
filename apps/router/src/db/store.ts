import type { CreateAgentDraft, SettlementReceipt, TaskDetailView } from "@marketplace/shared";
import type {
  AdminAuditLogRow,
  AgentCompatibilityCheckRow,
  AgentHealthcheckRow,
  AgentPerformanceRow,
  AgentRegistryRow,
  AgentVersionRow,
  Erc8183JobRow,
  EndpointBlacklistRow,
  ExecutionLogRow,
  ExecutionMetricRow,
  ExecutionRunRow,
  InternalEventRow,
  LeaderboardCacheRow,
  ModerationFlagRow,
  OwnerProofChallengeRow,
  RegistryDatabase,
  TaskPauseRow,
  UserTrustRow,
} from "./models";

type StoreSnapshot = {
  ownerProofChallenges: Array<[string, OwnerProofChallengeRow]>;
  agents: Array<[string, AgentRegistryRow]>;
  versions: Array<[string, AgentVersionRow[]]>;
  healthchecks: Array<[string, AgentHealthcheckRow[]]>;
  compatibilityChecks: Array<[string, AgentCompatibilityCheckRow[]]>;
  performance: Array<[string, AgentPerformanceRow]>;
  userTrust: Array<[string, UserTrustRow]>;
  leaderboardCache: LeaderboardCacheRow | null;
  agentDrafts: Array<[string, CreateAgentDraft]>;
  tasks: Array<[string, TaskDetailView]>;
  erc8183Jobs: Array<[string, Erc8183JobRow]>;
  taskEvaluations: Array<[string, unknown[]]>;
  settlements: Array<[string, SettlementReceipt[]]>;
  executionRuns: Array<[string, ExecutionRunRow]>;
  executionLogs: Array<[string, ExecutionLogRow[]]>;
  executionRequestIds: string[];
  executionCallbackNonces: string[];
  executionMetrics: ExecutionMetricRow[];
  internalEvents: InternalEventRow[];
  adminAuditLogs: AdminAuditLogRow[];
  blacklistedEndpoints: Array<[string, EndpointBlacklistRow]>;
  moderationFlags: ModerationFlagRow[];
  pausedTasks: Array<[string, TaskPauseRow]>;
};

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function trackMap<K, V>(map: Map<K, V>, onChange: () => void) {
  const originalSet = map.set.bind(map);
  const originalDelete = map.delete.bind(map);
  const originalClear = map.clear.bind(map);
  map.set = ((key: K, value: V) => {
    const result = originalSet(key, value);
    onChange();
    return result;
  }) as typeof map.set;
  map.delete = ((key: K) => {
    const result = originalDelete(key);
    if (result) onChange();
    return result;
  }) as typeof map.delete;
  map.clear = (() => {
    if (map.size > 0) {
      originalClear();
      onChange();
    }
  }) as typeof map.clear;
  return map;
}

function trackSet<T>(set: Set<T>, onChange: () => void) {
  const originalAdd = set.add.bind(set);
  const originalDelete = set.delete.bind(set);
  const originalClear = set.clear.bind(set);
  set.add = ((value: T) => {
    const before = set.size;
    const result = originalAdd(value);
    if (set.size !== before) onChange();
    return result;
  }) as typeof set.add;
  set.delete = ((value: T) => {
    const result = originalDelete(value);
    if (result) onChange();
    return result;
  }) as typeof set.delete;
  set.clear = (() => {
    if (set.size > 0) {
      originalClear();
      onChange();
    }
  }) as typeof set.clear;
  return set;
}

function trackArray<T>(items: T[], onChange: () => void) {
  const mutators = ["push", "pop", "shift", "unshift", "splice", "sort", "reverse", "copyWithin", "fill"] as const;
  for (const method of mutators) {
    const original = (items[method] as (...args: unknown[]) => unknown).bind(items);
    (items as unknown as Record<string, (...args: unknown[]) => unknown>)[method] = (...args: unknown[]) => {
      const result = original(...args);
      onChange();
      return result;
    };
  }
  return items;
}

export class InMemoryRegistryStore implements RegistryDatabase {
  ownerProofChallenges: Map<string, OwnerProofChallengeRow>;
  agents: Map<string, AgentRegistryRow>;
  versions: Map<string, AgentVersionRow[]>;
  healthchecks: Map<string, AgentHealthcheckRow[]>;
  compatibilityChecks: Map<string, AgentCompatibilityCheckRow[]>;
  performance: Map<string, AgentPerformanceRow>;
  userTrust: Map<string, UserTrustRow>;
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

  private onChange: () => void;
  private notificationsPaused = false;
  private _leaderboardCache: LeaderboardCacheRow | null = null;

  constructor(onChange: () => void = () => {}) {
    this.onChange = onChange;
    this.ownerProofChallenges = trackMap(new Map(), () => this.notifyChange());
    this.agents = trackMap(new Map(), () => this.notifyChange());
    this.versions = trackMap(new Map(), () => this.notifyChange());
    this.healthchecks = trackMap(new Map(), () => this.notifyChange());
    this.compatibilityChecks = trackMap(new Map(), () => this.notifyChange());
    this.performance = trackMap(new Map(), () => this.notifyChange());
    this.userTrust = trackMap(new Map(), () => this.notifyChange());
    this.agentDrafts = trackMap(new Map(), () => this.notifyChange());
    this.tasks = trackMap(new Map(), () => this.notifyChange());
    this.erc8183Jobs = trackMap(new Map(), () => this.notifyChange());
    this.taskEvaluations = trackMap(new Map(), () => this.notifyChange());
    this.settlements = trackMap(new Map(), () => this.notifyChange());
    this.executionRuns = trackMap(new Map(), () => this.notifyChange());
    this.executionLogs = trackMap(new Map(), () => this.notifyChange());
    this.executionRequestIds = trackSet(new Set(), () => this.notifyChange());
    this.executionCallbackNonces = trackSet(new Set(), () => this.notifyChange());
    this.executionMetrics = trackArray([], () => this.notifyChange());
    this.internalEvents = trackArray([], () => this.notifyChange());
    this.adminAuditLogs = trackArray([], () => this.notifyChange());
    this.blacklistedEndpoints = trackMap(new Map(), () => this.notifyChange());
    this.moderationFlags = trackArray([], () => this.notifyChange());
    this.pausedTasks = trackMap(new Map(), () => this.notifyChange());
  }

  get leaderboardCache() {
    return this._leaderboardCache;
  }

  set leaderboardCache(value: LeaderboardCacheRow | null) {
    this._leaderboardCache = value;
    this.notifyChange();
  }

  setChangeHandler(onChange: () => void) {
    this.onChange = onChange;
  }

  exportSnapshot(): StoreSnapshot {
    return cloneJson({
      ownerProofChallenges: [...this.ownerProofChallenges.entries()],
      agents: [...this.agents.entries()],
      versions: [...this.versions.entries()],
      healthchecks: [...this.healthchecks.entries()],
      compatibilityChecks: [...this.compatibilityChecks.entries()],
      performance: [...this.performance.entries()],
      userTrust: [...this.userTrust.entries()],
      leaderboardCache: this.leaderboardCache,
      agentDrafts: [...this.agentDrafts.entries()],
      tasks: [...this.tasks.entries()],
      erc8183Jobs: [...this.erc8183Jobs.entries()],
      taskEvaluations: [...this.taskEvaluations.entries()],
      settlements: [...this.settlements.entries()],
      executionRuns: [...this.executionRuns.entries()],
      executionLogs: [...this.executionLogs.entries()],
      executionRequestIds: [...this.executionRequestIds.values()],
      executionCallbackNonces: [...this.executionCallbackNonces.values()],
      executionMetrics: this.executionMetrics,
      internalEvents: this.internalEvents,
      adminAuditLogs: this.adminAuditLogs,
      blacklistedEndpoints: [...this.blacklistedEndpoints.entries()],
      moderationFlags: this.moderationFlags,
      pausedTasks: [...this.pausedTasks.entries()],
    });
  }

  importSnapshot(snapshot: Partial<StoreSnapshot> | null | undefined) {
    if (!snapshot) return;
    this.notificationsPaused = true;
    try {
      this.ownerProofChallenges.clear();
      for (const [key, value] of snapshot.ownerProofChallenges ?? []) this.ownerProofChallenges.set(key, value);
      this.agents.clear();
      for (const [key, value] of snapshot.agents ?? []) this.agents.set(key, value);
      this.versions.clear();
      for (const [key, value] of snapshot.versions ?? []) this.versions.set(key, value);
      this.healthchecks.clear();
      for (const [key, value] of snapshot.healthchecks ?? []) this.healthchecks.set(key, value);
      this.compatibilityChecks.clear();
      for (const [key, value] of snapshot.compatibilityChecks ?? []) this.compatibilityChecks.set(key, value);
      this.performance.clear();
      for (const [key, value] of snapshot.performance ?? []) this.performance.set(key, value);
      this.userTrust.clear();
      for (const [key, value] of snapshot.userTrust ?? []) this.userTrust.set(key, value);
      this._leaderboardCache = snapshot.leaderboardCache ?? null;
      this.agentDrafts.clear();
      for (const [key, value] of snapshot.agentDrafts ?? []) this.agentDrafts.set(key, value);
      this.tasks.clear();
      for (const [key, value] of snapshot.tasks ?? []) this.tasks.set(key, value);
      this.erc8183Jobs.clear();
      for (const [key, value] of snapshot.erc8183Jobs ?? []) this.erc8183Jobs.set(key, value);
      this.taskEvaluations.clear();
      for (const [key, value] of snapshot.taskEvaluations ?? []) this.taskEvaluations.set(key, value);
      this.settlements.clear();
      for (const [key, value] of snapshot.settlements ?? []) this.settlements.set(key, value);
      this.executionRuns.clear();
      for (const [key, value] of snapshot.executionRuns ?? []) this.executionRuns.set(key, value);
      this.executionLogs.clear();
      for (const [key, value] of snapshot.executionLogs ?? []) this.executionLogs.set(key, value);
      this.executionRequestIds.clear();
      for (const value of snapshot.executionRequestIds ?? []) this.executionRequestIds.add(value);
      this.executionCallbackNonces.clear();
      for (const value of snapshot.executionCallbackNonces ?? []) this.executionCallbackNonces.add(value);
      this.executionMetrics.length = 0;
      this.executionMetrics.push(...cloneJson(snapshot.executionMetrics ?? []));
      this.internalEvents.length = 0;
      this.internalEvents.push(...cloneJson(snapshot.internalEvents ?? []));
      this.adminAuditLogs.length = 0;
      this.adminAuditLogs.push(...cloneJson(snapshot.adminAuditLogs ?? []));
      this.blacklistedEndpoints.clear();
      for (const [key, value] of snapshot.blacklistedEndpoints ?? []) this.blacklistedEndpoints.set(key, value);
      this.moderationFlags.length = 0;
      this.moderationFlags.push(...cloneJson(snapshot.moderationFlags ?? []));
      this.pausedTasks.clear();
      for (const [key, value] of snapshot.pausedTasks ?? []) this.pausedTasks.set(key, value);
    } finally {
      this.notificationsPaused = false;
    }
  }

  upsertAgent(row: AgentRegistryRow) {
    this.agents.set(row.profile.agentId, row);
  }

  appendVersion(agentId: string, row: AgentVersionRow) {
    const items = this.versions.get(agentId) ?? [];
    items.push(row);
    this.versions.set(agentId, items);
  }

  appendHealthcheck(agentId: string, row: AgentHealthcheckRow) {
    const items = this.healthchecks.get(agentId) ?? [];
    items.push(row);
    this.healthchecks.set(agentId, items);
  }

  appendCompatibilityCheck(agentId: string, row: AgentCompatibilityCheckRow) {
    const items = this.compatibilityChecks.get(agentId) ?? [];
    items.push(row);
    this.compatibilityChecks.set(agentId, items);
  }

  ensurePerformance(agentId: string): AgentPerformanceRow {
    const existing = this.performance.get(agentId);
    if (existing) {
      const normalized = {
        ...existing,
        paidTasksCompleted: existing.paidTasksCompleted ?? 0,
        refundedTasks: existing.refundedTasks ?? 0,
        paidEarnings: existing.paidEarnings ?? existing.totalEarnings ?? 0,
        pendingEarnings: existing.pendingEarnings ?? 0,
      };
      this.performance.set(agentId, normalized);
      return normalized;
    }
    const seeded: AgentPerformanceRow = {
      agentId,
      tasksAttempted: 0,
      tasksCompleted: 0,
      paidTasksCompleted: 0,
      approvals: 0,
      totalReviews: 0,
      rejectionCount: 0,
      refundedTasks: 0,
      disputeCount: 0,
      successRate: 0,
      approvalRate: 0,
      averageScore: 0,
      averageResponseTimeMs: 0,
      averageLatencyMs: 0,
      totalEarnings: 0,
      paidEarnings: 0,
      pendingEarnings: 0,
      reliabilityScore: 0,
      rankScore: 0,
      rankPosition: null,
      status: "new",
      trend: "flat",
      recentOutcomes: [],
      trustBadges: [],
      specialistCategory: null,
    };
    this.performance.set(agentId, seeded);
    return seeded;
  }

  appendExecutionLog(runId: string, row: ExecutionLogRow) {
    const items = this.executionLogs.get(runId) ?? [];
    items.push(row);
    this.executionLogs.set(runId, items);
  }

  appendSettlement(taskId: string, receipt: SettlementReceipt) {
    const items = this.settlements.get(taskId) ?? [];
    items.push(receipt);
    this.settlements.set(taskId, items);
  }

  private notifyChange() {
    if (!this.notificationsPaused) {
      this.onChange();
    }
  }
}
