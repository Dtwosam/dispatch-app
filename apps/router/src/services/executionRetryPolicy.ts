import type { ExecutionRunRow } from "../db/models";

export const TERMINAL_FAILURE_CODES = new Set([
  "UNAUTHORIZED",
  "FORBIDDEN",
  "INVALID_STATE_TRANSITION",
]);

export class ExecutionRetryPolicy {
  constructor(private readonly baseBackoffMs: number) {}

  scheduleRetry(run: ExecutionRunRow) {
    const delay = this.baseBackoffMs * 2 ** Math.max(0, run.attempt - 1);
    run.nextRetryAt = new Date(Date.now() + delay).toISOString();
    run.state = "queued";
    run.updatedAt = new Date().toISOString();
    return delay;
  }

  canRetry(run: ExecutionRunRow) {
    if (run.attempt >= run.maxRetries) return false;
    if (run.errorCode && TERMINAL_FAILURE_CODES.has(run.errorCode)) return false;
    return true;
  }
}
