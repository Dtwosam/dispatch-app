import { categories, suggestedSkillsByCategory, wizardSteps } from "./app-config.js";
import {
  deadlineCountdown,
  emptyState,
  escapeHtml,
  formatCurrency,
  labelize,
  revealSections,
  taskStatusTone,
} from "./app-ui.js";
import { buildArcTransactionLink, buildTaskLifecycleModel } from "./ui-models.js";

function renderResultMarkup(resultModel) {
  const sectionMarkup = Array.isArray(resultModel?.sections) && resultModel.sections.length
    ? resultModel.sections
        .map((section) => `
          <div class="result-block">
            <strong>${escapeHtml(section.heading)}</strong>
            <p>${escapeHtml((section.bullets || []).join(" "))}</p>
          </div>
        `)
        .join("")
    : "";
  const source = String(resultModel?.finalOutputText || "").trim();
  if (!source && !sectionMarkup) {
    return `<div class="result-block"><p>No result yet. The delivered output will appear here once the agent submits work.</p></div>`;
  }

  if (sectionMarkup) return sectionMarkup;

  return source
    .split(/\n{2,}/)
    .map((section) => section.trim())
    .filter(Boolean)
    .slice(0, 6)
    .map((section) => `<div class="result-block"><p>${escapeHtml(section)}</p></div>`)
    .join("");
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

function arcTxLink(hash) {
  return buildArcTransactionLink(hash);
}

export function renderTaskDetailPageView({
  el,
  task,
  history,
  onchainSnapshot,
  reviewModel,
  resultModel,
  revisionModel,
  disputeModel,
}) {
  const agents = task.selectedAgents || [];
  const reviewActions = task.reviewActions || [];
  const visibleActionSet = new Set([
    ...reviewModel.primaryActions,
    ...reviewModel.advancedActions,
  ]);
  const additionalReviewActions = reviewActions.filter((action) => !visibleActionSet.has(action));
  const browserTxHashes = [
    task.latestCreateTxHash ? { label: "Create", hash: task.latestCreateTxHash } : null,
    task.latestFundTxHash ? { label: "Fund", hash: task.latestFundTxHash } : null,
    task.latestAssignTxHash ? { label: "Assign", hash: task.latestAssignTxHash } : null,
  ].filter(Boolean);
  const latestSettlementTx = arcTxLink(task.latestSettlement?.txReference);
  const onchainTask = onchainSnapshot?.onchainTask || null;
  const onchainState = String(onchainTask?.state || "").toUpperCase();
  const escrowLocked = readBigIntLike(onchainTask?.escrow_locked ?? onchainTask?.escrowLocked ?? 0n);
  const onchainFundingConfirmed = escrowLocked > 0n && [
    "OPEN",
    "ASSIGNED",
    "EXECUTING",
    "SUBMITTED",
    "UNDER_REVIEW",
    "APPROVED",
    "REJECTED",
    "DISPUTED",
    "SETTLED",
    "REFUNDED",
  ].includes(onchainState);
  const fundingConfirmed = (task.transactionState === "accepted" && Boolean(task.onchainTaskRef)) || onchainFundingConfirmed;
  const isDemoTask = task.onchainTaskRef?.startsWith("demo:")
    && task.title === "Write a launch thread for a new stablecoin payment app";
  const demoCanAdvance = isDemoTask && !["SETTLED", "REFUNDED", "CANCELLED"].includes(task.status);
  const demoNextLabel = task.status === "APPROVED"
    ? "Release Demo USDC"
    : task.status === "SUBMITTED" || task.status === "UNDER_REVIEW"
      ? "Run Demo Evaluator"
      : task.status === "EXECUTING"
        ? "Submit Demo Output"
        : "Advance Demo Step";
  const lifecycle = buildTaskLifecycleModel(task, { onchainSnapshot });
  const settlementLabel = fundingConfirmed
    ? labelize(task.settlementState || "reward_funded")
    : browserTxHashes.length
      ? "Funding Syncing"
      : "Awaiting Funding";
  const executionHeadline = task.status === "EXECUTING"
    ? "Agent is actively working and this task surface is waiting for the next result update."
    : task.status === "SUBMITTED"
      ? "Execution finished and the result is ready for a review decision."
      : fundingConfirmed
        ? "The task is staged and waiting for the next execution event."
        : browserTxHashes.length
          ? "Signed wallet transactions were captured and the marketplace is syncing the latest onchain state."
          : "This task has not been funded onchain yet.";
  const nextStepSummary = task.status === "SUBMITTED"
    ? "Review the output, then approve and settle if it looks good."
    : task.status === "EXECUTING"
      ? "The assigned agent is still working. This page will update as execution moves."
      : fundingConfirmed
        ? "This task is waiting for the next marketplace action."
        : browserTxHashes.length
          ? "The wallet signing flow completed and the marketplace is finalizing funding and assignment status."
          : "Fund this task onchain before it can move into assignment and execution.";
  const payment = lifecycle.paymentDisplay;
  const taskStatus = lifecycle.statusDisplay;
  const paymentBannerTone = payment.variant === "success"
    ? "success"
    : payment.variant === "warning"
      ? "warning"
      : "info";

  el.appRoot.innerHTML = `
    <section data-structure="task-detail">
      <header class="reveal-on-scroll is-visible">
        <p class="mini-label">Task</p>
        <h1>${escapeHtml(task.title)}</h1>
        <p class="muted">${escapeHtml(task.description)}</p>
      </header>

      <section class="shell-section surface-page reveal-on-scroll">
        <div class="section-head">
          <div>
            <p class="mini-label">Lifecycle</p>
            <h2>Funded work progress</h2>
          </div>
          <span class="tag">${escapeHtml(taskStatus.label)}</span>
        </div>
        <div class="task-summary">
          <div class="metric-card"><strong>${formatCurrency(task.rewardAmount || 0)}</strong><span>USDC reward</span></div>
          <div class="metric-card"><strong>${escapeHtml(taskStatus.label)}</strong><span>Current status</span></div>
          <div class="metric-card"><strong>${escapeHtml(lifecycle.fundingLabel)}</strong><span>Funding</span></div>
          <div class="metric-card"><strong>${escapeHtml(lifecycle.reviewStateLabel)}</strong><span>Review</span></div>
          <div class="metric-card"><strong>${escapeHtml(lifecycle.paymentStateLabel)}</strong><span>Payment</span></div>
          <div class="metric-card"><strong>${escapeHtml(lifecycle.nextActor)}</strong><span>Who acts next</span></div>
        </div>
        <div class="status-banner surface-alert ${lifecycle.isSettled ? "success" : lifecycle.isRefunded || lifecycle.isRejected || lifecycle.isDisputed || lifecycle.isUnresolved ? "warning" : "info"}">
          <strong>${escapeHtml(taskStatus.label)}</strong>
          <p>${escapeHtml(taskStatus.description)}</p>
          <p><strong>Next required action:</strong> ${escapeHtml(taskStatus.nextActionText)} | ${escapeHtml(taskStatus.whoActsNext)}</p>
        </div>
        ${isDemoTask ? `
          <div class="status-banner surface-alert info">
            <strong>Arc Testnet demo mode</strong>
            <p>Demo USDC settlement is shown for this walkthrough. Dispatch keeps owner approval and payout eligibility clear while external agents can integrate through ERC-8183-compatible adapter job flows.</p>
            ${demoCanAdvance ? `<div class="secondary-actions" style="margin-top:12px;"><button class="hero-primary" data-demo-next="${task.taskId}">${escapeHtml(demoNextLabel)}</button></div>` : ""}
          </div>
        ` : ""}
        <div class="steps-grid" style="margin-top:18px;">
          ${lifecycle.steps.map((step) => `
            <article class="step-card">
              <div class="step-icon">${escapeHtml(step.status === "complete" ? "OK" : step.status === "current" ? "Now" : step.status === "warning" || step.status === "failed" ? "!" : ".")}</div>
              <strong>${escapeHtml(step.label)}</strong>
              <p>${escapeHtml(step.helper)}</p>
              <div class="agent-tags" style="margin-top:10px;">
                <span class="tag">${escapeHtml(labelize(step.status))}</span>
                ${step.timestamp ? `<span class="tag">${escapeHtml(new Date(step.timestamp).toLocaleString())}</span>` : ""}
              </div>
            </article>
          `).join("")}
        </div>
      </section>

      <section class="shell-section surface-page reveal-on-scroll">
        <div class="section-head">
          <div>
            <p class="mini-label">USDC payment</p>
            <h2>Payment state</h2>
          </div>
          <span class="tag">${escapeHtml(payment.label)}</span>
        </div>
        <div class="task-summary">
          <div class="metric-card"><strong>${escapeHtml(payment.amountDisplay)}</strong><span>Task reward</span></div>
          <div class="metric-card"><strong>${escapeHtml(payment.label)}</strong><span>Payment status</span></div>
          <div class="metric-card"><strong>${escapeHtml(payment.nextPaymentAction)}</strong><span>Next payment action</span></div>
          <div class="metric-card"><strong>${escapeHtml(payment.networkDisplay)}</strong><span>Network</span></div>
        </div>
        <div class="status-banner surface-alert ${paymentBannerTone}">
          <strong>${escapeHtml(payment.label)}</strong>
          <p>${escapeHtml(payment.description)}</p>
        </div>
        <div class="agent-tags" style="margin-top:12px;">
          ${payment.fundingTxLink ? `<a class="tag" href="${payment.fundingTxLink}" target="_blank" rel="noreferrer">Funding tx on Arcscan</a>` : `<span class="tag">Funding tx: Not available yet</span>`}
          ${payment.settlementTxLink ? `<a class="tag" href="${payment.settlementTxLink}" target="_blank" rel="noreferrer">Release tx on Arcscan</a>` : `<span class="tag">Release tx: Not available yet</span>`}
        </div>
      </section>

      <section class="task-grid reveal-on-scroll">
        <article class="task-main shell-section surface-page">
          <div class="section-head">
            <div>
              <p class="mini-label">Execution</p>
              <h2>Live task status</h2>
            </div>
            <span class="tag">${escapeHtml(taskStatus.label)}</span>
          </div>
          <div class="status-banner surface-alert info">
            <strong>Execution rail</strong>
            <p>${executionHeadline}</p>
          </div>
          <div class="task-summary">
            <div class="metric-card"><strong>${formatCurrency(task.rewardAmount || 0)}</strong><span>Reward</span></div>
            <div class="metric-card"><strong>${deadlineCountdown(task.deadline)}</strong><span>Deadline</span></div>
            <div class="metric-card"><strong>${escapeHtml(lifecycle.reviewStateLabel)}</strong><span>Review</span></div>
            <div class="metric-card"><strong>${escapeHtml(lifecycle.paymentStateLabel)}</strong><span>Payment</span></div>
          </div>
          <div class="simple-panel surface-panel">
            <div class="agent-status"><span class="live-dot"></span><span>${escapeHtml(taskStatus.label)} - ${escapeHtml(taskStatus.description)}</span></div>
            <div class="agent-tags" style="margin-top:12px;">
              ${agents.length
                ? agents.map((agent) => `<span class="tag">${escapeHtml(agent.displayName)} | ${escapeHtml(agent.originType === "external" ? "External" : "Platform")}</span>`).join("")
                : "<span class='muted'>No agent assigned yet.</span>"}
            </div>
            <p class="muted" style="margin-top:12px;">${escapeHtml(lifecycle.assignmentLabel)}</p>
          </div>
        </article>
        <aside class="task-side">
          <article class="shell-panel surface-panel">
            <p class="mini-label">Task summary</p>
            <h3>What happens next</h3>
            <p class="muted">${nextStepSummary}</p>
            <div class="status-banner surface-alert info" style="margin-top:12px;">
              <strong>${escapeHtml(taskStatus.primaryCtaText)}</strong>
              <p>${escapeHtml(lifecycle.nextActionHelper)}</p>
            </div>
            <div class="agent-tags" style="margin-top:12px;">
              <span class="tag">${escapeHtml(lifecycle.fundingLabel)}</span>
              <span class="tag">${escapeHtml(lifecycle.reviewStateLabel)}</span>
              <span class="tag">${escapeHtml(lifecycle.paymentStateLabel)}</span>
            </div>
            ${(task.onchainTaskRef || onchainTask) ? `<p class="muted">${fundingConfirmed ? "Onchain task ref" : "Task pointer"}: ${escapeHtml(task.onchainTaskRef || `task:${task.taskId}`)}</p>` : ""}
            ${browserTxHashes.length ? `
              <div style="margin-top:14px;">
                <p class="mini-label">Browser transaction trace</p>
                <div class="agent-tags" style="margin-top:10px;">
                  ${browserTxHashes.map((item) => {
                    const href = arcTxLink(item.hash);
                    const label = `${item.label} ${item.hash.slice(0, 12)}...`;
                    return href
                      ? `<a class="tag" href="${href}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>`
                      : `<span class="tag">${escapeHtml(label)}</span>`;
                  }).join("")}
                </div>
                ${!fundingConfirmed ? `<p class="muted" style="margin-top:10px;">These hashes let the marketplace reconcile wallet-signed activity while final task state catches up.</p>` : ""}
                ${!fundingConfirmed ? `<div class="secondary-actions" style="margin-top:12px;"><button data-check-funding="${task.taskId}">Refresh execution status</button></div>` : ""}
              </div>
            ` : ""}
            ${onchainTask ? `<p class="muted" style="margin-top:10px;">Onchain state: ${escapeHtml(onchainState || "unknown")} | Escrow locked: ${escapeHtml(escrowLocked.toString())}</p>` : ""}
          </article>
        </aside>
      </section>

      <section class="task-grid reveal-on-scroll">
        <article class="task-main shell-section surface-page">
          <div class="section-head">
            <div>
              <p class="mini-label">Result</p>
              <h2>Delivered output</h2>
            </div>
          </div>
          <div class="task-summary">
            <div class="metric-card"><strong>${resultModel?.qualityScore ?? "N/A"}</strong><span>Quality Score</span></div>
            <div class="metric-card"><strong>${escapeHtml(resultModel?.confidence ? labelize(resultModel.confidence) : "Unknown")}</strong><span>Confidence</span></div>
            <div class="metric-card"><strong>${resultModel?.reviewConfidence != null ? `${resultModel.reviewConfidence}%` : "N/A"}</strong><span>Review Confidence</span></div>
            <div class="metric-card"><strong>${escapeHtml(resultModel?.finalOutcome ? labelize(resultModel.finalOutcome) : (resultModel?.workerLabel || "Marketplace Agent"))}</strong><span>${resultModel?.finalOutcome ? "Result Status" : "Worker"}</span></div>
          </div>
          ${resultModel?.aiReviewScore != null || resultModel?.reviewConfidence != null || resultModel?.evaluationNote ? `
            <div class="status-banner surface-alert info">
              <strong>AI review guidance</strong>
              <p>
                ${resultModel?.aiReviewScore != null ? `AI review score ${resultModel.aiReviewScore}. ` : ""}
                ${resultModel?.reviewConfidence != null ? `Review confidence ${resultModel.reviewConfidence}%. ` : ""}
                ${escapeHtml(resultModel?.evaluationNote || "AI review is only guidance. The task owner makes the final approval decision.")}
              </p>
            </div>
          ` : ""}
          ${resultModel?.deliveryNote ? `
            <div class="status-banner surface-alert info">
              <strong>Marketplace benchmark run</strong>
              <p>${escapeHtml(resultModel.deliveryNote)}</p>
            </div>
          ` : ""}
          <div class="result-surface">
            ${renderResultMarkup(resultModel)}
          </div>
          ${(resultModel?.hasDraft || resultModel?.stageTimingsMs || onchainSnapshot?.onchainTask) ? `
            <details class="shell-panel surface-panel disclosure-panel" style="margin-top:18px;">
              <summary>More details</summary>
              <div class="disclosure-panel__body">
                ${resultModel?.hasDraft ? `
                  <div>
                    <strong>View Draft</strong>
                    <div class="result-surface" style="margin-top:14px;">
                      ${renderResultMarkup({ finalOutputText: resultModel.draftText })}
                    </div>
                  </div>
                ` : ""}
                ${resultModel?.stageTimingsMs ? `
                  <div>
                    <strong>Stage timings</strong>
                    <div class="agent-tags" style="margin-top:12px;">
                      <span class="tag">structure ${Math.round(resultModel.stageTimingsMs.structuring)}ms</span>
                      <span class="tag">generate ${Math.round(resultModel.stageTimingsMs.generation)}ms</span>
                      ${resultModel.stageTimingsMs.improvement ? `<span class="tag">improve ${Math.round(resultModel.stageTimingsMs.improvement)}ms</span>` : ""}
                    </div>
                  </div>
                ` : ""}
                ${onchainSnapshot?.onchainTask ? `
                  <div>
                    <strong>Onchain trace</strong>
                    <p class="muted">${escapeHtml(JSON.stringify(onchainSnapshot.onchainTask))}</p>
                  </div>
                ` : ""}
              </div>
            </details>
          ` : ""}
        </article>
        <aside class="task-side">
          <article class="shell-panel surface-panel">
            <p class="mini-label">Actions</p>
            <h3>${escapeHtml(taskStatus.primaryCtaText)}</h3>
            <p class="muted">${escapeHtml(reviewModel.headline)}</p>
            <div class="review-actions">
              ${reviewModel.primaryActions.includes("approve") ? '<button data-user-review="approve">Approve work</button>' : ""}
              ${reviewModel.primaryActions.includes("request_revision") ? '<button data-request-revision-toggle>Request revision</button>' : ""}
              ${reviewModel.primaryActions.includes("settle") ? `<button class="hero-primary" data-task-action="settle" data-task-id="${task.taskId}">Release Payment</button>` : ""}
              ${reviewModel.primaryActions.length === 0 ? `<button disabled>${escapeHtml(taskStatus.primaryCtaText)}</button>` : ""}
            </div>
            ${reviewModel.primaryActions.includes("request_revision") ? `
              <div class="simple-panel surface-panel" data-revision-form style="margin-top:14px;">
                <strong>Request changes</strong>
                <p class="muted">This records revision guidance without releasing payment. USDC stays funded and locked until approval.</p>
                <label class="field-stack" style="margin-top:12px;"><span class="muted">What needs to change?</span><textarea id="revisionChangeRequest" rows="3" placeholder="Explain the exact changes you need."></textarea></label>
                <label class="field-stack"><span class="muted">What was missing?</span><textarea id="revisionMissingDetails" rows="3" placeholder="List missing details, format issues, or weak sections."></textarea></label>
                <label class="field-stack"><span class="muted">Optional extra instruction</span><textarea id="revisionExtraInstruction" rows="2" placeholder="Add any additional instruction for the revised output."></textarea></label>
                <button data-request-revision="${task.taskId}">Save revision request</button>
              </div>
            ` : ""}
            <div class="secondary-actions">
              ${resultModel?.canImproveAgain ? `<button data-platform-improve="${task.taskId}">Improve Again</button>` : ""}
              ${resultModel?.improveAgainUnavailableReason ? `<p class="muted">${escapeHtml(resultModel.improveAgainUnavailableReason)}</p>` : ""}
              ${reviewModel.advancedActions.includes("assisted") ? '<button data-eval="assisted">Assisted review</button>' : ""}
              ${reviewModel.advancedActions.includes("hybrid") ? '<button data-eval="hybrid">Hybrid review</button>' : ""}
              ${reviewModel.advancedActions.includes("dispute") ? `<button data-open-dispute-toggle>Open dispute</button>` : ""}
              ${reviewModel.advancedActions.includes("appeal") ? `<button data-task-action="appeal" data-task-id="${task.taskId}">Appeal</button>` : ""}
            </div>
            ${reviewModel.advancedActions.includes("dispute") ? `
              <div class="simple-panel surface-panel" data-dispute-form style="margin-top:14px;">
                <strong>Open dispute</strong>
                <p class="muted">Use this only when approval or revision cannot safely resolve the task. Payment stays locked; this does not process a refund or settlement.</p>
                <label class="field-stack" style="margin-top:12px;">
                  <span class="muted">Reason</span>
                  <select id="disputeReason">
                    <option value="">Select reason</option>
                    <option value="Work does not match brief">Work does not match brief</option>
                    <option value="Output is incomplete">Output is incomplete</option>
                    <option value="Quality is too low">Quality is too low</option>
                    <option value="Agent did not follow revision request">Agent did not follow revision request</option>
                    <option value="Other">Other</option>
                  </select>
                </label>
                <label class="field-stack"><span class="muted">Evidence/details</span><textarea id="disputeDetails" rows="4" placeholder="Describe what happened and include useful evidence or context."></textarea></label>
                <label class="field-stack">
                  <span class="muted">Requested resolution</span>
                  <select id="disputeResolution">
                    <option value="Request platform review">Request platform review</option>
                    <option value="Ask agent for final revision">Ask agent for final revision</option>
                    <option value="Request refund review">Request refund review</option>
                  </select>
                </label>
                <button data-open-dispute="${task.taskId}">Save dispute</button>
              </div>
            ` : ""}
            <div class="secondary-actions">
              ${additionalReviewActions.map((action) => `<button data-task-action="${action}" data-task-id="${task.taskId}">${escapeHtml(labelize(action))}</button>`).join("")}
            </div>
          </article>
        </aside>
      </section>

      <section class="task-grid reveal-on-scroll">
        <article class="task-main shell-section surface-page">
          <div class="section-head">
            <div>
              <p class="mini-label">Dispute status</p>
              <h2>Trust review</h2>
            </div>
            <span class="tag">${escapeHtml(disputeModel?.headline || "No dispute open")}</span>
          </div>
          <div class="status-banner surface-alert ${disputeModel?.hasOpenDispute ? "warning" : "info"}">
            <strong>${escapeHtml(disputeModel?.headline || "No dispute open")}</strong>
            <p>${escapeHtml(disputeModel?.description || "Dispute details will appear here if the owner opens a dispute.")}</p>
          </div>
          <div class="live-feed" style="margin-top:16px;">
            ${(disputeModel?.items || []).map((item, index) => `
              <article class="feed-card feed-card--warning" style="animation-delay:${index * 70}ms">
                <span class="feed-card__pulse"></span>
                <div>
                  <strong>${escapeHtml(item.reason)}</strong>
                  <p>${escapeHtml(item.details)}</p>
                  <p>Requested resolution: ${escapeHtml(item.requestedResolution)}</p>
                  <div class="agent-tags" style="margin-top:10px;">
                    <span class="tag">${escapeHtml(item.statusLabel)}</span>
                    <span class="tag">${escapeHtml(item.openedBy)}</span>
                    ${item.openedAt ? `<span class="tag">${escapeHtml(new Date(item.openedAt).toLocaleString())}</span>` : ""}
                  </div>
                </div>
              </article>
            `).join("") || emptyState(disputeModel?.emptyMessage || "No dispute open.")}
          </div>
        </article>
        <aside class="task-side">
          <article class="shell-panel surface-panel">
            <p class="mini-label">Dispute payment rule</p>
            <h3>Payment stays locked</h3>
            <p class="muted">Opening a dispute does not mark work complete, release USDC, refund USDC, or create a transaction hash. It only pauses the task UX for review.</p>
          </article>
        </aside>
      </section>

      <section class="task-grid reveal-on-scroll">
        <article class="task-main shell-section surface-page">
          <div class="section-head">
            <div>
              <p class="mini-label">Revision history</p>
              <h2>Requested changes</h2>
            </div>
            <span class="tag">${escapeHtml(revisionModel?.headline || "No revision requested")}</span>
          </div>
          <div class="status-banner surface-alert ${revisionModel?.hasRevisionRequested ? "warning" : "info"}">
            <strong>${escapeHtml(revisionModel?.headline || "No revision requested")}</strong>
            <p>${escapeHtml(revisionModel?.description || "Revision history will appear here after changes are requested.")}</p>
          </div>
          <div class="live-feed" style="margin-top:16px;">
            ${(revisionModel?.items || []).map((item, index) => `
              <article class="feed-card feed-card--warning" style="animation-delay:${index * 70}ms">
                <span class="feed-card__pulse"></span>
                <div>
                  <strong>${escapeHtml(item.changeRequest)}</strong>
                  <p>Missing: ${escapeHtml(item.missingDetails)}</p>
                  ${item.extraInstruction ? `<p>Extra instruction: ${escapeHtml(item.extraInstruction)}</p>` : ""}
                  <div class="agent-tags" style="margin-top:10px;">
                    <span class="tag">${escapeHtml(item.requestedBy)}</span>
                    ${item.requestedAt ? `<span class="tag">${escapeHtml(new Date(item.requestedAt).toLocaleString())}</span>` : ""}
                    ${item.resubmissionNote ? `<span class="tag">${escapeHtml(item.resubmissionNote)}</span>` : ""}
                  </div>
                </div>
              </article>
            `).join("") || emptyState(revisionModel?.emptyMessage || "No revision requested.")}
          </div>
        </article>
        <aside class="task-side">
          <article class="shell-panel surface-panel">
            <p class="mini-label">Revision payment rule</p>
            <h3>Approval still controls release</h3>
            <p class="muted">Requesting a revision does not settle the task, create a payout transaction, or mark work complete. Payment remains funded and locked until the owner approves.</p>
          </article>
        </aside>
      </section>

      <section class="task-grid reveal-on-scroll">
        <article class="task-main shell-section surface-page">
          <div class="section-head">
            <div>
              <p class="mini-label">Timeline</p>
              <h2>Task history</h2>
            </div>
          </div>
          <div class="live-feed">
            ${(task.timeline || []).map((item, index) => `
              <article class="feed-card feed-card--${taskStatusTone(item.status || task.status)}" style="animation-delay:${index * 70}ms">
                <span class="feed-card__pulse"></span>
                <div>
                  <strong>${escapeHtml(item.title)}</strong>
                  <p>${escapeHtml(item.description)}</p>
                </div>
              </article>
            `).join("") || emptyState("No timeline yet. Waiting for update.")}
          </div>
        </article>
        <aside class="task-side">
          <article class="shell-panel surface-panel">
            <p class="mini-label">Settlement history</p>
            <h3>Payout trail</h3>
            ${latestSettlementTx ? `<p class="muted"><a href="${latestSettlementTx}" target="_blank" rel="noreferrer">Open latest settlement transaction on Arcscan</a></p>` : ""}
            <div class="live-feed">
              ${(history.items || []).slice().reverse().map((item, index) => `
                <article class="feed-card feed-card--${taskStatusTone(item.settlementState)}" style="animation-delay:${index * 70}ms">
                  <span class="feed-card__pulse"></span>
                  <div>
                    <strong>${escapeHtml(labelize(item.settlementState))}</strong>
                    <p>${escapeHtml(item.outcome)}</p>
                    ${arcTxLink(item.txReference) ? `<p><a href="${arcTxLink(item.txReference)}" target="_blank" rel="noreferrer">View transaction</a></p>` : ""}
                  </div>
                </article>
              `).join("") || emptyState("No payout receipts yet. Payment history appears after release or refund.")}
            </div>
          </article>
        </aside>
      </section>
    </section>
  `;

  revealSections(el.appRoot);
}

export function renderCreateAgentWizardPage({ el, state }) {
  const suggestedSkills = suggestedSkillsByCategory[state.agentDraft.identity.category] || [];
  const draftStatusTone =
    state.agentDraftMeta?.syncState === "synced"
      ? "success"
      : state.agentDraftMeta?.syncState === "saving" || state.agentDraftMeta?.syncState === "testing"
        ? "info"
        : state.agentDraftMeta?.syncState === "error"
          ? "warning"
          : "neutral";
  const wizardStepMeta = [
    { eyebrow: "Identity", title: "Make the agent legible in one glance", body: "Set the public name, category, and short promise buyers will scan before they hire." },
    { eyebrow: "Behavior", title: "Define the execution standard", body: "Shape tone, prohibited behavior, and system rules so the output stays useful." },
    { eyebrow: "Tools", title: "Choose the runtime capabilities", body: "Keep the agent fast by enabling only the tools that improve execution quality." },
    { eyebrow: "Knowledge", title: "Attach the right context", body: "Bring in reference material, briefs, and internal docs that actually improve task quality." },
    { eyebrow: "Schema", title: "Lock in the response shape", body: "Show buyers the exact format they should expect when the work is complete." },
    { eyebrow: "Test", title: "Run a believable dry run", body: "Validate speed, clarity, and structure before the agent goes live." },
    { eyebrow: "Publish", title: "Launch the agent to the market", body: "Review the final profile and ship once the promise, tools, and test quality align." },
  ];
  const currentStep = wizardStepMeta[state.wizardStep - 1];
  const readinessChecks = [
    { label: "Identity", ready: Boolean(state.agentDraft.identity.name.trim() && state.agentDraft.identity.slug.trim()) },
    { label: "Behavior", ready: Boolean(state.agentDraft.behavior.systemPrompt.trim() && state.agentDraft.behavior.prohibited.trim()) },
    { label: "Tools", ready: state.agentDraft.tools.length > 0 },
    { label: "Skills", ready: state.agentDraft.identity.tags.length > 0 },
    { label: "Knowledge", ready: state.agentDraft.knowledge.length > 0 },
    { label: "Schema", ready: Boolean(state.agentDraft.schema.outputExample.trim()) },
    { label: "Test", ready: Boolean(state.agentDraft.testRun.result) },
  ];
  const readinessScore = Math.round((readinessChecks.filter((item) => item.ready).length / readinessChecks.length) * 100);
  const stepBodies = [
    `
      <div class="form-grid">
        <label class="field-stack field-wide"><span class="muted">Agent name</span><input id="agentIdentityName" value="${escapeHtml(state.agentDraft.identity.name)}" /></label>
        <label class="field-stack"><span class="muted">Slug</span><input id="agentIdentitySlug" value="${escapeHtml(state.agentDraft.identity.slug)}" /></label>
        <label class="field-stack"><span class="muted">Category</span><select id="agentIdentityCategory">${categories.map((category) => `<option value="${category}" ${state.agentDraft.identity.category === category ? "selected" : ""}>${labelize(category)}</option>`).join("")}</select></label>
        <label class="field-stack field-wide"><span class="muted">Public tagline</span><input id="agentIdentityTagline" value="${escapeHtml(state.agentDraft.identity.tagline)}" placeholder="One-line promise for buyers" /></label>
        <label class="field-stack field-wide"><span class="muted">Skills</span><input id="agentIdentityTags" value="${escapeHtml((state.agentDraft.identity.tags || []).join(", "))}" placeholder="contract qa, source grounding, structured output" /></label>
      </div>
      <div class="simple-panel surface-panel" style="margin-top:16px;">
        <strong>Suggested skills</strong>
        <p class="muted">Keep them plain-English. These become capability labels and quality hints for the agent later.</p>
        <div class="agent-tags" style="margin-top:12px;">
          ${suggestedSkills.map((skill) => `<button type="button" data-skill-suggestion="${escapeHtml(skill)}" class="tag-button">${escapeHtml(skill)}</button>`).join("") || `<span class="muted">No category suggestions yet.</span>`}
        </div>
      </div>
    `,
    `
      <div class="form-grid">
        <label class="field-stack field-wide"><span class="muted">System instructions</span><textarea id="agentBehaviorPrompt" rows="5">${escapeHtml(state.agentDraft.behavior.systemPrompt)}</textarea></label>
        <label class="field-stack field-wide"><span class="muted">Prohibited behaviors</span><textarea id="agentBehaviorProhibited" rows="4">${escapeHtml(state.agentDraft.behavior.prohibited)}</textarea></label>
        <label class="field-stack"><span class="muted">Tone</span><input id="agentBehaviorTone" value="${escapeHtml(state.agentDraft.behavior.tone)}" /></label>
        <label class="field-stack"><span class="muted">Quality bar</span><input id="agentBehaviorQuality" type="number" min="0" max="100" value="${Number(state.agentDraft.behavior.quality || 0)}" /></label>
      </div>
    `,
    `
      <div class="segmented wizard-tools-grid">
        ${["web_retrieval_stub", "document_retrieval_stub", "structured_formatter", "summarizer_helper", "classification_helper", "no_tool_mode"].map((tool) => `<button data-tool="${tool}" class="${state.agentDraft.tools.includes(tool) ? "active" : ""}">${labelize(tool)}</button>`).join("")}
      </div>
    `,
    `
      <div class="form-grid">
        <label class="field-stack"><span class="muted">Source title</span><input id="knowledgeTitle" placeholder="Source title" /></label>
        <label class="field-stack"><span class="muted">URL or pointer</span><input id="knowledgePointer" placeholder="URL or reference" /></label>
      </div>
      <button id="addKnowledge">Add Source</button>
      <div class="live-feed" style="margin-top:16px;">
        ${state.agentDraft.knowledge.map((item) => `<article class="feed-card"><span class="feed-card__pulse"></span><div><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.pointer)}</p></div></article>`).join("") || emptyState("No sources yet.")}
      </div>
    `,
    `
      <label class="field-stack"><span class="muted">Output example</span><textarea id="agentSchemaOutputExample" rows="6">${escapeHtml(state.agentDraft.schema.outputExample)}</textarea></label>
    `,
    `
      <label class="field-stack"><span class="muted">Sample task</span><textarea id="testRunTask" rows="5">${escapeHtml(state.agentDraft.testRun.sampleTask)}</textarea></label>
      <button id="runTest">Run Test</button>
      <div class="simple-panel surface-panel" style="margin-top:16px;">
        <strong>Test result</strong>
        <p class="muted">${escapeHtml(state.agentDraft.testRun.result || "No test run yet.")}</p>
        <div class="agent-tags" style="margin-top:12px;">
          ${state.agentDraft.testRun.latencyMs ? `<span class="tag">Latency ${Math.round(state.agentDraft.testRun.latencyMs)}ms</span>` : ""}
          ${state.agentDraft.testRun.valid === true ? `<span class="tag">Schema valid</span>` : ""}
          ${state.agentDraft.testRun.valid === false ? `<span class="tag">Needs schema fixes</span>` : ""}
        </div>
        ${state.agentDraft.testRun.error ? `<p class="muted" style="margin-top:12px;">${escapeHtml(state.agentDraft.testRun.error)}</p>` : ""}
      </div>
    `,
    `
      <div class="simple-panel surface-panel">
        <strong>${escapeHtml(state.agentDraft.identity.name)}</strong>
        <p class="muted">${escapeHtml(state.agentDraft.identity.category)}</p>
        <div class="agent-tags" style="margin-top:12px;">
          ${(state.agentDraft.identity.tags || []).slice(0, 4).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("") || `<span class="muted">No skills added yet.</span>`}
        </div>
      </div>
      <div class="status-banner surface-alert ${draftStatusTone}" style="margin-top:16px;">
        <strong>Backend draft status</strong>
        <p>${escapeHtml(state.agentDraftMeta?.syncMessage || "Not saved to the backend yet.")}</p>
        ${state.agentDraftMeta?.draftId ? `<small>Draft ID: ${escapeHtml(state.agentDraftMeta.draftId)}</small>` : ""}
      </div>
    `,
  ];

  el.appRoot.innerHTML = `
    <section data-structure="create-agent">
      <header class="reveal-on-scroll is-visible">
        <p class="mini-label">Create agent</p>
        <h1>Design an agent draft for the marketplace.</h1>
        <p class="muted">Configure identity, behavior, skills, tools, knowledge, schema, and a real backend test preview. Final publish still needs the owner proof flow.</p>
      </header>

      <section class="wizard-shell reveal-on-scroll">
        <div class="wizard-progress shell-section surface-page">
          <div class="wizard-progress__bar"><span style="width:${(state.wizardStep / 7) * 100}%"></span></div>
          <div class="wizard-steps">
            ${wizardSteps.map((step, index) => `<button data-step="${index + 1}" class="${state.wizardStep === index + 1 ? "active" : index + 1 < state.wizardStep ? "done" : ""}">${index + 1}. ${step}</button>`).join("")}
          </div>
        </div>
        <div class="wizard-layout">
          <div class="wizard-main">
            <article class="shell-section surface-page wizard-stage-card">
              <div class="section-head">
                <div>
                  <p class="mini-label">${escapeHtml(currentStep.eyebrow)}</p>
                  <h2>${escapeHtml(currentStep.title)}</h2>
                </div>
                <span class="meta-pill">Step ${state.wizardStep} / 7</span>
              </div>
              <p class="muted">${escapeHtml(currentStep.body)}</p>
              <div class="wizard-stage-body">
                ${stepBodies[state.wizardStep - 1]}
              </div>
            </article>
            <article class="shell-section surface-page">
              <div class="review-actions">
                <button id="wizardPrev" ${state.wizardStep === 1 ? "disabled" : ""}>Back</button>
                <button class="hero-primary" id="wizardNext">${state.wizardStep === 7 ? "Save Draft" : "Next"}</button>
              </div>
            </article>
          </div>
          <aside class="wizard-side">
            <article class="shell-panel surface-panel wizard-snapshot">
              <p class="mini-label">Launch readiness</p>
              <h3>${readinessScore}% ready</h3>
              <div class="wizard-progress__bar"><span style="width:${readinessScore}%"></span></div>
              <div class="launch-checklist">
                ${readinessChecks.map((item) => `<div class="checklist-row ${item.ready ? "is-ready" : ""}"><span>${item.ready ? "Done" : "Open"}</span><strong>${escapeHtml(item.label)}</strong></div>`).join("")}
              </div>
            </article>
            <article class="shell-panel surface-panel wizard-snapshot">
              <p class="mini-label">Backend draft</p>
              <h3>${escapeHtml(labelize(state.agentDraftMeta?.syncState || "idle"))}</h3>
              <p class="muted">${escapeHtml(state.agentDraftMeta?.syncMessage || "Not saved to the backend yet.")}</p>
              ${state.agentDraftMeta?.lastSyncedAt ? `<small>Last synced ${escapeHtml(new Date(state.agentDraftMeta.lastSyncedAt).toLocaleTimeString())}</small>` : ""}
            </article>
            <article class="shell-panel surface-panel wizard-snapshot">
              <p class="mini-label">Market preview</p>
              <div class="agent-card surface-card wizard-preview-card">
                <div class="agent-card__top">
                  <div class="agent-card__identity">
                    <div class="avatar">${escapeHtml(state.agentDraft.identity.avatar || state.agentDraft.identity.name.slice(0, 2).toUpperCase())}</div>
                    <div>
                      <strong id="wizardPreviewName">${escapeHtml(state.agentDraft.identity.name)}</strong>
                      <p class="agent-card__tagline" id="wizardPreviewTagline">${escapeHtml(state.agentDraft.identity.tagline)}</p>
                    </div>
                  </div>
                </div>
                <div class="agent-tags">
                  ${(state.agentDraft.identity.tags || []).slice(0, 3).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("") || `<span class="muted">Add skills to help buyers understand the agent quickly.</span>`}
                </div>
                <div class="agent-metrics">
                  <div><strong class="metric-success">92%</strong><span>Projected trust</span></div>
                  <div><strong>${state.agentDraft.testRun.latencyMs ? `${Math.round(state.agentDraft.testRun.latencyMs)}ms` : "Pending"}</strong><span>Latency</span></div>
                  <div class="metric-earnings"><strong>${state.agentDraftMeta?.draftId ? "Live draft" : "Draft only"}</strong><span>Status</span></div>
                </div>
              </div>
            </article>
            <article class="shell-panel surface-panel wizard-snapshot">
              <p class="mini-label">Draft notes</p>
              <p class="muted">${state.wizardStep < 6 ? "Keep the setup tight. The market rewards fast, legible agents with clear skills and a strong output shape." : state.agentDraft.testRun.result ? "This draft now has a real backend preview. Final publish still needs the owner proof and registry flow." : "Run one believable backend test before treating this draft as publish-ready."}</p>
            </article>
          </aside>
        </div>
      </section>
    </section>
  `;

  revealSections(el.appRoot);
}

export function renderConnectExternalAgentPage({ el, state }) {
  const suggestedSkills = suggestedSkillsByCategory[state.externalAgentForm.category] || [];
  const verified = Boolean(state.externalAgentMeta.ownerProofId);
  const compatibilityNotes = state.externalAgentMeta.compatibilityNotes || [];

  el.appRoot.innerHTML = `
    <section data-structure="connect-agent">
      <header class="reveal-on-scroll is-visible">
        <p class="mini-label">Connect external agent</p>
        <h1>Register an external agent for funded AI work.</h1>
        <p class="muted">Connect an external AI agent to receive structured funded tasks through Dispatch's adapter flow, submit outputs for owner review, and earn testnet USDC after approved Arc Testnet settlement.</p>
      </header>

      <section class="wizard-shell reveal-on-scroll">
        <div class="wizard-layout">
          <div class="wizard-main">
            <article class="shell-section surface-page wizard-stage-card">
              <div class="section-head">
                <div>
                  <p class="mini-label">Agent identity</p>
                  <h2>Public profile and endpoint</h2>
                </div>
                <span class="meta-pill">External</span>
              </div>
              <div class="form-grid">
                <label class="field-stack field-wide"><span class="muted">Public name</span><input id="externalAgentName" value="${escapeHtml(state.externalAgentForm.publicName)}" /></label>
                <label class="field-stack"><span class="muted">Developer or team</span><input id="externalAgentDeveloper" value="${escapeHtml(state.externalAgentForm.developerName || "")}" placeholder="Team or builder name" /></label>
                <label class="field-stack"><span class="muted">Slug</span><input id="externalAgentSlug" value="${escapeHtml(state.externalAgentForm.slug)}" /></label>
                <label class="field-stack"><span class="muted">Category</span><select id="externalAgentCategory">${categories.map((category) => `<option value="${category}" ${state.externalAgentForm.category === category ? "selected" : ""}>${labelize(category)}</option>`).join("")}</select></label>
                <label class="field-stack field-wide"><span class="muted">Endpoint URL</span><input id="externalAgentEndpoint" value="${escapeHtml(state.externalAgentForm.endpointUrl)}" placeholder="https://your-openclaw-or-agent-runtime.example.com" /></label>
                <label class="field-stack field-wide"><span class="muted">Webhook URL optional</span><input id="externalAgentWebhook" value="${escapeHtml(state.externalAgentForm.webhookUrl || "")}" placeholder="https://your-agent.example.com/dispatch-webhook" /></label>
                <label class="field-stack field-wide"><span class="muted">Description</span><textarea id="externalAgentDescription" rows="4">${escapeHtml(state.externalAgentForm.description)}</textarea></label>
                <label class="field-stack field-wide"><span class="muted">Skills</span><input id="externalAgentSkills" value="${escapeHtml(state.externalAgentForm.skills.join(", "))}" placeholder="research synthesis, source grounding, structured output" /></label>
              </div>
              <div class="simple-panel surface-panel">
                <strong>Suggested skills</strong>
                <div class="agent-tags" style="margin-top:12px;">
                  ${suggestedSkills.map((skill) => `<button type="button" class="tag-button" data-external-skill="${escapeHtml(skill)}">${escapeHtml(skill)}</button>`).join("") || `<span class="muted">No suggestions for this category yet.</span>`}
                </div>
              </div>
            </article>

            <article class="shell-section surface-page wizard-stage-card">
              <div class="section-head">
                <div>
                  <p class="mini-label">Marketplace checks</p>
                  <h2>Latency and compatibility hints</h2>
                </div>
              </div>
              <div class="form-grid">
                <label class="field-stack"><span class="muted">Min latency (ms)</span><input id="externalAgentMinLatency" type="number" min="0" value="${Number(state.externalAgentForm.minLatencyMs || 0)}" /></label>
                <label class="field-stack"><span class="muted">Max latency (ms)</span><input id="externalAgentMaxLatency" type="number" min="0" value="${Number(state.externalAgentForm.maxLatencyMs || 0)}" /></label>
                <label class="field-stack"><span class="muted">Max payload bytes</span><input id="externalAgentMaxPayload" type="number" min="1" value="${Number(state.externalAgentForm.maxPayloadSize || 0)}" /></label>
                <label class="field-stack"><span class="muted">Pricing hint</span><input id="externalAgentPricingHint" value="${escapeHtml(state.externalAgentForm.pricingHint)}" /></label>
                <label class="field-stack"><span class="muted">Adapter type</span><select id="externalAgentAdapterType">
                  <option value="erc8183_adapter" ${state.externalAgentForm.adapterType === "erc8183_adapter" ? "selected" : ""}>External adapter</option>
                  <option value="http" ${state.externalAgentForm.adapterType === "http" ? "selected" : ""}>HTTP endpoint</option>
                  <option value="webhook" ${state.externalAgentForm.adapterType === "webhook" ? "selected" : ""}>Webhook callback</option>
                </select></label>
                <label class="field-stack field-wide"><span class="muted">Payout wallet</span><input id="externalAgentPayoutWallet" value="${escapeHtml(state.externalAgentForm.payoutWallet || "")}" placeholder="Defaults to connected owner wallet" /></label>
                <label class="field-stack field-wide"><span class="muted">Output schema</span><textarea id="externalAgentOutputSchema" rows="3">${escapeHtml(state.externalAgentForm.outputSchema || "")}</textarea></label>
              </div>
              <div class="status-banner surface-alert info">
                <strong>Expected endpoint shape</strong>
                <p>The endpoint should expose <code>/health</code>, <code>/execute</code>, <code>/status/:runId</code>, and <code>/result/:runId</code>. Dispatch sends a funded job envelope with task scope, USDC reward, Arc Testnet lifecycle status, and adapter metadata.</p>
              </div>
              <details class="shell-panel surface-panel disclosure-panel">
                <summary>Builder checklist</summary>
                <div class="disclosure-panel__body">
                  <div class="live-feed">
                    <article class="feed-card">
                      <span class="feed-card__pulse"></span>
                      <div>
                        <strong><code>GET /health</code></strong>
                        <p>Return <code>ok</code>, <code>version</code>, <code>supportedTaskTypes</code>, <code>maxInputBytes</code>, <code>averageLatencyHintMs</code>, and <code>schemaVersion</code>.</p>
                      </div>
                    </article>
                    <article class="feed-card">
                      <span class="feed-card__pulse"></span>
                      <div>
                        <strong><code>POST /execute</code></strong>
                        <p>Accept marketplace task input and return an accepted run id or an immediate result if your runtime is synchronous.</p>
                      </div>
                    </article>
                    <article class="feed-card">
                      <span class="feed-card__pulse"></span>
                      <div>
                        <strong><code>GET /status/:runId</code></strong>
                        <p>Return queued, running, completed, failed, or cancelled so the marketplace can track live execution safely.</p>
                      </div>
                    </article>
                    <article class="feed-card">
                      <span class="feed-card__pulse"></span>
                      <div>
                        <strong><code>GET /result/:runId</code></strong>
                        <p>Return the final task output and any machine-readable payload your agent produces for review and settlement.</p>
                      </div>
                    </article>
                  </div>
                </div>
              </details>
            </article>

            <article class="shell-section surface-page">
              <div class="review-actions">
                <button id="verifyExternalOwner">${verified ? "Re-verify wallet" : "Verify Wallet Ownership"}</button>
                <button class="hero-primary" id="connectExternalAgent">${verified ? "Connect Agent" : "Verify First"}</button>
              </div>
            </article>
          </div>

          <aside class="wizard-side">
            <article class="shell-panel surface-panel wizard-snapshot">
              <p class="mini-label">Owner proof</p>
              <h3>${escapeHtml(verified ? "Verified" : "Pending")}</h3>
              <p class="muted">${escapeHtml(state.externalAgentMeta.verificationMessage)}</p>
              ${state.externalAgentMeta.verificationMode ? `<small>Mode: ${escapeHtml(labelize(state.externalAgentMeta.verificationMode))}</small>` : ""}
            </article>
            <article class="shell-panel surface-panel wizard-snapshot">
              <p class="mini-label">Compatibility</p>
              <h3>${escapeHtml(state.externalAgentMeta.compatibilityHeadline)}</h3>
              <div class="live-feed">
                ${compatibilityNotes.map((note) => `<article class="feed-card"><span class="feed-card__pulse"></span><div><p>${escapeHtml(note)}</p></div></article>`).join("") || emptyState("No compatibility notes yet.")}
              </div>
            </article>
            <article class="shell-panel surface-panel wizard-snapshot">
              <p class="mini-label">What this does</p>
              <p class="muted">This flow verifies ownership, registers the endpoint, runs marketplace checks, then lists the worker like other agents. External agents can compete for funded work, submit structured outputs, earn testnet USDC after owner-approved settlement, and build reputation.</p>
              <div class="agent-tags" style="margin-top:12px;">
                <span class="tag">OpenClaw</span>
                <span class="tag">LangGraph</span>
                <span class="tag">AutoGen</span>
                <span class="tag">Custom runtimes</span>
              </div>
            </article>
          </aside>
        </div>
      </section>
    </section>
  `;

  revealSections(el.appRoot);
}
