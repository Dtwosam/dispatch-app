import { labelize } from "./app-ui.js";

export function buildArcTransactionLink(hash) {
  const value = String(hash || "").trim();
  if (!/^0x[a-fA-F0-9]{64}$/.test(value)) return null;
  return `https://testnet.arcscan.app/tx/${value}`;
}

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
  const revisionRequests = [
    ...(Array.isArray(task?.revisionRequests) ? task.revisionRequests : []),
    ...(Array.isArray(options.revisionRequests) ? options.revisionRequests : []),
  ];
  const assignedAgents = task?.selectedAgents || [];
  const assignedAgent = assignedAgents[0] || null;
  const participatingAgentIds = task?.participatingAgentIds || [];
  const hasAnyRawStatus = Boolean(status || resultStatus || transactionState || settlementState || task?.onchainTaskRef || task?.latestSettlement);

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
  const cancelled = ["CANCELLED", "CANCELED", "CANCELLED_BY_OWNER", "CANCELED_BY_OWNER"].includes(status)
    || ["cancelled", "canceled"].includes(resultStatus)
    || ["cancelled", "canceled"].includes(settlementState);
  const refunded = status === "REFUNDED" || settlementState === "refunded" || task?.latestSettlement?.outcome === "refunded";
  const settled = status === "SETTLED" || settlementState === "settled" || task?.latestSettlement?.outcome === "paid";
  const completed = status === "COMPLETED" || resultStatus === "completed";
  const settlementReady = Boolean(settlementSummary?.canReleasePayment)
    || (!settled && !refunded && approved
      && (settlementState === "pending_settlement" || (task?.reviewActions || []).includes("settle") || settlementState === "reward_funded"));
  const refundReady = Boolean(settlementSummary?.canRefund);
  const revisionRequested = Boolean(revisionRequests.length)
    || resultStatus === "needs_revision"
    || task?.userReview?.decision === "needs_human_review"
    || (rejected && !refunded && !disputed && !unresolved);
  const needsRevision = revisionRequested && !refunded;
  const noSubmission = !submitted;

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
          : revisionRequested
            ? "Revision requested"
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
    ? "Payment Released"
    : completed
      ? "Completed"
      : refunded || cancelled
        ? "Cancelled"
        : disputed || unresolved
          ? "Disputed"
          : settlementReady
            ? "Approved"
            : approved
              ? "Approved"
              : revisionRequested
                ? "Revision Requested"
                : rejected
                  ? "Revision Requested"
                : underReview
                  ? "In Review"
                  : submitted
                    ? "Submitted"
                    : executing
                      ? "In Progress"
                      : assigned
                        ? "Agent Assigned"
                        : fundingPending
                          ? "Waiting for Funding"
                          : fundingConfirmed
                            ? "Funded"
                            : hasAnyRawStatus
                              ? "Draft"
                              : "Unknown";
  const settlementMessage = settled
    ? "Payment released."
    : refunded
      ? "Reward refunded."
      : settlementSummary?.settlementReadinessLabel
        ? settlementSummary.settlementReadinessLabel
        : settlementReady
          ? "Approved. USDC release is ready."
          : needsRevision
            ? "Revision requested before payout."
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
  const amountDisplay = Number.isFinite(Number(task?.rewardAmount))
    ? `${Number(task.rewardAmount).toLocaleString(undefined, { maximumFractionDigits: 6 })} USDC`
    : "Not available yet";
  const fundingTxLink = buildArcTransactionLink(task?.latestFundTxHash);
  const settlementTxLink = buildArcTransactionLink(task?.latestSettlement?.txReference);
  const releasePending = Boolean(settlementTxLink) && !settled && !refunded;
  const paymentStateLabel = settled
    ? "Payment released"
    : refunded
      ? "Reward refunded"
      : settlementReady
        ? "Payment ready"
        : refundReady
          ? "Refund ready"
          : fundingConfirmed
            ? "USDC funded"
            : fundingPending
              ? "Funding syncing"
              : "Funding required";
  const reviewStateLabel = approved
    ? "Owner approved"
    : revisionRequested
      ? "Revision requested"
      : rejected
        ? "Owner rejected"
      : disputed
        ? "Disputed"
        : underReview
          ? "AI guidance attached"
          : submitted
            ? "Needs owner review"
            : noSubmission
              ? "No submission yet"
              : "Waiting for update";
  const primaryAction = settled || completed
    ? { label: "View Completed Work", kind: "view_result", disabled: false }
    : refunded || cancelled
      ? { label: "View Task", kind: "view_result", disabled: false }
      : disputed || unresolved
        ? { label: "View Dispute", kind: "dispute", disabled: false }
        : settlementReady
          ? { label: "Release Payment", kind: "settle", disabled: false }
          : revisionRequested
            ? { label: "Waiting for Revision", kind: "wait_revision", disabled: true }
            : rejected
              ? { label: "Waiting for Revision", kind: "wait_revision", disabled: true }
            : submitted || underReview
              ? { label: "Review Submission", kind: "review", disabled: false }
              : executing
                ? { label: "Waiting for Agent", kind: "wait", disabled: true }
                : assigned
                  ? { label: "Waiting for Agent", kind: "wait", disabled: true }
                  : fundingConfirmed
                    ? { label: "Assign Agent", kind: "assign", disabled: false }
                    : fundingPending
                      ? { label: "Waiting for Funding", kind: "funding", disabled: true }
                      : { label: "Fund Task", kind: "fund", disabled: false };
  const statusDisplay = {
    label: settled
      ? "Payment Released"
      : completed
        ? "Completed"
        : refunded || cancelled
          ? "Cancelled"
          : disputed || unresolved
            ? "Disputed"
            : settlementReady || approved
              ? "Approved"
              : revisionRequested || rejected
                ? "Revision Requested"
                : underReview
                  ? "In Review"
                  : submitted
                    ? "Submitted"
                    : executing
                      ? "In Progress"
                      : assigned
                        ? "Agent Assigned"
                        : fundingPending
                          ? "Waiting for Funding"
                          : fundingConfirmed
                            ? "Funded"
                            : hasAnyRawStatus
                              ? "Draft"
                              : "Unknown",
    description: settled
      ? "Owner-approved work has been paid out and the task is effectively complete."
      : completed
        ? "The task is complete and ready to view as finished work."
        : refunded || cancelled
          ? "The task is closed and no normal payment release is available."
          : disputed || unresolved
            ? "The task needs dispute or appeal handling before payment can move."
            : settlementReady || approved
              ? "The owner approval step is complete and payment release is the next major action."
              : revisionRequested || rejected
                ? "The owner requested changes. Payment remains funded and locked until approved."
                : underReview
                  ? "A submitted result is being reviewed. AI guidance is advisory; the owner decides."
                  : submitted
                    ? "The agent submitted output and the owner needs to review it."
                    : executing
                      ? "The assigned agent is actively working on the funded task."
                      : assigned
                        ? "An agent is assigned and execution is the next step."
                        : fundingPending
                          ? "Funding was started and Dispatch is waiting for Arc Testnet confirmation."
                          : fundingConfirmed
                            ? "The task is funded and ready for assignment or execution."
                            : hasAnyRawStatus
                              ? "The task exists but needs funding before marketplace execution."
                              : "Dispatch cannot determine the current task state yet.",
    nextActionText: primaryAction.label,
    whoActsNext: settled || completed || refunded || cancelled
      ? "No action needed"
      : revisionRequested || rejected
          ? "Assigned agent"
          : settlementReady || approved || submitted || underReview || disputed || unresolved || fundingPending || !fundingConfirmed
            ? "Task owner"
        : executing || assigned
          ? "Assigned agent"
          : "Marketplace",
    primaryCtaText: primaryAction.label,
    variant: settled || completed
      ? "success"
      : refunded || cancelled || disputed || unresolved || revisionRequested || rejected || fundingFailed
        ? "warning"
        : fundingPending || fundingConfirmed || assigned || executing || submitted || underReview || approved || settlementReady
          ? "info"
          : "neutral",
    lifecycleStepAlignment: settled
      ? "payment"
      : completed
        ? "completed"
        : refunded || cancelled
          ? "completed"
          : disputed || unresolved || revisionRequested || rejected || underReview
            ? "review"
            : settlementReady || approved
              ? "approved"
              : submitted
                ? "submitted"
                : executing
                  ? "in_progress"
                  : assigned
                    ? "assigned"
                    : fundingPending || fundingConfirmed
                      ? "funding"
                      : "posted",
    actionableBy: settled || completed || refunded || cancelled
      ? "none"
      : executing || assigned
        ? "agent"
        : fundingConfirmed && !assigned
          ? "system"
          : "owner",
    raw: {
      status,
      resultStatus,
      transactionState,
      settlementState,
    },
  };
  const paymentDisplay = {
    label: settled
      ? "Released"
      : refunded
        ? "Refunded"
        : disputed || unresolved
          ? "Disputed"
          : releasePending
            ? "Release Pending"
            : settlementReady
              ? "Ready to Release"
              : submitted || underReview || approved || revisionRequested || rejected
                ? "Locked Until Approval"
                : fundingConfirmed
                  ? "Funded"
                  : fundingPending
                    ? "Funding Pending"
                    : fundingFailed
                      ? "Unknown"
                      : task
                        ? "Not Funded"
                        : "Unknown",
    description: settled
      ? "Payment has been released to the agent after owner approval."
      : refunded
        ? "The task reward has been refunded instead of released."
        : disputed || unresolved
          ? "Payment is paused while the task is disputed or unresolved."
          : releasePending
            ? "Transaction submitted. Waiting for confirmation."
            : settlementReady
              ? "Work has been approved. Payment is ready to release."
              : revisionRequested || rejected
                ? "Payment is funded and locked while the requested changes are pending. Approval is still required before release."
                : submitted || underReview
                ? "Payment is funded but locked. The owner must review the submitted work before release."
                : approved
                  ? "Owner approval is recorded. Payment can move to release."
                  : fundingConfirmed
                    ? "Payment is funded but not released yet."
                    : fundingPending
                      ? "Funding transaction is being confirmed on Arc Testnet."
                      : fundingFailed
                        ? "Funding status is unclear after a failed wallet or chain update."
                        : task
                          ? "This task has not been funded yet."
                          : "Payment state is not available yet.",
    nextPaymentAction: settled
      ? "No payment action needed."
      : refunded
        ? "No release action is available after refund."
        : disputed || unresolved
          ? "Resolve the dispute before payment can move."
          : releasePending
            ? "Wait for Arc Testnet confirmation."
            : settlementReady
              ? "Release payment."
              : revisionRequested || rejected
                ? "Wait for revised output before approval."
                : submitted || underReview
                ? "Review the submitted work."
                : approved
                  ? "Prepare payment release."
                  : fundingConfirmed
                    ? "Wait for output and owner approval."
                    : fundingPending
                      ? "Wait for funding confirmation."
                      : "Fund the task with testnet USDC.",
    variant: settled
      ? "success"
      : refunded || disputed || unresolved || fundingFailed
        ? "warning"
        : settlementReady || releasePending || fundingConfirmed || fundingPending || revisionRequested
          ? "info"
          : "neutral",
    amountDisplay,
    networkDisplay: "Arc Testnet",
    fundingTxHash: task?.latestFundTxHash || null,
    fundingTxLink,
    settlementTxHash: task?.latestSettlement?.txReference || null,
    settlementTxLink,
    transactionLinks: [
      fundingTxLink ? { label: "Funding transaction", href: fundingTxLink, hash: task.latestFundTxHash } : null,
      settlementTxLink ? { label: "Release transaction", href: settlementTxLink, hash: task.latestSettlement.txReference } : null,
    ].filter(Boolean),
  };
  const nextActor = statusDisplay.whoActsNext;
  const nextActionHelper = settled
    ? "The task is complete. Review the delivered work and payout trail."
    : completed
      ? "The task is complete. View the delivered work and final status."
    : refunded
      ? "The task is closed and the reward has been refunded."
      : cancelled
        ? "The task is closed and no normal marketplace action is available."
        : disputed || unresolved
          ? "Open the dispute or appeal view before payment can move."
      : settlementReady
        ? "Release USDC payment now that the output is approved."
        : revisionRequested || rejected
          ? "Waiting for revised output. Payment remains funded and locked until owner approval."
          : submitted || underReview
            ? "Review the submitted output. AI review is guidance; owner approval controls payout."
            : executing
              ? "The agent is working. Wait for the submitted output before reviewing."
              : assigned
                ? "An agent is assigned. Execution will produce a submitted output next."
                : fundingConfirmed
                  ? "The task is funded. Dispatch can route it to an agent for execution."
                  : fundingPending
                    ? "Wallet activity was captured. Wait for Arc Testnet confirmation."
                    : "Fund the task with testnet USDC before assignment or execution can begin.";
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
      label: "Task Created",
      status: "complete",
      helper: "Dispatch recorded the task request and reward terms.",
      timestamp: task?.createdAt || timelineByKind.get("task_created") || null,
    },
    {
      key: "funding",
      label: "Funded",
      status: fundingConfirmed ? "complete" : fundingFailed ? "failed" : fundingPending ? "current" : "pending",
      helper: fundingConfirmed
        ? "Funding is confirmed and the task can move through the marketplace."
        : fundingFailed
          ? "The latest wallet or chain funding action failed."
          : fundingPending
            ? "Wallet signatures were captured and Arc Testnet funding confirmation is still syncing."
            : "The task needs onchain funding before assignment and execution.",
      timestamp: timelineByKind.get("escrow_funded") || null,
    },
    {
      key: "assigned",
      label: "Agent Assigned",
      status: assigned ? "complete" : fundingConfirmed ? "current" : "pending",
      helper: assigned
        ? assignmentLabel
        : "An AI agent will be assigned once the USDC-funded task is ready to route.",
      timestamp: timelineByKind.get("agent_accepted") || timelineByKind.get("agent_invited") || null,
    },
    {
      key: "in_progress",
      label: "In Progress",
      status: submitted || approved || settled || refunded || revisionRequested || rejected || disputed || unresolved ? "complete" : executing ? "current" : assigned ? "pending" : "pending",
      helper: executing
        ? "The assigned worker is actively completing the task."
        : submitted
          ? "Execution finished and a result was submitted."
          : assigned
            ? "Execution starts after the agent begins work."
            : "Waiting for an assigned agent before work can start.",
      timestamp: timelineByKind.get("execution_started") || null,
    },
    {
      key: "submitted",
      label: "Submitted",
      status: submitted ? "complete" : executing ? "pending" : "pending",
      helper: submitted
        ? "A result is on the task and ready for owner review."
        : "No submission yet.",
      timestamp: timelineByKind.get("submission_received") || null,
    },
    {
      key: "review",
      label: "Review",
      status: approved ? "complete" : revisionRequested || rejected || disputed || unresolved ? "warning" : underReview || submitted ? "current" : "pending",
      helper: approved
        ? "The task owner approved the output for settlement."
        : revisionRequested || rejected
          ? "The owner requested changes. Payment stays locked until approval."
          : disputed
            ? "A dispute paused payout."
            : unresolved
              ? "Manual escalation is needed before payout can move."
              : underReview
                ? "AI review is guidance. The task owner makes the final approval decision."
                : submitted
                  ? "The output is waiting for owner review."
                  : "Review starts after submission.",
      timestamp: timelineByKind.get("review_started") || timelineByKind.get("result_verified") || null,
    },
    {
      key: "approved",
      label: "Approved",
      status: approved || settled ? "complete" : revisionRequested || rejected || disputed || unresolved ? "warning" : submitted || underReview ? "pending" : "pending",
      helper: approved || settled
        ? "Owner approval is recorded and payment can move."
        : revisionRequested || rejected
          ? "Approval is still required before payment can be released."
          : "Owner approval happens after reviewing a submitted output.",
      timestamp: timelineByKind.get("approved") || timelineByKind.get("result_verified") || null,
    },
    {
      key: "payment",
      label: "Payment Released",
      status: settled || refunded ? "complete" : revisionRequested || rejected || disputed || unresolved ? "warning" : settlementReady ? "current" : "pending",
      helper: settlementMessage,
      timestamp: task?.latestSettlement?.settlementTimestamp || timelineByKind.get("settled") || timelineByKind.get("refund_completed") || null,
    },
    {
      key: "reputation",
      label: "Completed",
      status: settled || refunded ? "complete" : "pending",
      helper: settled
        ? "Agent reputation can now reflect a paid, owner-approved funded outcome."
        : refunded
          ? "The task is closed and payout reputation stays unchanged or neutral."
          : "Reputation updates after owner approval and a terminal payout state.",
      timestamp: task?.latestSettlement?.settlementTimestamp || null,
    },
  ];

  return {
    steps,
    currentLabel,
    statusDisplay,
    fundingLabel,
    evaluationLabel,
    settlementLabel,
    settlementMessage,
    paymentStateLabel,
    paymentDisplay,
    reviewStateLabel,
    primaryAction,
    nextActor,
    nextActionHelper,
    assignmentLabel,
    assignedAgent,
    isSettled: settled,
    isRefunded: refunded,
    isRejected: rejected,
    isRevisionRequested: revisionRequested,
    isDisputed: disputed,
    isUnresolved: unresolved,
    isCancelled: cancelled,
  };
}

export function buildTaskPaymentDisplayModel(task, options = {}) {
  return buildTaskLifecycleModel(task, options).paymentDisplay;
}

export function buildTaskStatusDisplayModel(task, options = {}) {
  return buildTaskLifecycleModel(task, options).statusDisplay;
}

export function buildTaskRevisionDisplayModel(task, options = {}) {
  const sourceItems = [
    ...(Array.isArray(task?.revisionRequests) ? task.revisionRequests : []),
    ...(Array.isArray(options.revisionRequests) ? options.revisionRequests : []),
  ];
  const normalizedItems = sourceItems
    .filter(Boolean)
    .map((item, index) => {
      const changeRequest = String(item.changeRequest || item.note || item.reason || "").trim();
      const missingDetails = String(item.missingDetails || item.missing || "").trim();
      const extraInstruction = String(item.extraInstruction || item.instruction || "").trim();
      return {
        id: item.id || `revision_${index + 1}`,
        changeRequest: changeRequest || "Revision details were not provided.",
        missingDetails: missingDetails || "Not specified.",
        extraInstruction: extraInstruction || "",
        requestedAt: item.requestedAt || item.createdAt || null,
        requestedBy: item.requestedBy || item.actorWallet || "Task owner",
        resubmissionNote: item.resubmissionNote || null,
      };
    })
    .sort((left, right) => new Date(right.requestedAt || 0).getTime() - new Date(left.requestedAt || 0).getTime());
  const hasRevisionRequested = normalizedItems.length > 0
    || String(task?.resultStatus || "").toLowerCase() === "needs_revision"
    || task?.userReview?.decision === "needs_human_review";

  return {
    hasRevisionRequested,
    items: normalizedItems,
    latestRequest: normalizedItems[0] || null,
    headline: hasRevisionRequested
      ? "Revision requested"
      : "No revision requested",
    description: hasRevisionRequested
      ? "Payment remains funded and locked until the owner approves revised work."
      : "Revision history will appear here after changes are requested.",
    emptyMessage: "No revision requested. Review actions appear after the agent submits work.",
  };
}

export const taskBriefTemplates = [
  {
    id: "write_x_thread",
    name: "Write X Thread",
    category: "writing",
    description: "Turn a topic, links, or notes into a polished X thread.",
    expectedOutput: "A polished X thread based on the details above.",
    fields: [
      { key: "topic", label: "Topic", required: true },
      { key: "audience", label: "Audience", required: true },
      { key: "tone", label: "Tone", required: true },
      { key: "keyPoints", label: "Key points", required: true, multiline: true },
      { key: "referenceLinks", label: "Reference links", required: false, multiline: true },
      { key: "tweetCount", label: "Number of tweets", required: true },
      { key: "cta", label: "CTA", required: false },
    ],
  },
  {
    id: "summarize_article",
    name: "Summarize Article",
    category: "summarization",
    description: "Summarize an article, link, transcript, or pasted text.",
    expectedOutput: "A concise summary with the requested style, length, and key points.",
    fields: [
      { key: "article", label: "Article/link/text", required: true, multiline: true },
      { key: "summaryStyle", label: "Summary style", required: true },
      { key: "length", label: "Length", required: true },
      { key: "mainPoints", label: "Main points to extract", required: false, multiline: true },
      { key: "audience", label: "Audience", required: false },
    ],
  },
  {
    id: "debug_code",
    name: "Debug Code",
    category: "coding",
    description: "Explain and debug a code issue with clear reproduction context.",
    expectedOutput: "A clear diagnosis, likely cause, suggested fix, and next steps.",
    fields: [
      { key: "techStack", label: "Tech stack", required: true },
      { key: "errorMessage", label: "Error message", required: true, multiline: true },
      { key: "expectedBehavior", label: "Expected behavior", required: true, multiline: true },
      { key: "actualBehavior", label: "Actual behavior", required: true, multiline: true },
      { key: "codeSnippet", label: "Code snippet/link", required: false, multiline: true },
      { key: "alreadyTried", label: "What you already tried", required: false, multiline: true },
    ],
  },
  {
    id: "research_project",
    name: "Research Project",
    category: "research",
    description: "Research a project, market, or topic and return a structured brief.",
    expectedOutput: "A structured research brief with comparisons, risks, and conclusion.",
    fields: [
      { key: "projectName", label: "Project name", required: true },
      { key: "links", label: "Links", required: false, multiline: true },
      { key: "researchGoal", label: "Research goal", required: true, multiline: true },
      { key: "whatToCompare", label: "What to compare", required: false, multiline: true },
      { key: "outputFormat", label: "Output format", required: true },
      { key: "risksToCover", label: "Risks to cover", required: false, multiline: true },
    ],
  },
  {
    id: "rewrite_content",
    name: "Rewrite Content",
    category: "writing",
    description: "Rewrite rough content for a clearer tone, audience, and length.",
    expectedOutput: "A rewritten version that preserves meaning while improving clarity and tone.",
    fields: [
      { key: "originalText", label: "Original text", required: true, multiline: true },
      { key: "targetTone", label: "Target tone", required: true },
      { key: "audience", label: "Audience", required: false },
      { key: "length", label: "Length", required: false },
      { key: "whatToImprove", label: "What to improve", required: true, multiline: true },
    ],
  },
  {
    id: "custom_task",
    name: "Custom Task",
    category: "",
    description: "Write your own task brief from scratch.",
    expectedOutput: "",
    fields: [],
  },
];

export function getTaskBriefTemplate(templateId) {
  return taskBriefTemplates.find((template) => template.id === templateId) || taskBriefTemplates.at(-1);
}

export function buildTaskTemplateBrief(templateId, values = {}) {
  const template = getTaskBriefTemplate(templateId);
  if (!template || template.id === "custom_task") {
    return {
      template,
      brief: "",
      missingFields: [],
      isCustom: true,
    };
  }

  const missingFields = template.fields
    .filter((field) => field.required && !String(values[field.key] || "").trim())
    .map((field) => field.label);

  const lines = [
    `Task Type: ${template.name}`,
    "",
    ...template.fields.flatMap((field) => [
      `${field.label}:`,
      String(values[field.key] || "").trim() || "Not provided yet",
      "",
    ]),
    "Expected output:",
    template.expectedOutput,
  ];

  return {
    template,
    brief: lines.join("\n").trim(),
    missingFields,
    isCustom: false,
  };
}

export function buildPostTaskChecklist(form, selectedAgent) {
  const isDirect = form.hiringMode === "direct_hire";
  const templateResult = buildTaskTemplateBrief(form.templateId || "custom_task", form.templateFields || {});
  const templateReady = templateResult.isCustom || templateResult.missingFields.length === 0;
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
        id: "template",
        label: templateResult.isCustom ? "Custom brief ready" : "Template fields ready",
        complete: templateReady,
      },
      {
        id: "selection",
        label: isDirect ? "Agent selected" : "Participant cap defined",
        complete: isDirect ? Boolean(form.selectedAgentId) : Number(form.maxParticipants || 0) >= 1,
      },
      {
        id: "settlement",
        label: "Owner review and settlement path chosen",
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

export function buildSuggestedTaskTemplatesForAgent(agent) {
  const haystack = [
    agent?.profile?.publicName,
    agent?.profile?.slug,
    agent?.profile?.category,
    ...(agent?.profile?.skills || []),
    ...(agent?.profile?.capabilityTags || []),
    ...(agent?.profile?.skillCategories || []),
  ].join(" ").toLowerCase();

  const ids = haystack.includes("thread")
    ? ["write_x_thread", "rewrite_content"]
    : haystack.includes("summar")
      ? ["summarize_article", "rewrite_content"]
      : haystack.includes("research")
        ? ["research_project", "summarize_article"]
        : haystack.includes("rewrit")
          ? ["rewrite_content", "write_x_thread"]
          : haystack.includes("repurpos") || haystack.includes("content")
            ? ["write_x_thread", "rewrite_content"]
            : haystack.includes("code") || haystack.includes("debug")
              ? ["debug_code", "research_project"]
              : ["custom_task"];

  return ids
    .map(getTaskBriefTemplate)
    .filter(Boolean);
}

export function buildAgentDisplayModel(agent, taskCollections = {}) {
  const profile = agent?.profile || {};
  const summary = agent?.performanceSummary || {};
  const paidCompleted = summary.paidTasksCompleted ?? summary.tasksCompleted ?? 0;
  const tasksAttempted = summary.tasksAttempted ?? summary.totalTasks ?? paidCompleted ?? 0;
  const paidEarnings = summary.paidEarnings ?? summary.totalEarnings ?? 0;
  const approvalRate = typeof summary.approvalRate === "number" && tasksAttempted > 0
    ? `${Math.round(summary.approvalRate * 100)}%`
    : "Not enough data yet";
  const averageScore = typeof summary.averageScore === "number" && summary.averageScore > 0
    ? String(Math.round(summary.averageScore))
    : "Not enough data yet";
  const deliveryTime = summary.averageResponseTimeMs || summary.averageLatencyMs
    ? formatResponseMetric(agent)
    : "Not enough data yet";
  const typeLabel = profile.originType === "external" ? "External Agent" : "Platform Agent";
  const connectionStatus = profile.originType === "external"
    ? labelize(profile.connectionStatus || agent?.healthStatus || "unknown")
    : "Dispatch managed";
  const verificationLabel = profile.originType === "external"
    ? (["active", "healthy", "online", "connected"].includes(String(profile.connectionStatus || agent?.healthStatus || "").toLowerCase())
        ? "Connection active"
        : "Not verified yet")
    : "Platform managed";
  const bestUseCases = (profile.skills?.length ? profile.skills : profile.capabilityTags || profile.skillCategories || [])
    .slice(0, 5)
    .map((item) => labelize(item));
  const recentWork = buildRecentAgentWork(agent, taskCollections);
  const suggestedTemplates = buildSuggestedTaskTemplatesForAgent(agent);
  const description = profile.description || "Marketplace worker for structured funded AI tasks.";
  const specialty = bestUseCases[0] || labelize(profile.category || "general work");

  return {
    name: profile.publicName || "Unnamed Agent",
    slug: profile.slug || "",
    categoryLabel: labelize(profile.category || "general"),
    typeLabel,
    description,
    shortDescription: description.split(".")[0].slice(0, 110),
    specialty,
    bestUseCases,
    badges: buildAgentIdentityBadges(agent),
    connectionStatus,
    verificationLabel,
    statusLabel: labelize(summary.status || "new"),
    completedTasksDisplay: String(paidCompleted || 0),
    approvalRateDisplay: approvalRate,
    totalEarnedDisplay: `${Number(paidEarnings || 0).toLocaleString(undefined, { maximumFractionDigits: 6 })} USDC`,
    averageDeliveryDisplay: deliveryTime,
    averageScoreDisplay: averageScore,
    reviewsDisplay: (summary.totalReviews || summary.totalApprovals || 0) > 0
      ? String(summary.totalReviews || summary.totalApprovals)
      : "No reviews yet",
    rankDisplay: summary.rankPosition ? `#${summary.rankPosition}` : "Not ranked yet",
    pricingNote: profile.pricingHint || "Set per funded task reward",
    payoutWalletDisplay: shortWallet(profile.payoutWallet || profile.ownerWallet),
    recentWork,
    suggestedTemplates,
    trustNote: paidCompleted > 0
      ? "Trust comes from funded task completions, owner-approved outcomes, settlement history, and reliability over time."
      : "Not enough completed work yet. Reputation will build as this agent completes approved funded tasks.",
  };
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
  const revisionRequested = Boolean(task?.revisionRequests?.length)
    || String(task?.resultStatus || "").toLowerCase() === "needs_revision"
    || task?.userReview?.decision === "needs_human_review";
  const canDispute = ["SUBMITTED", "UNDER_REVIEW", "REJECTED", "APPROVED"].includes(task?.status);
  const canAppeal = ["DISPUTED", "REJECTED", "UNRESOLVED"].includes(task?.status);
  const settlementReady = task?.status === "APPROVED" || (task?.reviewActions || []).includes("settle");
  const finalOutcome = task?.latestEvaluation?.finalOutcome || null;
  return {
    primaryActions: settlementReady ? ["settle"] : canReviewSubmittedResult && !revisionRequested ? ["approve", "request_revision"] : [],
    advancedActions: [
      ...(canReviewSubmittedResult ? ["assisted", "hybrid"] : []),
      ...(canDispute ? ["dispute"] : []),
      ...(canAppeal ? ["appeal"] : []),
    ],
    headline: settlementReady
      ? "This task is ready for Arc Testnet USDC settlement."
      : finalOutcome === "disputed"
        ? "A dispute paused payout and opened an escalation path."
        : finalOutcome === "unresolved" || task?.status === "UNRESOLVED"
          ? "Review is paused for escalation. AI review is guidance; unresolved states should only come from dispute or appeal paths."
        : revisionRequested
          ? "The owner requested changes. Payment stays funded and locked until revised work is approved."
          : canReviewSubmittedResult
            ? (hasEvaluation ? "AI review is attached as guidance. You decide whether to approve or request changes." : "Review the submitted output and decide whether USDC payout moves.")
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
  const hasLiveOnchainAnchor = /^0x[a-f0-9]{40}:/i.test(String(task?.onchainTaskRef || ""));
  const otherwiseImproveEligible = Boolean(
    latestRun?.endpointUrl?.startsWith("platform://")
      && improveEligibleStatuses.has(task?.status)
      && !["settled", "refunded", "disputed"].includes(task?.settlementState),
  );
  const canImproveAgain = Boolean(
    otherwiseImproveEligible && !hasLiveOnchainAnchor,
  );

  return {
    title: summary,
    sections,
    finalOutputText: sections.length
      ? sections.map((section) => `${section.heading}\n${(section.bullets || []).map((bullet) => `- ${bullet}`).join("\n")}`).join("\n\n")
      : String(summary || "").trim(),
    qualityScore: typeof trace?.score === "number" ? Math.round(trace.score) : typeof evaluation?.overall === "number" ? Math.round(evaluation.overall) : null,
    aiReviewScore: typeof task?.latestEvaluation?.consensusScore === "number" ? Math.round(task.latestEvaluation.consensusScore) : null,
    reviewConfidence: typeof task?.latestEvaluation?.consensusConfidence === "number" ? Math.round(task.latestEvaluation.consensusConfidence * 100) : null,
    finalOutcome: task?.latestEvaluation?.finalOutcome || null,
    evaluationNote: task?.latestEvaluation?.equivalenceSummary || task?.latestEvaluation?.summary || null,
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
    improveAgainUnavailableReason: !canImproveAgain && otherwiseImproveEligible && hasLiveOnchainAnchor
      ? "Improve Again is disabled for live Arc-submitted tasks because the current contract cannot safely reopen execution after submission."
      : null,
    latestRunId: latestRun?.runId || null,
  };
}
