import type { TaskStatus } from "./enums";

// Keep task status changes explicit and reusable across router, evaluator, and UI.
export const taskStatusTransitions: Record<TaskStatus, readonly TaskStatus[]> = {
  CREATED: ["ESCROW_FUNDED", "CANCELLED"],
  ESCROW_FUNDED: ["OPEN", "REFUNDED"],
  OPEN: ["ASSIGNED", "CANCELLED"],
  ASSIGNED: ["EXECUTING", "SUBMITTED", "CANCELLED"],
  EXECUTING: ["SUBMITTED", "DISPUTED"],
  SUBMITTED: ["UNDER_REVIEW", "APPROVED", "REJECTED", "DISPUTED", "UNRESOLVED", "EXECUTING"],
  UNDER_REVIEW: ["APPROVED", "REJECTED", "DISPUTED", "UNRESOLVED", "EXECUTING"],
  APPROVED: ["SETTLED"],
  REJECTED: ["REFUNDED", "DISPUTED", "APPEALED", "EXECUTING"],
  DISPUTED: ["UNDER_REVIEW", "APPROVED", "REJECTED", "APPEALED", "UNRESOLVED"],
  APPEALED: ["UNDER_REVIEW", "APPROVED", "REJECTED", "DISPUTED", "UNRESOLVED"],
  UNRESOLVED: ["APPEALED", "DISPUTED", "REJECTED", "UNDER_REVIEW"],
  SETTLED: [],
  CANCELLED: ["REFUNDED"],
  REFUNDED: [],
};

// Operational recovery transitions are intentionally tracked separately from the
// business-state graph above. They cover retry/rollback cases after failed
// dispatches or timeouts without pretending those are user-visible lifecycle
// approvals.
export const taskStatusRecoveryTransitions: Partial<Record<TaskStatus, readonly TaskStatus[]>> = {
  ASSIGNED: ["OPEN"],
  EXECUTING: ["ASSIGNED", "OPEN"],
};

export function canTransitionTaskStatus(from: TaskStatus, to: TaskStatus): boolean {
  return taskStatusTransitions[from].includes(to);
}

export function assertTaskStatusTransition(from: TaskStatus, to: TaskStatus): void {
  if (!canTransitionTaskStatus(from, to)) {
    throw new Error(`Invalid task status transition: ${from} -> ${to}`);
  }
}

export function getNextTaskStatuses(from: TaskStatus): readonly TaskStatus[] {
  return taskStatusTransitions[from];
}

export function canRecoverTaskStatus(from: TaskStatus, to: TaskStatus): boolean {
  return taskStatusRecoveryTransitions[from]?.includes(to) ?? false;
}

export function assertTaskStatusRecovery(from: TaskStatus, to: TaskStatus): void {
  if (!canRecoverTaskStatus(from, to)) {
    throw new Error(`Invalid task recovery transition: ${from} -> ${to}`);
  }
}

export function isTerminalTaskStatus(status: TaskStatus): boolean {
  return status === "SETTLED" || status === "REFUNDED";
}
