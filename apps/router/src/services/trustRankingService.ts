import type {
  AgentTrustProfile,
  CapabilityCategory,
  LeaderboardBucket,
  LeaderboardEntry,
  LeaderboardResponse,
  RecentOutcomePoint,
  TaskDetailView,
  TrustBadge,
  UserTrustResponse,
} from "@marketplace/shared";
import {
  agentTrustProfileSchema,
  leaderboardResponseSchema,
  userTrustResponseSchema,
} from "@marketplace/shared";
import type { AgentPerformanceRow, AgentRegistryRow, UserTrustRow } from "../db/models";
import { InMemoryRegistryStore } from "../db/store";

type TaskOutcome = "approved" | "rejected" | "disputed" | "settled" | "refunded" | "pending";

export class TrustRankingService {
  private refreshTimer: NodeJS.Timeout | null = null;
  private readonly cacheTtlMs = Number(process.env.TRUST_CACHE_TTL_MS ?? "60000");

  constructor(private readonly store: InMemoryRegistryStore) {}

  startJobs(intervalMs = Number(process.env.TRUST_RECOMPUTE_INTERVAL_MS ?? "30000")) {
    this.recomputeAll();
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    this.refreshTimer = setInterval(() => {
      this.recomputeAll();
    }, intervalMs);
  }

  stopJobs() {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    this.refreshTimer = null;
  }

  getLeaderboards(): LeaderboardResponse {
    this.ensureFresh();
    return leaderboardResponseSchema.parse(
      this.store.leaderboardCache ?? {
        generatedAt: new Date().toISOString(),
        buckets: [],
      },
    );
  }

  getAgentTrustProfile(agentId: string): AgentTrustProfile {
    this.ensureFresh();
    const agent = this.store.agents.get(agentId);
    if (!agent) throw new Error(`Agent ${agentId} not found`);
    const reputation = this.store.ensurePerformance(agentId);
    return agentTrustProfileSchema.parse({
      agentId,
      displayName: agent.profile.publicName,
      reputation,
    });
  }

  getUserTrust(walletAddress: string): UserTrustResponse {
    this.ensureFresh();
    return userTrustResponseSchema.parse({
      userTrust:
        this.store.userTrust.get(walletAddress) ??
        ({
          walletAddress,
          tasksPosted: 0,
          cancellationCount: 0,
          disputeFrequency: 0,
          approvalBehaviorConsistency: 0,
        } satisfies UserTrustRow),
    });
  }

  recomputeAll() {
    const performanceRows = [...this.store.agents.values()].map((row) => this.recomputeAgent(row));
    this.applyRankings(performanceRows);
    performanceRows.forEach((row) => this.store.performance.set(row.agentId, row));
    this.recomputeUserTrust();
    const cache: LeaderboardResponse = {
      generatedAt: new Date().toISOString(),
      buckets: this.buildLeaderboardBuckets(performanceRows),
    };
    this.store.leaderboardCache = cache;
  }

  private ensureFresh() {
    const generatedAt = this.store.leaderboardCache?.generatedAt;
    if (!generatedAt) {
      this.recomputeAll();
      return;
    }
    const ageMs = Date.now() - new Date(generatedAt).getTime();
    if (ageMs > this.cacheTtlMs) {
      this.recomputeAll();
    }
  }

  private recomputeAgent(agentRow: AgentRegistryRow): AgentPerformanceRow {
    const agentId = agentRow.profile.agentId;
    const linkedTasks = [...this.store.tasks.values()].filter(
      (task) =>
        task.selectedAgentId === agentId ||
        task.participatingAgentIds.includes(agentId) ||
        task.selectedAgents.some((agent) => agent.agentId === agentId),
    );
    const terminalTasks = linkedTasks.filter((task) => ["SETTLED", "REFUNDED"].includes(task.status));
    const approvedTasks = linkedTasks.filter((task) => task.status === "SETTLED" || task.status === "APPROVED");
    const rejectedTasks = linkedTasks.filter((task) => task.status === "REJECTED" || task.status === "REFUNDED");
    const disputedTasks = linkedTasks.filter((task) => task.disputeRecord);
    const scoredTasks = linkedTasks
      .map((task) => task.latestEvaluation?.overallScore ?? (task.userReview?.starRating ? task.userReview.starRating * 20 : null))
      .filter((value): value is number => typeof value === "number");

    const runLatencies = [...this.store.executionRuns.values()]
      .filter((run) => run.agentId === agentId && run.startedAt && run.completedAt)
      .map((run) => new Date(run.completedAt as string).getTime() - new Date(run.startedAt as string).getTime())
      .filter((value) => Number.isFinite(value) && value >= 0);

    const totalEarnings = (this.store.settlements.size
      ? [...this.store.settlements.entries()]
          .filter(([taskId]) => this.belongsToAgent(taskId, agentId))
          .flatMap(([, receipts]) => receipts)
          .reduce((sum, receipt) => sum + receipt.agentPayout, 0)
      : 0);

    const approvalRate =
      approvedTasks.length + rejectedTasks.length === 0
        ? 0
        : approvedTasks.length / (approvedTasks.length + rejectedTasks.length);
    const successRate =
      linkedTasks.length === 0
        ? 0
        : approvedTasks.length / linkedTasks.length;
    const averageScore =
      scoredTasks.length === 0 ? 0 : scoredTasks.reduce((sum, value) => sum + value, 0) / scoredTasks.length;
    const averageLatencyMs =
      runLatencies.length === 0 ? 0 : Math.round(runLatencies.reduce((sum, value) => sum + value, 0) / runLatencies.length);
    const completionRate = linkedTasks.length === 0 ? 0 : terminalTasks.length / linkedTasks.length;
    const latencyScore =
      averageLatencyMs === 0 ? 50 : clamp(100 - averageLatencyMs / 1200, 5, 100);
    const disputePenalty = disputedTasks.length * 6;
    const reliabilityScore = clamp(
      approvalRate * 45 + completionRate * 25 + (averageScore / 100) * 20 + (latencyScore / 100) * 10 - disputePenalty,
      0,
      100,
    );
    const trend = this.computeTrend(linkedTasks);
    const specialistCategory = this.computeSpecialistCategory(linkedTasks);
    const totalReviews = approvedTasks.length + rejectedTasks.length;
    const status = this.computeAgentStatus(agentRow, linkedTasks.length);
    const trustBadges = this.computeTrustBadges(agentRow, {
      approvalRate,
      averageLatencyMs,
      reliabilityScore,
      linkedTasks,
      specialistCategory,
    });

    return {
      agentId,
      tasksAttempted: linkedTasks.length,
      tasksCompleted: approvedTasks.length,
      approvals: approvedTasks.length,
      totalReviews,
      rejectionCount: rejectedTasks.length,
      disputeCount: disputedTasks.length,
      successRate: round(successRate, 4),
      approvalRate: round(approvalRate, 4),
      averageScore: round(averageScore, 2),
      averageResponseTimeMs: averageLatencyMs,
      averageLatencyMs,
      totalEarnings: round(totalEarnings, 2),
      reliabilityScore: round(reliabilityScore, 2),
      rankScore: 0,
      rankPosition: null,
      status,
      trend,
      recentOutcomes: this.buildRecentOutcomes(linkedTasks),
      trustBadges,
      specialistCategory,
    };
  }

  private recomputeUserTrust() {
    const grouped = new Map<string, TaskDetailView[]>();
    [...this.store.tasks.values()].forEach((task) => {
      const items = grouped.get(task.creatorWallet) ?? [];
      items.push(task);
      grouped.set(task.creatorWallet, items);
    });

    this.store.userTrust.clear();
    grouped.forEach((tasks, walletAddress) => {
      const tasksPosted = tasks.length;
      const cancellationCount = tasks.filter((task) => task.status === "CANCELLED").length;
      const disputeCount = tasks.filter((task) => task.disputeRecord).length;
      const reviewedTasks = tasks.filter((task) => task.userReview);
      const alignedReviews = reviewedTasks.filter((task) => {
        if (!task.userReview || !task.latestEvaluation?.finalDecision) return false;
        return task.userReview.decision === task.latestEvaluation.finalDecision;
      }).length;
      const approvalBehaviorConsistency =
        reviewedTasks.length === 0 ? 0.5 : alignedReviews / reviewedTasks.length;

      this.store.userTrust.set(walletAddress, {
        walletAddress,
        tasksPosted,
        cancellationCount,
        disputeFrequency: tasksPosted === 0 ? 0 : round(disputeCount / tasksPosted, 4),
        approvalBehaviorConsistency: round(approvalBehaviorConsistency, 4),
      });
    });
  }

  private buildLeaderboardBuckets(rows: AgentPerformanceRow[]): LeaderboardBucket[] {
    return [
      this.makeBucket(
        "top_earning_agents",
        "Top Earning Agents",
        "Who is consistently closing paid work on the marketplace.",
        [...rows].sort((a, b) => b.totalEarnings - a.totalEarnings),
      ),
      this.makeBucket(
        "highest_approval_rate",
        "Highest Approval Rate",
        "Strong quality outcomes with enough history to trust the signal.",
        [...rows]
          .filter((row) => row.tasksCompleted >= 1)
          .sort((a, b) => b.approvalRate - a.approvalRate || b.reliabilityScore - a.reliabilityScore),
      ),
      this.makeBucket(
        "fastest_reliable_agents",
        "Fastest Reliable Agents",
        "Fast turnaround only matters when quality stays dependable.",
        [...rows]
          .filter((row) => row.reliabilityScore >= 55)
          .sort((a, b) => a.averageLatencyMs - b.averageLatencyMs || b.reliabilityScore - a.reliabilityScore),
      ),
      this.makeBucket(
        "trending_this_week",
        "Trending This Week",
        "Agents improving their outcomes and momentum over the recent period.",
        [...rows]
          .filter((row) => row.trend !== "down")
          .sort((a, b) => trendWeight(b.trend) - trendWeight(a.trend) || b.reliabilityScore - a.reliabilityScore),
      ),
      this.makeBucket(
        "newest_promising_agents",
        "Newest Promising Agents",
        "Recently published agents showing early but encouraging signals.",
        [...rows]
          .filter((row) => this.isNewAgent(row.agentId))
          .sort((a, b) => b.reliabilityScore - a.reliabilityScore || b.averageScore - a.averageScore),
      ),
    ];
  }

  private makeBucket(
    key: LeaderboardBucket["key"],
    title: string,
    description: string,
    rows: AgentPerformanceRow[],
  ): LeaderboardBucket {
    const items: LeaderboardEntry[] = rows.slice(0, 5).map((row, index) => {
      const agent = this.store.agents.get(row.agentId);
      return {
        rank: index + 1,
        agentId: row.agentId,
        displayName: agent?.profile.publicName ?? row.agentId,
        avatarUrl: agent?.profile.avatarUrl ?? null,
        successRate: row.successRate,
        approvalRate: row.approvalRate,
        averageScore: row.averageScore,
        averageResponseTimeMs: row.averageResponseTimeMs,
        totalEarnings: row.totalEarnings,
        averageLatencyMs: row.averageLatencyMs,
        reliabilityScore: row.reliabilityScore,
        rankScore: row.rankScore,
        status: row.status,
        trustBadges: row.trustBadges,
        trend: row.trend,
      };
    });

    return { key, title, description, items };
  }

  private belongsToAgent(taskId: string, agentId: string) {
    const task = this.store.tasks.get(taskId);
    if (!task) return false;
    return task.selectedAgentId === agentId || task.participatingAgentIds.includes(agentId);
  }

  private computeTrend(tasks: TaskDetailView[]) {
    const now = Date.now();
    const weekMs = 1000 * 60 * 60 * 24 * 7;
    const recentScores = tasks
      .filter((task) => now - new Date(task.updatedAt).getTime() <= weekMs)
      .map((task) => normalizeOutcomeScore(task));
    const previousScores = tasks
      .filter((task) => {
        const age = now - new Date(task.updatedAt).getTime();
        return age > weekMs && age <= weekMs * 2;
      })
      .map((task) => normalizeOutcomeScore(task));
    return this.computeTrendFromScores(recentScores, previousScores);
  }

  private computeTrendFromScores(recentScores: number[], previousScores: number[]) {
    const recent = recentScores.length === 0 ? 0 : recentScores.reduce((sum, value) => sum + value, 0) / recentScores.length;
    const previous = previousScores.length === 0 ? 0 : previousScores.reduce((sum, value) => sum + value, 0) / previousScores.length;
    if (recent - previous > 8) return "up";
    if (previous - recent > 8) return "down";
    return "flat";
  }

  private buildRecentOutcomes(tasks: TaskDetailView[]): RecentOutcomePoint[] {
    return tasks
      .slice()
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 7)
      .reverse()
      .map((task, index) => ({
        label: `T${index + 1}`,
        value: round(normalizeOutcomeScore(task), 2),
        outcome: outcomeForTask(task),
      }));
  }

  private computeSpecialistCategory(tasks: Array<{ category: CapabilityCategory }>): CapabilityCategory | null {
    if (tasks.length === 0) return null;
    const counts = new Map<CapabilityCategory, number>();
    tasks.forEach((task) => {
      counts.set(task.category, (counts.get(task.category) ?? 0) + 1);
    });
    const winner = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (!winner) return null;
    return winner[1] / tasks.length >= 0.6 ? winner[0] : null;
  }

  private computeTrustBadges(
    agent: AgentRegistryRow,
    input: {
      approvalRate: number;
      averageLatencyMs: number;
      reliabilityScore: number;
      linkedTasks: Array<{ category: CapabilityCategory }>;
      specialistCategory: CapabilityCategory | null;
    },
  ): TrustBadge[] {
    const badges: TrustBadge[] = [];

    if (agent.compatibilityStatus === "compatible" && agent.healthStatus === "healthy") {
      badges.push({ id: "verified_compatible", label: "Verified Compatible", tone: "good" });
    }
    if (input.averageLatencyMs > 0 && input.averageLatencyMs <= 20_000) {
      badges.push({ id: "fast_response", label: "Fast Response", tone: "good" });
    }
    if (input.linkedTasks.length >= 2 && input.approvalRate >= 0.8) {
      badges.push({ id: "high_approval", label: "High Approval", tone: "good" });
    }
    if (input.specialistCategory) {
      badges.push({ id: "specialist_category", label: `${labelize(input.specialistCategory)} Specialist`, tone: "neutral" });
    }
    if (input.reliabilityScore >= 70) {
      badges.push({ id: "reliable_operator", label: "Reliable Operator", tone: "good" });
    }
    if (this.isNewAgent(agent.profile.agentId) && input.reliabilityScore >= 55) {
      badges.push({ id: "new_promising", label: "New And Promising", tone: "neutral" });
    }

    return badges.slice(0, 4);
  }

  private isNewAgent(agentId: string) {
    const createdAt = this.store.agents.get(agentId)?.profile.createdAt;
    if (!createdAt) return false;
    return Date.now() - new Date(createdAt).getTime() <= 1000 * 60 * 60 * 24 * 14;
  }

  private applyRankings(rows: AgentPerformanceRow[]) {
    const maxCompleted = Math.max(1, ...rows.map((row) => row.tasksCompleted));
    const maxEarnings = Math.max(1, ...rows.map((row) => row.totalEarnings));

    rows.forEach((row) => {
      const completionScore = row.tasksCompleted / maxCompleted;
      const earningsScore = row.totalEarnings / maxEarnings;
      const speedScore = row.averageResponseTimeMs === 0
        ? 0.55
        : clamp(1 - row.averageResponseTimeMs / 90000, 0.2, 1);
      const historyFactor = row.tasksAttempted === 0
        ? 0.35
        : clamp(0.45 + row.tasksAttempted / 10, 0.45, 1);
      const rawScore = (
        row.successRate * 0.34 +
        row.approvalRate * 0.28 +
        completionScore * 0.16 +
        speedScore * 0.12 +
        earningsScore * 0.10
      ) * 100;
      row.rankScore = round(rawScore * historyFactor, 2);
    });

    [...rows]
      .sort((left, right) =>
        right.rankScore - left.rankScore
        || right.successRate - left.successRate
        || right.approvalRate - left.approvalRate
        || right.tasksCompleted - left.tasksCompleted
        || left.averageResponseTimeMs - right.averageResponseTimeMs,
      )
      .forEach((row, index) => {
        row.rankPosition = index + 1;
      });
  }

  private computeAgentStatus(agent: AgentRegistryRow, tasksAttempted: number): AgentPerformanceRow["status"] {
    if (!agent.profile.isActive || agent.registrationState === "suspended" || agent.healthStatus === "suspended") {
      return "unavailable";
    }
    if (tasksAttempted === 0 || this.isNewAgent(agent.profile.agentId)) {
      return "new";
    }
    return "active";
  }
}

function outcomeForTask(task: { status: string; settlementState?: string | null }): TaskOutcome {
  if (task.status === "SETTLED") return "settled";
  if (task.status === "REFUNDED") return "refunded";
  if (task.status === "REJECTED") return "rejected";
  if (task.status === "DISPUTED") return "disputed";
  if (task.status === "APPROVED") return "approved";
  return "pending";
}

function normalizeOutcomeScore(task: {
  status: string;
  latestEvaluation?: { overallScore?: number | undefined } | null;
  userReview?: { starRating?: number | null } | null;
}) {
  if (typeof task.latestEvaluation?.overallScore === "number") return task.latestEvaluation.overallScore;
  if (typeof task.userReview?.starRating === "number") return task.userReview.starRating * 20;
  if (task.status === "SETTLED") return 85;
  if (task.status === "REFUNDED" || task.status === "REJECTED") return 25;
  if (task.status === "DISPUTED") return 40;
  return 55;
}

function trendWeight(trend: LeaderboardEntry["trend"]) {
  if (trend === "up") return 2;
  if (trend === "flat") return 1;
  return 0;
}

function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function labelize(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
