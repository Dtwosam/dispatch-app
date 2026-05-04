import { labelize } from "./app-ui.js";

export function shortWallet(wallet) {
  const value = String(wallet || "").trim();
  if (value.length <= 10) return value || "No wallet";
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export function buildHomeSnapshot({ tasks, agents }) {
  return {
    openCount: tasks?.allOpenTasks?.length || 0,
    completedCount: tasks?.completedTasks?.length || 0,
    activeCount: tasks?.activeTasks?.length || 0,
    agentCount: agents?.length || 0,
  };
}

export function buildPostTaskChecklist(form, selectedAgent) {
  const isDirect = form.hiringMode === "direct_hire";
  return {
    summary: isDirect
      ? (selectedAgent ? `${selectedAgent.profile.publicName} is preselected for funded execution.` : "Select an agent before funding this direct hire.")
      : `Open market task with up to ${Number(form.maxParticipants || 1)} participating agents.`,
    items: [
      {
        id: "scope",
        label: "Task scope is clear",
        complete: String(form.title || "").trim().length >= 3 && String(form.description || "").trim().length >= 20,
      },
      {
        id: "selection",
        label: isDirect ? "Agent selected" : "Participant cap defined",
        complete: isDirect ? Boolean(form.selectedAgentId) : Number(form.maxParticipants || 0) >= 1,
      },
      {
        id: "settlement",
        label: "Review path chosen",
        complete: Boolean(form.evaluationPreference),
      },
    ],
  };
}

export function buildAgentProfileHighlights(agent) {
  return [
    `${Math.round((agent.performanceSummary?.successRate || 0) * 100)}% success rate`,
    `${Math.round((agent.performanceSummary?.approvalRate || 0) * 100)}% approval`,
    `${formatResponseMetric(agent)} avg response`,
    `${agent.performanceSummary?.tasksCompleted || 0} completed jobs`,
    `${agent.performanceSummary?.totalEarnings || 0} total earned`,
  ];
}

export function buildAgentIdentityBadges(agent) {
  const badges = [];
  if (agent?.profile?.originType === "platform") {
    badges.push("Platform Agent");
  }
  if ((agent?.performanceSummary?.rankPosition || 0) === 1 && (agent?.performanceSummary?.tasksAttempted || 0) > 0) {
    badges.push("Top Agent");
  }
  if (agent?.performanceSummary?.status === "new") {
    badges.push("New");
  }
  if (agent?.profile?.skillCategories?.length) {
    badges.push(labelize(agent.profile.skillCategories[0]));
  }
  return badges;
}

export function buildRecentAgentWork(agent, taskCollections = {}) {
  const allTasks = [
    ...(taskCollections.completedTasks || []),
    ...(taskCollections.rejectedTasks || []),
    ...(taskCollections.disputedTasks || []),
  ];

  return allTasks
    .filter((task) => task.participatingAgentIds?.includes(agent.profile.agentId))
    .filter((task, index, items) => items.findIndex((candidate) => candidate.taskId === task.taskId) === index)
    .sort((left, right) => new Date(right.updatedAt || right.createdAt || 0).getTime() - new Date(left.updatedAt || left.createdAt || 0).getTime())
    .slice(0, 5)
    .map((task) => ({
      taskId: task.taskId,
      title: buildSafeTaskSummary(task),
      category: labelize(task.category),
      status: labelize(task.status),
      completedAt: task.updatedAt || task.createdAt,
      approvalIndicator: buildApprovalIndicator(task),
    }));
}

function buildSafeTaskSummary(task) {
  const raw = String(task?.title || "").trim();
  if (!raw) return `${labelize(task?.category || "task")} task`;
  return raw.length > 72 ? `${raw.slice(0, 69)}...` : raw;
}

function buildApprovalIndicator(task) {
  const status = String(task?.status || "").toUpperCase();
  if (["SETTLED", "APPROVED"].includes(status)) return "Approved";
  if (status === "REFUNDED") return "Refunded";
  if (status === "REJECTED") return "Rejected";
  if (status === "DISPUTED") return "Disputed";
  return labelize(task?.resultStatus || "completed");
}

function formatResponseMetric(agent) {
  const latency = agent.performanceSummary?.averageResponseTimeMs || agent.performanceSummary?.averageLatencyMs || 0;
  if (!latency) return "No response data yet";
  if (latency < 1000) return `${latency} ms`;
  if (latency < 60000) return `${Math.round(latency / 1000)} sec`;
  return `${Math.round(latency / 60000)} min`;
}

export function buildReviewPanelModel(task) {
  const hasEvaluation = Boolean(task?.latestEvaluation);
  const canReviewSubmittedResult = ["SUBMITTED", "UNDER_REVIEW"].includes(task?.status);
  const canDispute = ["SUBMITTED", "UNDER_REVIEW", "REJECTED", "APPROVED"].includes(task?.status);
  const canAppeal = ["DISPUTED", "REJECTED", "UNRESOLVED"].includes(task?.status);
  const settlementReady = task?.status === "APPROVED" || (task?.reviewActions || []).includes("settle");
  const finalOutcome = task?.latestEvaluation?.finalOutcome || null;
  return {
    primaryActions: settlementReady ? ["settle"] : canReviewSubmittedResult ? ["approve", "reject"] : [],
    advancedActions: [
      ...(canReviewSubmittedResult ? ["assisted", "hybrid"] : []),
      ...(canDispute ? ["dispute"] : []),
      ...(canAppeal ? ["appeal"] : []),
    ],
    headline: settlementReady
      ? "This task is ready for payout settlement."
      : finalOutcome === "disputed"
        ? "Validator disagreement paused payout and opened a dispute-ready state."
        : finalOutcome === "unresolved" || task?.status === "UNRESOLVED"
          ? "Validator agreement was too weak to finalize this result. Appeal can trigger a stricter pass."
        : canReviewSubmittedResult
          ? (hasEvaluation ? "Result review is ready." : "Review decides whether payout moves.")
        : "Waiting for a submitted result before review actions become available.",
  };
}

export function buildTaskResultModel(task, executionRuns = []) {
  const sortedRuns = [...(executionRuns || [])]
    .sort((left, right) => new Date(right.completedAt || right.updatedAt || 0).getTime() - new Date(left.completedAt || left.updatedAt || 0).getTime());
  const latestCompletedRun = sortedRuns.find((run) => {
    const payload = run?.rawPayload;
    return run?.state === "completed" && payload && typeof payload === "object" && !Array.isArray(payload);
  }) || null;
  const latestRun = latestCompletedRun || sortedRuns[0] || null;
  const trace = latestRun && latestRun.rawPayload && typeof latestRun.rawPayload === "object" && !Array.isArray(latestRun.rawPayload)
    ? latestRun.rawPayload
    : null;
  const finalOutput = trace?.finalOutput || null;
  const draftOutput = trace?.draftOutput || null;
  const structuredTask = trace?.structuredTask || null;
  const evaluation = trace?.evaluation || null;
  const runSummary = trace?.runSummary || null;
  const stageTimingsMs = trace?.stageTimingsMs || null;
  const sections = Array.isArray(finalOutput?.sections) ? finalOutput.sections : [];
  const summary = finalOutput?.summary || task?.structuredNotes || "";

  const improveEligibleStatuses = new Set(["SUBMITTED", "UNDER_REVIEW", "REJECTED"]);
  const canImproveAgain = Boolean(
    latestRun?.endpointUrl?.startsWith("platform://")
      && improveEligibleStatuses.has(task?.status)
      && !["settled", "refunded", "disputed"].includes(task?.settlementState),
  );

  return {
    title: summary,
    sections,
    finalOutputText: sections.length
      ? sections.map((section) => `${section.heading}\n${(section.bullets || []).map((bullet) => `- ${bullet}`).join("\n")}`).join("\n\n")
      : String(summary || "").trim(),
    qualityScore: typeof trace?.score === "number" ? Math.round(trace.score) : typeof evaluation?.overall === "number" ? Math.round(evaluation.overall) : null,
    consensusScore: typeof task?.latestEvaluation?.consensusScore === "number" ? Math.round(task.latestEvaluation.consensusScore) : null,
    validatorAgreement: typeof task?.latestEvaluation?.validatorAgreement === "number" ? Math.round(task.latestEvaluation.validatorAgreement * 100) : null,
    consensusConfidence: typeof task?.latestEvaluation?.consensusConfidence === "number" ? Math.round(task.latestEvaluation.consensusConfidence * 100) : null,
    finalOutcome: task?.latestEvaluation?.finalOutcome || null,
    equivalenceSummary: task?.latestEvaluation?.equivalenceSummary || null,
    confidence: trace?.confidence || finalOutput?.confidence || null,
    modeUsed: trace?.mode || null,
    workerLabel: latestRun?.endpointUrl?.startsWith("platform://") ? "Platform Agent" : null,
    deliveryNote: task?.selectedAgents?.[0]?.originType === "platform"
      ? "This is a platform-run benchmark worker result inside the marketplace."
      : null,
    draftText: draftOutput
      ? [draftOutput.summary, ...(draftOutput.sections || []).map((section) => `${section.heading}\n${(section.bullets || []).map((bullet) => `- ${bullet}`).join("\n")}`)].join("\n\n")
      : null,
    structuredTask,
    evaluation,
    runSummary,
    stageTimingsMs,
    hasDraft: Boolean(draftOutput),
    canImproveAgain,
    latestRunId: latestRun?.runId || null,
  };
}
