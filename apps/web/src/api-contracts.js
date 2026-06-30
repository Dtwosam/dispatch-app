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
  assertNumber(performanceSummary.successRate, `${label}.performanceSummary.successRate`);
  assertNumber(performanceSummary.averageResponseTimeMs, `${label}.performanceSummary.averageResponseTimeMs`);
  assertNumber(performanceSummary.totalEarnings, `${label}.performanceSummary.totalEarnings`);
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

function validateNanoPaymentProof(proof, label) {
  const row = assertObject(proof, label);
  assertString(row.proofType, `${label}.proofType`);
  assertString(row.paymentState, `${label}.paymentState`);
  assertNullableString(row.txHash, `${label}.txHash`);
  assertString(row.proofReference, `${label}.proofReference`);
  assertString(row.recordedAt, `${label}.recordedAt`);
  assertArray(row.notes, `${label}.notes`);
  return row;
}

function validateNanoPayee(payee, label) {
  const row = assertObject(payee, label);
  assertString(row.payeeId, `${label}.payeeId`);
  assertString(row.type, `${label}.type`);
  assertString(row.label, `${label}.label`);
  return row;
}

function validateNanoBudget(budget, label = "nano budget") {
  const row = assertObject(budget, label);
  assertString(row.budgetId, `${label}.budgetId`);
  assertString(row.ownerWallet, `${label}.ownerWallet`);
  assertString(row.runId, `${label}.runId`);
  assertString(row.goal, `${label}.goal`);
  assertNumber(row.amount, `${label}.amount`);
  assertString(row.tokenSymbol, `${label}.tokenSymbol`);
  assertString(row.network, `${label}.network`);
  assertString(row.status, `${label}.status`);
  if (row.fundingProof !== null) validateNanoPaymentProof(row.fundingProof, `${label}.fundingProof`);
  return row;
}

function validateNanoRunContext(runContext, label = "nano run context") {
  const row = assertObject(runContext, label);
  assertString(row.runId, `${label}.runId`);
  assertString(row.budgetId, `${label}.budgetId`);
  assertString(row.ownerWallet, `${label}.ownerWallet`);
  assertString(row.goal, `${label}.goal`);
  assertNullableString(row.spendPlanSummary, `${label}.spendPlanSummary`);
  return row;
}

function validateNanoSpendIntent(intent, label = "nano spend intent") {
  const row = assertObject(intent, label);
  assertString(row.intentId, `${label}.intentId`);
  assertString(row.budgetId, `${label}.budgetId`);
  assertString(row.runId, `${label}.runId`);
  assertString(row.ownerWallet, `${label}.ownerWallet`);
  validateNanoPayee(row.payee, `${label}.payee`);
  assertNumber(row.amount, `${label}.amount`);
  assertString(row.reason, `${label}.reason`);
  assertString(row.status, `${label}.status`);
  return row;
}

function validateNanoSpendReceipt(receipt, label = "nano spend receipt") {
  const row = assertObject(receipt, label);
  assertString(row.receiptId, `${label}.receiptId`);
  assertString(row.intentId, `${label}.intentId`);
  assertString(row.budgetId, `${label}.budgetId`);
  assertString(row.runId, `${label}.runId`);
  assertString(row.ownerWallet, `${label}.ownerWallet`);
  validateNanoPayee(row.payee, `${label}.payee`);
  assertNumber(row.amount, `${label}.amount`);
  assertString(row.paymentState, `${label}.paymentState`);
  validateNanoPaymentProof(row.proof, `${label}.proof`);
  assertString(row.contributionSummary, `${label}.contributionSummary`);
  return row;
}

export function validateNanoHealthResponse(payload) {
  const root = assertObject(payload, "nano health response");
  if (!(typeof root.ok === "boolean")) {
    throw contractError("nano health response.ok must be a boolean");
  }
  assertString(root.service, "nano health response.service");
  assertString(root.mode, "nano health response.mode");
  assertString(root.payments, "nano health response.payments");
  return root;
}

export function validateNanoBudgetDraftResponse(payload) {
  const root = assertObject(payload, "nano budget draft response");
  validateNanoBudget(root.budget, "nano budget draft response.budget");
  validateNanoRunContext(root.runContext, "nano budget draft response.runContext");
  return root;
}

export function validateNanoBudgetListResponse(payload) {
  const root = assertObject(payload, "nano budget list response");
  const items = assertArray(root.items, "nano budget list response.items");
  items.forEach((item, index) => validateNanoBudget(item, `nano budget list response.items[${index}]`));
  return root;
}

export function validateNanoBudgetActivityResponse(payload) {
  const root = assertObject(payload, "nano budget activity response");
  validateNanoBudget(root.budget, "nano budget activity response.budget");
  validateNanoRunContext(root.runContext, "nano budget activity response.runContext");
  assertArray(root.spendIntents, "nano budget activity response.spendIntents")
    .forEach((item, index) => validateNanoSpendIntent(item, `nano budget activity response.spendIntents[${index}]`));
  assertArray(root.receipts, "nano budget activity response.receipts")
    .forEach((item, index) => validateNanoSpendReceipt(item, `nano budget activity response.receipts[${index}]`));
  assertNumber(root.availableBudget, "nano budget activity response.availableBudget");
  return root;
}

export function validateNanoSpendIntentResponse(payload) {
  return validateNanoSpendIntent(payload, "nano spend intent response");
}

export function validateNanoSpendReceiptResponse(payload) {
  return validateNanoSpendReceipt(payload, "nano spend receipt response");
}

export function validateNanoArcProofVerifyResponse(payload) {
  const root = assertObject(payload, "nano arc proof response");
  assertString(root.proofStatus, "nano arc proof response.proofStatus");
  assertString(root.reason, "nano arc proof response.reason");
  assertNullableString(root.txHash, "nano arc proof response.txHash");
  assertNullableString(root.explorerLink, "nano arc proof response.explorerLink");
  if (root.matched !== null) {
    const matched = assertObject(root.matched, "nano arc proof response.matched");
    assertString(matched.token, "nano arc proof response.matched.token");
    assertString(matched.from, "nano arc proof response.matched.from");
    assertString(matched.to, "nano arc proof response.matched.to");
    assertNumber(matched.amountUsdc, "nano arc proof response.matched.amountUsdc");
  }
  if (root.receipt !== undefined && root.receipt !== null) {
    validateNanoSpendReceipt(root.receipt, "nano arc proof response.receipt");
  }
  return root;
}

export function validateNanoMetricsResponse(payload) {
  const root = assertObject(payload, "nano metrics response");
  assertString(root.generatedAt, "nano metrics response.generatedAt");
  [
    "budgetCount",
    "spendIntentCount",
    "approvedSpendIntentCount",
    "sourceRequestCount",
    "receiptCount",
    "verifiedSourceUnlockCount",
    "verifiedArcReceiptCount",
    "totalAuthorizedBudget",
    "totalApprovedIntentValue",
    "totalRecordedPaymentValue",
    "availableBudget",
    "walletsWithBudgets",
  ].forEach((key) => assertNumber(root[key], `nano metrics response.${key}`));
  return root;
}
