import { makeId } from "../lib/ids";
import type { InMemoryRegistryStore } from "../db/store";
import type { ModerationFlagRow } from "../db/models";

export class SafetyService {
  constructor(private readonly store: InMemoryRegistryStore) {}

  validateEndpoint(endpointUrl: string) {
    try {
      const parsed = new URL(endpointUrl);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        throw new Error("Endpoint must use http or https");
      }
      if (this.isEndpointBlacklisted(endpointUrl)) {
        throw new Error("Endpoint is blacklisted");
      }
      return true;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : "Endpoint validation failed");
    }
  }

  isEndpointBlacklisted(endpointUrl: string) {
    const row = this.store.blacklistedEndpoints.get(endpointUrl);
    return Boolean(row && row.active);
  }

  evaluateTaskCreation(wallet: string, title: string, description: string) {
    const recentTasks = [...this.store.tasks.values()].filter(
      (task) =>
        task.creatorWallet === wallet
        && task.transactionState !== "failed"
        && Date.now() - new Date(task.createdAt).getTime() < 10 * 60 * 1000,
    );
    if (recentTasks.length >= 5) {
      this.flag("task_spam", "high", "user", wallet, "High-frequency task posting detected.", { recentTasks: recentTasks.length });
      throw new Error("Rate limit reached for rapid task posting");
    }

    const normalized = `${title.trim().toLowerCase()}::${description.trim().toLowerCase()}`;
    const duplicate = recentTasks.find(
      (task) => `${task.title.trim().toLowerCase()}::${task.description.trim().toLowerCase()}` === normalized,
    );
    if (duplicate) {
      this.flag("task_spam", "medium", "user", wallet, "Duplicate-looking task detected.", { duplicateTaskId: duplicate.taskId });
      throw new Error("A very similar task was already posted recently");
    }
  }

  recordDuplicateResult(agentId: string, resultHash: string, runId: string) {
    const duplicateRun = [...this.store.executionRuns.values()].find(
      (run) => run.agentId === agentId && run.resultHash === resultHash && run.runId !== runId,
    );
    if (duplicateRun) {
      this.flag("duplicate_result", "medium", "agent", agentId, "Duplicate result hash detected across runs.", {
        resultHash,
        priorRunId: duplicateRun.runId,
        runId,
      });
    }
  }

  computeSuspiciousPatterns() {
    const flags = [...this.store.moderationFlags];
    const tasks = [...this.store.tasks.values()];
    const byCreator = new Map<string, typeof tasks>();

    for (const task of tasks) {
      const items = byCreator.get(task.creatorWallet) ?? [];
      items.push(task);
      byCreator.set(task.creatorWallet, items);
    }

    for (const [wallet, userTasks] of byCreator.entries()) {
      const disputed = userTasks.filter((task) => task.status === "DISPUTED").length;
      const rejected = userTasks.filter((task) => task.status === "REJECTED").length;
      if (userTasks.length >= 3 && disputed / userTasks.length >= 0.5) {
        flags.push(this.previewFlag("suspicious_dispute_rate", "medium", "user", wallet, "High dispute frequency detected.", {
          disputeRate: disputed / userTasks.length,
          taskCount: userTasks.length,
        }));
      }
      if (userTasks.length >= 3 && rejected / userTasks.length >= 0.7) {
        flags.push(this.previewFlag("suspicious_rejection_rate", "medium", "user", wallet, "High rejection frequency detected.", {
          rejectionRate: rejected / userTasks.length,
          taskCount: userTasks.length,
        }));
      }
    }

    const failureCounts = new Map<string, number>();
    for (const run of this.store.executionRuns.values()) {
      if (run.state === "failed" || run.state === "timed_out") {
        failureCounts.set(run.agentId, (failureCounts.get(run.agentId) ?? 0) + 1);
      }
    }
    for (const [agentId, failures] of failureCounts.entries()) {
      if (failures >= 3) {
        flags.push(this.previewFlag("execution_failure_pattern", "high", "agent", agentId, "Repeated execution failures detected.", { failures }));
      }
    }

    return dedupeFlags(flags);
  }

  blacklistEndpoint(endpointUrl: string, actorWallet: string, reason: string) {
    const row = {
      endpointUrl,
      reason,
      actorWallet,
      createdAt: new Date().toISOString(),
      active: true,
    };
    this.store.blacklistedEndpoints.set(endpointUrl, row);
    this.flag("endpoint_blacklisted", "high", "endpoint", endpointUrl, reason, {});
    return row;
  }

  flagAbusiveUser(wallet: string, summary: string, metadata: Record<string, unknown> = {}) {
    return this.flag("abusive_user", "medium", "user", wallet, summary, metadata);
  }

  private flag(
    kind: "endpoint_blacklisted" | "task_spam" | "duplicate_result" | "abusive_user" | "suspicious_dispute_rate" | "suspicious_rejection_rate" | "execution_failure_pattern",
    severity: "low" | "medium" | "high",
    subjectType: "task" | "agent" | "user" | "endpoint",
    subjectId: string,
    summary: string,
    metadata: Record<string, unknown>,
  ) {
    const row = {
      id: makeId("flag"),
      kind,
      severity,
      subjectType,
      subjectId,
      summary,
      metadata,
      createdAt: new Date().toISOString(),
    };
    this.store.moderationFlags.push(row);
    return row;
  }

  private previewFlag(
    kind: "endpoint_blacklisted" | "task_spam" | "duplicate_result" | "abusive_user" | "suspicious_dispute_rate" | "suspicious_rejection_rate" | "execution_failure_pattern",
    severity: "low" | "medium" | "high",
    subjectType: "task" | "agent" | "user" | "endpoint",
    subjectId: string,
    summary: string,
    metadata: Record<string, unknown>,
  ) {
    return {
      id: makeId("flag"),
      kind,
      severity,
      subjectType,
      subjectId,
      summary,
      metadata,
      createdAt: new Date().toISOString(),
    };
  }
}

function dedupeFlags(items: ModerationFlagRow[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.kind}:${item.subjectId}:${item.summary}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
