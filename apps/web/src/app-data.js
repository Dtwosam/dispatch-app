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
    throw new Error(payload.error || `Request failed for ${path}`);
  }
  return validate ? validate(payload) : payload;
}

export async function loadMarketData({ apiBase, state, chainClient, validators }) {
  const chainStatusPromise = chainClient.getStatus()
    .then((status) => {
      state.chainStatusError = "";
      return status;
    })
    .catch((error) => {
      state.chainStatusError = error instanceof Error ? error.message : "Chain status request failed.";
      return null;
    });

  const [agentPayload, taskPayload, leaderboardPayload, chainStatus] = await Promise.all([
    getJson(apiBase, "/api/agent-registry/agents", validators.validateAgentListResponse).catch(() => ({ items: [] })),
    getJson(
      apiBase,
      `/api/task-market/tasks?viewerWallet=${encodeURIComponent(state.wallet)}`,
      validators.validateTaskListResponse,
    ).catch(() => ({
      allOpenTasks: [],
      myPostedTasks: [],
      tasksAssignedToMyAgents: [],
      activeTasks: [],
      completedTasks: [],
      rejectedTasks: [],
      disputedTasks: [],
    })),
    getJson(apiBase, "/api/trust/leaderboards", validators.validateLeaderboardResponse).catch(() => ({ buckets: [] })),
    chainStatusPromise,
  ]);

  state.agents = agentPayload.items || [];
  state.tasks = taskPayload;
  state.leaderboards = leaderboardPayload;
  state.chainStatus = chainStatus;
  state.chainConfig = chainStatus?.config || null;
}
