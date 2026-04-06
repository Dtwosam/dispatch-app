import { makeId } from "../lib/ids";
import type { InMemoryRegistryStore } from "../db/store";
import type { ExecutionLogRow, ExecutionMetricRow, InternalEventRow } from "../db/models";

export class ExecutionLogStore {
  constructor(private readonly store: InMemoryRegistryStore) {}

  info(runId: string, taskId: string, agentId: string, event: string, message: string, metadata: Record<string, unknown> = {}) {
    this.append(runId, taskId, agentId, "info", event, message, metadata);
  }

  warn(runId: string, taskId: string, agentId: string, event: string, message: string, metadata: Record<string, unknown> = {}) {
    this.append(runId, taskId, agentId, "warn", event, message, metadata);
  }

  error(runId: string, taskId: string, agentId: string, event: string, message: string, metadata: Record<string, unknown> = {}) {
    this.append(runId, taskId, agentId, "error", event, message, metadata);
  }

  metric(kind: ExecutionMetricRow["kind"], runId: string, taskId: string, value: number, unit: ExecutionMetricRow["unit"]) {
    this.store.executionMetrics.push({
      id: makeId("metric"),
      kind,
      runId,
      taskId,
      value,
      unit,
      createdAt: new Date().toISOString(),
    });
  }

  internal(topic: string, taskId: string, runId: string | null, payload: Record<string, unknown>) {
    const row: InternalEventRow = {
      id: makeId("internal"),
      topic,
      taskId,
      runId,
      payload,
      createdAt: new Date().toISOString(),
    };
    this.store.internalEvents.push(row);
  }

  private append(
    runId: string,
    taskId: string,
    agentId: string,
    level: ExecutionLogRow["level"],
    event: string,
    message: string,
    metadata: Record<string, unknown>,
  ) {
    const row = {
      id: makeId("log"),
      runId,
      taskId,
      agentId,
      level,
      event,
      message,
      metadata,
      createdAt: new Date().toISOString(),
    };
    this.store.appendExecutionLog(runId, row);
    console[level](
      JSON.stringify({
        scope: "execution",
        level,
        event,
        runId,
        taskId,
        agentId,
        message,
        metadata,
      }),
    );
  }
}
