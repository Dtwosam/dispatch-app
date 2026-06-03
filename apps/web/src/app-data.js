export async function getJson(apiBase, path, validate) {
  const response = await fetch(`${apiBase}${path}`);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `Request failed for ${path}`);
  }
  return validate ? validate(payload) : payload;
}

export async function sendJson(apiBase, path, method, body, validate) {
  const response = await fetch(`${apiBase}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload.error || `Request failed for ${path}`;
    if (/HTTP 429|too many review requests|rate.?limit/i.test(message)) {
      throw new Error("Too many review requests. Please wait a moment and try again.");
    }
    throw new Error(message);
  }
  return validate ? validate(payload) : payload;
}

async function getJsonWithin(apiBase, path, validate, timeoutMs = 4500) {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${apiBase}${path}`, { signal: controller.signal });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || `Request failed for ${path}`);
    }
    return validate ? validate(payload) : payload;
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}

async function settleWithin(promise, timeoutMs, message) {
  let timeoutId;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timeoutId = globalThis.setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}

export async function loadMarketData({ apiBase, state, chainClient, validators }) {
  const hydrationErrors = [];
  const unavailable = {
    agents: false,
    tasks: false,
    leaderboards: false,
  };
  const fallback = (key, message, value) => (error) => {
    unavailable[key] = true;
    hydrationErrors.push(message);
    console.warn(message, error);
    return value;
  };
  const chainStatusPromise = settleWithin(chainClient.getStatus(), 4500, "Chain status request timed out.")
    .then((status) => {
      state.chainStatusError = "";
      return status;
    })
    .catch((error) => {
      state.chainStatusError = error instanceof Error ? error.message : "Chain status request failed.";
      return null;
    });

  const [agentPayload, taskPayload, leaderboardPayload, chainStatus] = await Promise.all([
    getJsonWithin(apiBase, "/api/agent-registry/agents", validators.validateAgentListResponse)
      .catch(fallback("agents", "Agent data is temporarily unavailable.", { items: [] })),
    getJsonWithin(
      apiBase,
      `/api/task-market/tasks?viewerWallet=${encodeURIComponent(state.wallet)}`,
      validators.validateTaskListResponse,
    ).catch(fallback("tasks", "Task data is temporarily unavailable.", {
      allOpenTasks: [],
      myPostedTasks: [],
      tasksAssignedToMyAgents: [],
      activeTasks: [],
      completedTasks: [],
      rejectedTasks: [],
      disputedTasks: [],
    })),
    getJsonWithin(apiBase, "/api/trust/leaderboards", validators.validateLeaderboardResponse)
      .catch(fallback("leaderboards", "Leaderboard data is temporarily unavailable.", { buckets: [] })),
    chainStatusPromise,
  ]);

  state.agents = agentPayload.items || [];
  state.tasks = taskPayload;
  state.leaderboards = leaderboardPayload;
  state.chainStatus = chainStatus;
  state.chainConfig = chainStatus?.config || null;
  state.marketDataUnavailable = unavailable;
  state.marketDataError = hydrationErrors.length
    ? "Some marketplace data is temporarily unavailable. Try again shortly."
    : "";
}
