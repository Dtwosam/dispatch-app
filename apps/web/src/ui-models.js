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

export function buildTaskLifecycleModel(task, options = {}) {
  const onchainTask = options.onchainSnapshot?.onchainTask || null;
  const onchainState = String(onchainTask?.state || "").toUpperCase();
  const escrowLocked = readBigIntLike(onchainTask?.escrow_locked ?? onchainTask?.escrowLocked ?? 0n);
  const timelineByKind = new Map((task?.timeline || []).map((item) => [item.kind, item.createdAt]));
  const settlementSummary = task?.settlementSummary || null;
  const status = String(task?.status || "").toUpperCase();
  const resultStatus = String(task?.resultStatus || "").toLowerCase();
  const transactionState = String(task?.transactionState || "").toLowerCase();
  const settlementState = String(task?.settlementState || "").toLowerCase();
  const finalOutcome = String(task?.latestEvaluation?.finalOutcome || "").toLowerCase();
  const assignedAgents = task?.selectedAgents || [];
  const assignedAgent = assignedAgents[0] || null;
  const participatingAgentIds = task?.participatingAgentIds || [];

  const fundingConfirmed = Boolean(settlementSummary?.isFunded)
    || transactionState === "accepted"
    || Boolean(task?.onchainTaskRef)
    || escrowLocked > 0n
    || ["ESCROW_FUNDED", "OPEN", "ASSIGNED", "EXECUTING", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "DISPUTED", "UNRESOLVED", "SETTLED", "REFUNDED"].includes(status)
    || ["OPEN", "ASSIGNED", "EXECUTING", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "DISPUTED", "UNRESOLVED", "SETTLED", "REFUNDED"].includes(onchainState);
  const fundingPending = !fundingConfirmed && ["pending_wallet", "pending_chain"].includes(transactionState);
  const fundingFailed = transactionState === "failed";
  const assigned = Boolean(assignedAgent || task?.selectedAgentId || participatingAgentIds.length || ["ASSIGNED", "EXECUTING", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "DISPUTED", "UNRESOLVED", "SETTLED", "REFUNDED"].includes(status));
  const executing = status === "EXECUTING" || resultStatus === "in_progress";
  const submitted = ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "DISPUTED", "UNRESOLVED", "SETTLED", "REFUNDED"].includes(status)
    || ["submitted", "approved", "rejected", "disputed", "appealed", "unresolved", "settled"].includes(resultStatus)
    || Boolean(task?.latestSubmissionId);
  const underReview = status === "UNDER_REVIEW"
    || (submitted && !["APPROVED", "REJECTED", "DISPUTED", "UNRESOLVED", "SETTLED", "REFUNDED"].includes(status) && Boolean(task?.latestEvaluation));
  const rejected = status === "REJECTED" || resultStatus === "rejected" || finalOutcome === "rejected";
  const approved = status === "APPROVED"
    || resultStatus === "approved"
    || finalOutcome === "accepted"
    || (settlementState === "pending_settlement" && !rejected);
  const disputed = status === "DISPUTED" || settlementState === "disputed" || finalOutcome === "disputed" || task?.disputeRecord?.status === "open";
  const unresolved = status === "UNRESOLVED" || settlementState === "unresolved" || finalOutcome === "unresolved";
  const refunded = status === "REFUNDED" || settlementState === "refunded" || task?.latestSettlement?.outcome === "refunded";
  const settled = status === "SETTLED" || settlementState === "settled" || task?.latestSettlement?.outcome === "paid";
  const settlementReady = Boolean(settlementSummary?.canReleasePayment)
    || (!settled && !refunded && approved
      && (settlementState === "pending_settlement" || (task?.reviewActions || []).includes("settle") || settlementState === "reward_funded"));
  const refundReady = Boolean(settlementSummary?.canRefund);
  const needsRevision = rejected && !refunded;

  const fundingLabel = fundingConfirmed
    ? "Funded"
    : fundingPending
      ? "Funding pending"
      : fundingFailed
        ? "Funding failed"
        : "Awaiting funding";
  const evaluationLabel = settled
    ? "Approved"
    : refunded
      ? "Closed"
      : disputed
        ? "Disputed"
        : unresolved
          ? "Unresolved"
          : rejected
            ? "Rejected"
            : approved
              ? "Approved"
              : underReview
                ? "Under review"
                : submitted
                  ? "Submitted"
                  : executing
                    ? "In progress"
                    : "Awaiting output";
  const settlementLabel = settled
    ? "Payment released"
    : refunded
      ? "Reward refunded"
      : disputed
        ? "Settlement paused"
        : unresolved
          ? "Review unresolved"
          : settlementReady
            ? "Ready for settlement"
            : refundReady
              ? "Refund available"
              : fundingConfirmed
              ? "Settlement pending"
              : "Funding required";
  const currentLabel = settled
    ? "Payment released"
    : refunded
      ? "Reward refunded"
      : disputed
        ? "Disputed"
        : unresolved
          ? "Needs appeal"
          : settlementReady
            ? "Settlement ready"
            : approved
              ? "Approved"
              : underReview
                ? "Under review"
                : submitted
                  ? "Output submitted"
                  : executing
                    ? "In progress"
                    : assigned
                      ? "Agent assigned"
                      : fundingPending
                        ? "Funding pending"
                        : fundingConfirmed
                          ? "Funded"
                          : "Task posted";
  const settlementMessage = settled
    ? "Payment released."
    : refunded
      ? "Reward refunded."
      : settlementSummary?.settlementReadinessLabel
        ? settlementSummary.settlementReadinessLabel
        : settlementReady
          ? "Approved. USDC release is ready."
          : needsRevision
            ? "Revision needed before payout."
            : rejected
              ? "Rejected. Payout not recommended."
              : disputed
                ? "Disputed. Payout stays paused."
                : unresolved
                  ? "Review unresolved. Payout stays paused."
                  : underReview
                    ? "Under evaluator review."
                    : submitted
                      ? "Output submitted and waiting for review."
                      : executing
                        ? "Agent is executing now."
                        : fundingPending
                          ? "Funding is still being confirmed."
                          : fundingConfirmed
                            ? "Task is funded and waiting for the next step."
                            : "Awaiting onchain funding.";
  const reputationLabel = settled
    ? "Reputation updated"
    : refunded
      ? "Refund closed"
      : "Reputation pending";
  const assignmentLabel = assignedAgent
    ? `${assignedAgent.displayName} (${assignedAgent.originType === "external" ? "External agent" : "Platform agent"})`
    : task?.selectedAgentId
      ? "Assigned agent selected"
      : participatingAgentIds.length
        ? `${participatingAgentIds.length} participating agent${participatingAgentIds.length === 1 ? "" : "s"}`
        : "No agent assigned yet";

  const steps = [
    {
      key: "posted",
      label: "Task posted",
      status: "complete",
      helper: "Dispatch recorded the task request and reward terms.",
      timestamp: task?.createdAt || timelineByKind.get("task_created") || null,
    },
    {
      key: "funding",
      label: fundingLabel,
      status: fundingConfirmed ? "complete" : fundingFailed ? "failed" : fundingPending ? "current" : "pending",
      helper: fundingConfirmed
        ? "Funding is confirmed and the task can move through the marketplace."
        : fundingFailed
          ? "The latest wallet or chain funding action failed."
          : fundingPending
            ? "Wallet signatures were captured and Arc Testnet confirmation is still syncing."
            : "The task needs onchain funding before assignment and execution.",
      timestamp: timelineByKind.get("escrow_funded") || null,
    },
    {
      key: "assigned",
      label: assigned ? "Agent assigned" : "Awaiting assignment",
      status: assigned ? "complete" : fundingConfirmed ? "current" : "pending",
      helper: assigned
        ? assignmentLabel
        : "An agent will be assigned once the funded task is ready to route.",
      timestamp: timelineByKind.get("agent_accepted") || timelineByKind.get("agent_invited") || null,
    },
    {
      key: "submitted",
      label: submitted ? "Output submitted" : executing ? "In progress" : "Execution pending",
      status: submitted ? "complete" : executing ? "current" : "pending",
      helper: submitted
        ? "A result is on the task and ready for verification."
        : executing
          ? "The assigned worker is actively completing the task."
          : "Execution starts after assignment.",
      timestamp: timelineByKind.get("submission_received") || null,
    },
    {
      key: "review",
      label: approved ? "Approved" : rejected ? "Rejected" : disputed ? "Disputed" : unresolved ? "Needs appeal" : underReview ? "Under evaluator review" : submitted ? "Awaiting review" : "Review pending",
      status: approved ? "complete" : rejected || disputed || unresolved ? "warning" : underReview ? "current" : "pending",
      helper: approved
        ? "Evaluator review accepted the output for settlement."
        : rejected
          ? "The submitted output did not meet the payout bar."
          : disputed
            ? "Review disagreement paused payout."
            : unresolved
              ? "Review confidence was too weak to finalize the result."
              : underReview
                ? "Evaluators are verifying the submitted work."
                : submitted
                  ? "The output is waiting for review."
                  : "Review starts after submission.",
      timestamp: timelineByKind.get("review_started") || timelineByKind.get("result_verified") || null,
    },
    {
      key: "settlement",
      label: settled ? "Payment released" : refunded ? "Reward refunded" : settlementReady ? "Settlement ready" : refundReady || rejected ? "Refund available" : disputed ? "Settlement paused" : "Settlement pending",
      status: settled || refunded ? "complete" : rejected || disputed || unresolved ? "warning" : settlementReady ? "current" : "pending",
      helper: settlementMessage,
      timestamp: task?.latestSettlement?.settlementTimestamp || timelineByKind.get("settled") || timelineByKind.get("refund_completed") || null,
    },
    {
      key: "reputation",
      label: reputationLabel,
      status: settled || refunded ? "complete" : "pending",
      helper: settled
        ? "Agent reputation can now reflect a completed funded outcome."
        : refunded
          ? "The task is closed and payout reputation stays unchanged or neutral."
          : "Reputation updates after the funded task reaches a terminal payout state.",
      timestamp: task?.latestSettlement?.settlementTimestamp || null,
    },
  ];

  return {
    steps,
    currentLabel,
    fundingLabel,
    evaluationLabel,
    settlementLabel,
    settlementMessage,
    assignmentLabel,
    assignedAgent,
    isSettled: settled,
    isRefunded: refunded,
    isRejected: rejected,
    isDisputed: disputed,
    isUnresolved: unresolved,
  };
}

export function buildPostTaskChecklist(form, selectedAgent) {
  const isDirect = form.hiringMode === "direct_hire";
  return {
    summary: isDirect
      ? (selectedAgent ? `${selectedAgent.profile.publicName} is preselected for this funded Arc task.` : "Select an agent before funding this direct hire.")
      : `Open market funded task with up to ${Number(form.maxParticipants || 1)} participating agents.`,
    items: [
      {
        id: "scope",
        label: "Funded task scope is clear",
        complete: String(form.title || "").trim().length >= 3 && String(form.description || "").trim().length >= 20,
      },
      {
        id: "selection",
        label: isDirect ? "Agent selected" : "Participant cap defined",
        complete: isDirect ? Boolean(form.selectedAgentId) : Number(form.maxParticipants || 0) >= 1,
      },
      {
        id: "settlement",
        label: "Review and settlement path chosen",
        complete: Boolean(form.evaluationPreference),
      },
    ],
  };
}

export function buildAgentProfileHighlights(agent) {
  const paidCompleted = agent.performanceSummary?.paidTasksCompleted ?? agent.performanceSummary?.tasksCompleted ?? 0;
  const paidEarnings = agent.performanceSummary?.paidEarnings ?? agent.performanceSummary?.totalEarnings ?? 0;
  const averageScore = Math.round(agent.performanceSummary?.averageScore || 0);
  return [
    `${Math.round((agent.performanceSummary?.approvalRate || 0) * 100)}% approval`,
    `${averageScore || 0} avg evaluation score`,
    `${formatResponseMetric(agent)} avg response`,
    `${paidCompleted} paid funded jobs`,
    `${paidEarnings} USDC earned from settled work`,
  ];
}

export function buildAgentIdentityBadges(agent) {
  const badges = [];
  if (agent?.profile?.originType === "platform") {
    badges.push("Platform Agent");
  }
  if (agent?.profile?.originType === "external") {
    badges.push("External Agent");
    badges.push("ERC-8183 compatible");
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
    .filter((task) => task.participatingAgentIds?.includes(agent.profile.agentId) || task.selectedAgentId === agent.profile.agentId)
    .filter((task, index, items) => items.findIndex((candidate) => candidate.taskId === task.taskId) === index)
    .sort((left, right) => new Date(right.updatedAt || right.createdAt || 0).getTime() - new Date(left.updatedAt || left.createdAt || 0).getTime())
    .slice(0, 5)
    .map((task) => ({
      taskId: task.taskId,
      title: buildSafeTaskSummary(task),
      category: labelize(task.category),
      status: labelize(task.status),
      rewardAmount: Number(task.rewardAmount || 0),
      evaluationScore: typeof task.latestEvaluation?.overallScore === "number" ? Math.round(task.latestEvaluation.overallScore) : null,
      settlementStatus: task.settlementSummary?.settlementReadinessLabel || labelize(task.settlementState || task.status),
      completedAt: task.latestSettlement?.settlementTimestamp || task.updatedAt || task.createdAt,
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
  if (status === "SETTLED") return "Paid";
  if (status === "APPROVED") return "Approved";
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

function readBigIntLike(value) {
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isFinite(value)) return BigInt(Math.trunc(value));
  if (typeof value === "string" && value.trim()) {
    try {
      return BigInt(value);
    } catch {
      return 0n;
    }
  }
  return 0n;
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
      ? "This task is ready for Arc Testnet USDC settlement."
      : finalOutcome === "disputed"
        ? "Validator disagreement paused payout and opened a dispute-ready state."
        : finalOutcome === "unresolved" || task?.status === "UNRESOLVED"
          ? "Validator agreement was too weak to finalize this result. Appeal can trigger a stricter pass before payout moves."
        : canReviewSubmittedResult
          ? (hasEvaluation ? "Verified review is ready for your decision." : "Review decides whether USDC payout moves.")
        : "Waiting for a submitted result before review and settlement actions become available.",
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
      ? "This is a platform-run benchmark worker result inside the same funded-task marketplace path."
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
