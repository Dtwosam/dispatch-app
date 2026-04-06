function invariant(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function contractError(message) {
  const error = new Error(`Contract validation failed: ${message}`);
  error.name = "ContractValidationError";
  return error;
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertObject(value, label) {
  if (!isObject(value)) {
    throw contractError(`${label} must be an object`);
  }
  return value;
}

function assertArray(value, label) {
  if (!Array.isArray(value)) {
    throw contractError(`${label} must be an array`);
  }
  return value;
}

function assertString(value, label) {
  if (typeof value !== "string") {
    throw contractError(`${label} must be a string`);
  }
  return value;
}

function assertNumber(value, label) {
  if (!(typeof value === "number" && Number.isFinite(value))) {
    throw contractError(`${label} must be a number`);
  }
  return value;
}

function assertNullableString(value, label) {
  if (!(value === null || typeof value === "string")) {
    throw contractError(`${label} must be a string or null`);
  }
  return value;
}

function validateAgentView(agent, label = "agent") {
  const row = assertObject(agent, label);
  const profile = assertObject(row.profile, `${label}.profile`);
  const performanceSummary = assertObject(row.performanceSummary, `${label}.performanceSummary`);
  assertString(profile.agentId, `${label}.profile.agentId`);
  assertString(profile.publicName, `${label}.profile.publicName`);
  assertString(profile.slug, `${label}.profile.slug`);
  assertArray(profile.capabilityTags, `${label}.profile.capabilityTags`);
  if (profile.skills !== undefined) assertArray(profile.skills, `${label}.profile.skills`);
  if (profile.skillCategories !== undefined) assertArray(profile.skillCategories, `${label}.profile.skillCategories`);
  assertObject(profile.expectedLatencyMsRange, `${label}.profile.expectedLatencyMsRange`);
  assertNumber(performanceSummary.tasksCompleted, `${label}.performanceSummary.tasksCompleted`);
  return row;
}

function validateTaskSummary(task, label = "task") {
  const row = assertObject(task, label);
  assertString(row.taskId, `${label}.taskId`);
  assertString(row.title, `${label}.title`);
  assertString(row.status, `${label}.status`);
  assertString(row.resultStatus, `${label}.resultStatus`);
  assertNumber(row.rewardAmount, `${label}.rewardAmount`);
  assertString(row.deadline, `${label}.deadline`);
  assertArray(row.participatingAgentIds, `${label}.participatingAgentIds`);
  return row;
}

export function validateAgentListResponse(payload) {
  const root = assertObject(payload, "agent list response");
  const items = assertArray(root.items, "agent list response.items");
  items.forEach((item, index) => validateAgentView(item, `agent list response.items[${index}]`));
  return root;
}

export function validateTaskListResponse(payload) {
  const root = assertObject(payload, "task list response");
  [
    "allOpenTasks",
    "myPostedTasks",
    "tasksAssignedToMyAgents",
    "activeTasks",
    "completedTasks",
    "rejectedTasks",
    "disputedTasks",
  ].forEach((key) => {
    const items = assertArray(root[key], `task list response.${key}`);
    items.forEach((item, index) => validateTaskSummary(item, `task list response.${key}[${index}]`));
  });
  return root;
}

export function validateLeaderboardResponse(payload) {
  const root = assertObject(payload, "leaderboard response");
  const buckets = assertArray(root.buckets, "leaderboard response.buckets");
  buckets.forEach((bucket, index) => {
    const row = assertObject(bucket, `leaderboard response.buckets[${index}]`);
    assertString(row.key, `leaderboard response.buckets[${index}].key`);
    assertArray(row.items, `leaderboard response.buckets[${index}].items`);
  });
  return root;
}

export function validateTaskDetailResponse(payload) {
  const task = validateTaskSummary(payload, "task detail");
  assertString(task.description, "task detail.description");
  assertArray(task.timeline, "task detail.timeline");
  assertArray(task.attachments, "task detail.attachments");
  assertArray(task.reviewActions, "task detail.reviewActions");
  return task;
}

export function validateSettlementHistoryResponse(payload) {
  const root = assertObject(payload, "settlement history response");
  const items = assertArray(root.items, "settlement history response.items");
  items.forEach((item, index) => {
    const row = assertObject(item, `settlement history response.items[${index}]`);
    assertString(row.settlementId, `settlement history response.items[${index}].settlementId`);
    assertString(row.taskId, `settlement history response.items[${index}].taskId`);
    assertString(row.settlementState, `settlement history response.items[${index}].settlementState`);
    assertNullableString(row.txReference, `settlement history response.items[${index}].txReference`);
  });
  return root;
}

export function validateChainConfig(payload) {
  const root = assertObject(payload, "chain config");
  assertString(root.chainMode, "chain config.chainMode");
  return root;
}

export function validateChainStatus(payload) {
  const root = assertObject(payload, "chain status");
  if (!(typeof root.ok === "boolean")) {
    throw contractError("chain status.ok must be a boolean");
  }
  if (!(typeof root.rpcReachable === "boolean")) {
    throw contractError("chain status.rpcReachable must be a boolean");
  }
  if (!(typeof root.contractAddressesConfigured === "boolean")) {
    throw contractError("chain status.contractAddressesConfigured must be a boolean");
  }
  if (!(root.detectedChainId === null || (typeof root.detectedChainId === "number" && Number.isFinite(root.detectedChainId)))) {
    throw contractError("chain status.detectedChainId must be a number or null");
  }
  if (!(typeof root.expectedChainId === "number" && Number.isFinite(root.expectedChainId))) {
    throw contractError("chain status.expectedChainId must be a number");
  }
  validateChainConfig(assertObject(root.config, "chain status.config"));
  assertArray(root.diagnostics, "chain status.diagnostics");
  return root;
}

export function validateChainReceipt(payload) {
  const root = assertObject(payload, "chain receipt");
  assertString(root.hash, "chain receipt.hash");
  assertString(root.status, "chain receipt.status");
  return root;
}

export function validateTaskWriteResponse(payload) {
  const root = assertObject(payload, "task write response");
  assertString(root.taskId, "task write response.taskId");
  assertString(root.createTxHash, "task write response.createTxHash");
  assertString(root.fundTxHash, "task write response.fundTxHash");
  validateChainReceipt(root.latestReceipt);
  return root;
}

export function validateTaskChainSyncResponse(payload) {
  const root = assertObject(payload, "task chain sync response");
  validateTaskDetailResponse(root.task);
  validateChainReceipt(root.syncedReceipt);
  return root;
}

export function validateTaskDraftCreateResponse(payload) {
  const root = assertObject(payload, "task draft create response");
  validateTaskDetailResponse(root.task);
  return root;
}

export function validateOnchainTaskResponse(payload) {
  const root = assertObject(payload, "onchain task response");
  assertString(root.taskId, "onchain task response.taskId");
  return root;
}
