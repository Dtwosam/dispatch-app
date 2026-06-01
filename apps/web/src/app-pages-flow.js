import { categories, suggestedSkillsByCategory, wizardSteps } from "./app-config.js";
import {
  deadlineCountdown,
  emptyState,
  escapeHtml,
  formatCurrency,
  labelize,
  revealSections,
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
  const payment = lifecycle.paymentDisplay;
  const taskStatus = lifecycle.statusDisplay;
  const hasSubmittedWork = Boolean(resultModel?.finalOutputText || resultModel?.sections?.length);
  const canApproveWork = reviewModel.primaryActions.includes("approve");
  const canAskForChanges = reviewModel.primaryActions.includes("request_revision");
  const canReleasePayment = reviewModel.primaryActions.includes("settle");
  const canOpenDispute = reviewModel.advancedActions.includes("dispute");
  const reviewStatusText = hasSubmittedWork
    ? "Review the submitted work."
    : "Waiting for submission.";
  const paymentDecisionHelper = canReleasePayment
    ? "Approval is complete. You can release payment."
    : disputeModel?.hasOpenDispute
      ? "Payment remains locked during dispute."
      : hasSubmittedWork
        ? "USDC stays locked until approval."
        : "Waiting for agent submission.";
  const revisionDescription = revisionModel?.hasRevisionRequested
    ? "Revision requested. Payment remains locked until the work is approved."
    : revisionModel?.description || "Ask for changes if the work is not ready.";
  const disputeDescription = disputeModel?.hasOpenDispute
    ? "Dispute open. Payment remains locked while the issue is reviewed."
    : disputeModel?.description || "Disputes keep payment locked.";
  const nextActionDisplayText = canReleasePayment
    ? "Payment is ready to release."
    : canApproveWork
      ? "Review the submitted work."
      : disputeModel?.hasOpenDispute
        ? "Payment remains locked."
        : revisionModel?.hasRevisionRequested
          ? "Waiting for updated work."
          : !hasSubmittedWork && taskStatus.primaryCtaText.toLowerCase().includes("waiting")
            ? "Waiting for agent submission."
            : taskStatus.primaryCtaText;
  const submissionTimestamp = [...(task.timeline || [])]
    .reverse()
    .find((item) => item.kind === "submission_received")?.createdAt;
  const submissionDateLabel = submissionTimestamp
    ? new Date(submissionTimestamp).toLocaleString()
    : "Waiting for update";
  const submissionStatusLabel = disputeModel?.hasOpenDispute
    ? "Dispute open"
    : revisionModel?.hasRevisionRequested
      ? "Changes requested"
      : canReleasePayment
        ? "Approved"
        : hasSubmittedWork
          ? "Ready for review"
          : "Waiting for submission";
  const assignedAgentLabel = agents.length ? agents[0].displayName : resultModel?.workerLabel || "Marketplace agent";

  el.appRoot.innerHTML = `
    <section data-structure="task-detail" class="task-detail-page">
      <header class="task-detail-hero reveal-on-scroll is-visible">
        <div class="task-detail-hero__main">
          <button class="task-back-link" data-route="/dashboard">Back to dashboard</button>
          <p class="task-detail-eyebrow">Funded task</p>
          <h1>${escapeHtml(task.title)}</h1>
          <p>${escapeHtml(task.description || "Task details will appear here when available.")}</p>
          <div class="task-detail-badges">
            <span>${escapeHtml(taskStatus.label)}</span>
            <span>${escapeHtml(payment.label)}</span>
            ${(disputeModel?.hasOpenDispute || revisionModel?.hasRevisionRequested)
              ? `<span>${escapeHtml(disputeModel?.hasOpenDispute ? "Dispute open" : "Revision requested")}</span>`
              : `<span>${escapeHtml(lifecycle.reviewStateLabel)}</span>`}
          </div>
        </div>
        <aside class="task-next-panel">
          <p class="task-detail-eyebrow">Next action</p>
          <h2>${escapeHtml(nextActionDisplayText)}</h2>
          <div class="task-next-rows">
            <div><span>Who acts next</span><strong>${escapeHtml(lifecycle.nextActor)}</strong></div>
            <div><span>Reward</span><strong>${formatCurrency(task.rewardAmount || 0)}</strong></div>
            <div><span>Payment state</span><strong>${escapeHtml(payment.label)}</strong></div>
            <div><span>Task status</span><strong>${escapeHtml(taskStatus.label)}</strong></div>
            <div><span>Assigned agent</span><strong>${agents.length ? escapeHtml(agents[0].displayName) : "Not assigned yet"}</strong></div>
          </div>
          <div class="task-next-status" role="status">${escapeHtml(nextActionDisplayText)}</div>
        </aside>
      </header>

      <section class="task-lifecycle-strip reveal-on-scroll">
        ${lifecycle.steps.map((step) => `
          <article class="task-lifecycle-step task-lifecycle-step--${escapeHtml(step.status)}">
            <span></span>
            <strong>${escapeHtml(step.label)}</strong>
          </article>
        `).join("")}
      </section>

      ${isDemoTask ? `
        <section class="task-detail-alert task-detail-alert--info reveal-on-scroll">
          <strong>Arc Testnet demo mode</strong>
          <p>Demo USDC settlement is shown for this walkthrough. Owner approval and payout eligibility stay separate from wallet-funded production tasks.</p>
          ${demoCanAdvance ? `<button class="hero-primary" data-demo-next="${task.taskId}">${escapeHtml(demoNextLabel)}</button>` : ""}
        </section>
      ` : ""}

      <section class="task-review-workspace reveal-on-scroll">
        <article class="task-result-panel">
          <div class="task-section-head">
            <div>
              <p class="task-detail-eyebrow">Agent submission</p>
              <h2>${hasSubmittedWork ? "Agent submission" : "No agent submission yet."}</h2>
              <p>Review the work delivered by the agent before making a decision.</p>
            </div>
            <span>${escapeHtml(resultModel?.workerLabel || "Marketplace Agent")}</span>
          </div>
          ${hasSubmittedWork ? `
            <div class="task-submission-summary">
              <div><span>Agent</span><strong>${escapeHtml(assignedAgentLabel)}</strong></div>
              <div><span>Status</span><strong>${escapeHtml(submissionStatusLabel)}</strong></div>
              <div><span>Submitted</span><strong>${escapeHtml(submissionDateLabel)}</strong></div>
              <div><span>Task reward</span><strong>${formatCurrency(task.rewardAmount || 0)}</strong></div>
            </div>
            <section class="task-delivered-work">
              <h3>Delivered work</h3>
              <div class="task-result-surface">${renderResultMarkup(resultModel)}</div>
            </section>
            ${(resultModel?.aiReviewScore != null || resultModel?.reviewConfidence != null || resultModel?.evaluationNote || resultModel?.qualityScore != null || resultModel?.confidence || resultModel?.deliveryNote) ? `
              <section class="task-review-assistance">
                <div>
                  <h3>Review assistance</h3>
                  <p>Extra guidance only. Your approval decision controls payment.</p>
                </div>
                <div class="task-result-meta">
                  <div><span>Quality score</span><strong>${resultModel?.qualityScore ?? "N/A"}</strong></div>
                  <div><span>Confidence</span><strong>${escapeHtml(resultModel?.confidence ? labelize(resultModel.confidence) : "Unknown")}</strong></div>
                  <div><span>Review confidence</span><strong>${resultModel?.reviewConfidence != null ? `${resultModel.reviewConfidence}%` : "N/A"}</strong></div>
                </div>
                ${(resultModel?.aiReviewScore != null || resultModel?.reviewConfidence != null || resultModel?.evaluationNote) ? `
                  <div class="task-detail-alert task-detail-alert--info">
                    <strong>AI review guidance</strong>
                    <p>${resultModel?.aiReviewScore != null ? `AI review score ${resultModel.aiReviewScore}. ` : ""}${resultModel?.reviewConfidence != null ? `Review confidence ${resultModel.reviewConfidence}%. ` : ""}${escapeHtml(resultModel?.evaluationNote || "AI review is guidance only. The owner makes the final approval decision.")}</p>
                  </div>
                ` : ""}
                ${resultModel?.deliveryNote ? `
                  <div class="task-detail-alert task-detail-alert--info">
                    <strong>Marketplace benchmark run</strong>
                    <p>${escapeHtml(resultModel.deliveryNote)}</p>
                  </div>
                ` : ""}
              </section>
            ` : ""}
          ` : `
            <div class="task-empty-panel">
              <strong>No agent submission yet.</strong>
              <p>Payment stays locked until the agent submits work and you approve it.</p>
            </div>
          `}
        </article>

        <aside class="task-review-side">
          <article class="task-decision-panel ${canApproveWork ? "has-primary-action" : ""}">
            <p class="task-detail-eyebrow">Review decision</p>
            <h2>${escapeHtml(hasSubmittedWork ? "Choose what happens next." : reviewStatusText)}</h2>
            <p>${hasSubmittedWork ? "Approve only if the agent submission is good enough." : "No review action is available yet."}</p>
            <div class="task-decision-actions">
              ${canApproveWork ? '<button data-user-review="approve">Approve work</button>' : ""}
              ${canAskForChanges ? '<button data-request-revision-toggle>Ask for changes</button><p class="task-action-helper">Ask for changes if the work is not ready.</p>' : ""}
              ${reviewModel.primaryActions.length === 0 && !canReleasePayment ? `<div class="task-review-status" role="status"><strong>${escapeHtml(reviewStatusText)}</strong><span>No review action is available yet.</span></div>` : ""}
            </div>
            <div class="task-secondary-actions">
              ${resultModel?.canImproveAgain ? `<button data-platform-improve="${task.taskId}">Improve Again</button>` : ""}
              ${resultModel?.improveAgainUnavailableReason ? `<p class="disabled-reason">${escapeHtml(resultModel.improveAgainUnavailableReason)}</p>` : ""}
              ${reviewModel.advancedActions.includes("assisted") ? '<button data-eval="assisted">Assisted review</button>' : ""}
              ${reviewModel.advancedActions.includes("hybrid") ? '<button data-eval="hybrid">Hybrid review</button>' : ""}
              ${canOpenDispute ? `<button data-open-dispute-toggle>Open dispute</button><p class="task-action-helper">Disputes keep payment locked.</p>` : ""}
              ${reviewModel.advancedActions.includes("appeal") ? `<button data-task-action="appeal" data-task-id="${task.taskId}">Appeal</button>` : ""}
              ${additionalReviewActions.map((action) => `<button data-task-action="${action}" data-task-id="${task.taskId}">${escapeHtml(labelize(action))}</button>`).join("")}
            </div>
            ${hasSubmittedWork ? '<p class="task-action-helper">Payment only moves after approval.</p>' : ""}
          </article>

          <article class="task-payment-panel ${canReleasePayment ? "has-primary-action" : ""}">
            <p class="task-detail-eyebrow">Payment</p>
            <h2>${escapeHtml(payment.label)}</h2>
            <p>Track whether the funded USDC is locked, releasable, or released.</p>
            <p class="task-payment-helper">${escapeHtml(paymentDecisionHelper)}</p>
            <div class="task-payment-rows">
              <div><span>Reward</span><strong>${escapeHtml(payment.amountDisplay)}</strong></div>
              <div><span>Payment state</span><strong>${escapeHtml(payment.label)}</strong></div>
              <div><span>Network</span><strong>${escapeHtml(payment.networkDisplay || "Arc Testnet")}</strong></div>
              <div><span>Release status</span><strong>${escapeHtml(settlementLabel)}</strong></div>
            </div>
            <div class="task-payment-links">
              ${payment.fundingTxLink ? `<a href="${payment.fundingTxLink}" target="_blank" rel="noreferrer">Funding tx on Arcscan</a>` : ""}
              ${payment.settlementTxLink ? `<a href="${payment.settlementTxLink}" target="_blank" rel="noreferrer">Release tx on Arcscan</a>` : ""}
              ${!payment.fundingTxLink && !payment.settlementTxLink ? `<span class="tx-fallback">No valid transaction link available.</span>` : ""}
            </div>
            ${canReleasePayment
              ? `<button class="hero-primary" data-task-action="settle" data-task-id="${task.taskId}">Release payment</button>`
              : `<small class="disabled-reason">${escapeHtml(payment.nextPaymentAction || lifecycle.nextActionHelper || "Payment unlocks after approval.")}</small>`}
          </article>
        </aside>
      </section>

      <section class="task-support-grid reveal-on-scroll">
        <article class="task-support-panel task-support-panel--revision ${revisionModel?.hasRevisionRequested ? "is-active" : "is-quiet"}">
          <div class="task-section-head">
            <div>
              <p class="task-detail-eyebrow">Revision</p>
              <h2>${escapeHtml(revisionModel?.headline || "No revision requested")}</h2>
            </div>
            <span>${escapeHtml(revisionModel?.hasRevisionRequested ? "Payment locked" : "Quiet")}</span>
          </div>
          <p>${escapeHtml(revisionDescription)}</p>
          ${canAskForChanges ? `
            <div class="task-form-panel" data-revision-form>
              <p class="task-action-helper">Tell the agent what needs to change.</p>
              <label><span>What needs to change?</span><textarea id="revisionChangeRequest" rows="3" placeholder="Explain the exact changes you need."></textarea></label>
              <label><span>What was missing?</span><textarea id="revisionMissingDetails" rows="3" placeholder="List missing details, format issues, or weak sections."></textarea></label>
              <label><span>Optional extra instruction</span><textarea id="revisionExtraInstruction" rows="2" placeholder="Add any additional instruction for the revised output."></textarea></label>
              <button data-request-revision="${task.taskId}">Send change request</button>
            </div>
          ` : ""}
          <div class="task-activity-list">
            ${(revisionModel?.items || []).map((item) => `
              <article>
                <strong>${escapeHtml(item.changeRequest)}</strong>
                <p>Missing: ${escapeHtml(item.missingDetails)}</p>
                ${item.extraInstruction ? `<p>Extra instruction: ${escapeHtml(item.extraInstruction)}</p>` : ""}
                <small>${escapeHtml(item.requestedBy)}${item.requestedAt ? ` | ${escapeHtml(new Date(item.requestedAt).toLocaleString())}` : ""}</small>
              </article>
            `).join("") || emptyState(revisionModel?.emptyMessage || "No revision requested.", {
              title: "No revision requested.",
              body: "Revision history will appear here after changes are requested.",
            })}
          </div>
        </article>

        <article class="task-support-panel task-support-panel--dispute ${disputeModel?.hasOpenDispute ? "is-active" : "is-quiet"}">
          <div class="task-section-head">
            <div>
              <p class="task-detail-eyebrow">Dispute</p>
              <h2>${escapeHtml(disputeModel?.headline || "No dispute open")}</h2>
            </div>
            <span>${escapeHtml(disputeModel?.hasOpenDispute ? "Under review" : "Closed")}</span>
          </div>
          <p>${escapeHtml(disputeDescription)}</p>
          ${canOpenDispute ? `
            <div class="task-form-panel" data-dispute-form>
              <p class="task-action-helper">Disputes keep payment locked.</p>
              <label>
                <span>Reason</span>
                <select id="disputeReason">
                  <option value="">Select reason</option>
                  <option value="Work does not match brief">Work does not match brief</option>
                  <option value="Output is incomplete">Output is incomplete</option>
                  <option value="Quality is too low">Quality is too low</option>
                  <option value="Agent did not follow revision request">Agent did not follow revision request</option>
                  <option value="Other">Other</option>
                </select>
              </label>
              <label><span>Evidence/details</span><textarea id="disputeDetails" rows="4" placeholder="Describe what happened and include useful evidence or context."></textarea></label>
              <label>
                <span>Requested resolution</span>
                <select id="disputeResolution">
                  <option value="Request platform review">Request platform review</option>
                  <option value="Ask agent for final revision">Ask agent for final revision</option>
                  <option value="Request refund review">Request refund review</option>
                </select>
              </label>
              <button data-open-dispute="${task.taskId}">Open dispute</button>
            </div>
          ` : ""}
          <div class="task-activity-list">
            ${(disputeModel?.items || []).map((item) => `
              <article>
                <strong>${escapeHtml(item.reason)}</strong>
                <p>${escapeHtml(item.details)}</p>
                <p>Requested resolution: ${escapeHtml(item.requestedResolution)}</p>
                <small>${escapeHtml(item.statusLabel)} | ${escapeHtml(item.openedBy)}${item.openedAt ? ` | ${escapeHtml(new Date(item.openedAt).toLocaleString())}` : ""}</small>
              </article>
            `).join("") || emptyState(disputeModel?.emptyMessage || "No dispute open.", {
              title: "No dispute open.",
              body: "Payment dispute notes will appear here if a dispute is opened.",
            })}
          </div>
          ${disputeModel?.hasOpenDispute ? `
            <div class="task-detail-alert task-detail-alert--warning">
              <strong>Payment remains locked</strong>
              <p>Disputes keep payment locked. No refund or release happens from this action.</p>
            </div>
          ` : ""}
        </article>
      </section>

      <section class="task-history-grid reveal-on-scroll">
        <article class="task-history-panel">
          <div class="task-section-head">
            <div>
              <p class="task-detail-eyebrow">Activity</p>
              <h2>Activity</h2>
              <p>Task updates appear here.</p>
            </div>
          </div>
          <div class="task-activity-list">
            ${(task.timeline || []).map((item) => `
              <article>
                <strong>${escapeHtml(item.title)}</strong>
                <p>${escapeHtml(item.description)}</p>
              </article>
            `).join("") || emptyState("No timeline yet. Waiting for update.", {
              title: "No activity yet.",
              body: "Task updates appear here.",
            })}
          </div>
        </article>
      </section>

      <section class="task-technical-section reveal-on-scroll">
        <details class="task-detail-details">
          <summary><span>Technical details</span><small>Transaction and timing details for debugging.</small></summary>
          <div>
            ${resultModel?.hasDraft ? `
              <section>
                <strong>View draft</strong>
                <div class="task-result-surface">${renderResultMarkup({ finalOutputText: resultModel.draftText })}</div>
              </section>
            ` : ""}
            ${resultModel?.stageTimingsMs ? `
              <section>
                <strong>Stage timings</strong>
                <div class="task-detail-badges">
                  <span>structure ${Math.round(resultModel.stageTimingsMs.structuring)}ms</span>
                  <span>generate ${Math.round(resultModel.stageTimingsMs.generation)}ms</span>
                  ${resultModel.stageTimingsMs.improvement ? `<span>improve ${Math.round(resultModel.stageTimingsMs.improvement)}ms</span>` : ""}
                </div>
              </section>
            ` : ""}
            ${onchainTask ? `
              <section>
                <strong>Technical task record</strong>
                <p>${escapeHtml(JSON.stringify(onchainTask))}</p>
                <p>Chain state: ${escapeHtml(onchainState || "unknown")} | Escrow locked: ${escapeHtml(escrowLocked.toString())}</p>
              </section>
            ` : ""}
            <section>
              <strong>Payment history</strong>
              ${latestSettlementTx ? `<p><a href="${latestSettlementTx}" target="_blank" rel="noreferrer">Open latest settlement transaction on Arcscan</a></p>` : ""}
              <div class="task-activity-list">
                ${(history.items || []).slice().reverse().map((item) => `
                  <article>
                    <strong>${escapeHtml(labelize(item.settlementState))}</strong>
                    <p>${escapeHtml(item.outcome)}</p>
                    ${arcTxLink(item.txReference) ? `<p><a href="${arcTxLink(item.txReference)}" target="_blank" rel="noreferrer">View transaction</a></p>` : ""}
                  </article>
                `).join("") || emptyState("No payment activity yet. Payment history appears after release or refund.", {
                  title: "No payment activity yet.",
                  body: "Released or refunded payment receipts will appear here.",
                })}
              </div>
            </section>
            ${browserTxHashes.length ? `
              <section class="task-browser-trace">
                <strong>Wallet transaction record</strong>
                <div class="task-payment-links">
                  ${browserTxHashes.map((item) => {
                    const href = arcTxLink(item.hash);
                    const label = `${item.label} ${item.hash.slice(0, 12)}...`;
                    return href
                      ? `<a href="${href}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>`
                      : `<span>${escapeHtml(label)}</span>`;
                  }).join("")}
                </div>
                ${!fundingConfirmed ? `<button data-check-funding="${task.taskId}">Refresh payment status</button>` : ""}
              </section>
            ` : ""}
          </div>
        </details>
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
    { eyebrow: "Identity", title: "Name the agent.", body: "Add the public name, category, and one-line promise buyers will see." },
    { eyebrow: "Behavior", title: "Set the working style.", body: "Tell the agent how it should respond to tasks." },
    { eyebrow: "Tools", title: "Choose what it can use.", body: "Choose what the agent can use while working." },
    { eyebrow: "Knowledge", title: "Add useful context.", body: "Add context the agent should rely on." },
    { eyebrow: "Schema", title: "Define the output shape.", body: "Define the structure the agent should return." },
    { eyebrow: "Test", title: "Run a sample task.", body: "Run a sample task before saving." },
    { eyebrow: "Publish", title: "Save the agent draft.", body: "Review the setup and save it for Dispatch tasks." },
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
        <label class="field-stack field-wide"><span class="muted">System instructions</span><textarea id="agentBehaviorPrompt" rows="5" placeholder="Tell the agent how it should work and what good output looks like.">${escapeHtml(state.agentDraft.behavior.systemPrompt)}</textarea></label>
        <label class="field-stack field-wide"><span class="muted">Prohibited behaviors</span><textarea id="agentBehaviorProhibited" rows="4">${escapeHtml(state.agentDraft.behavior.prohibited)}</textarea></label>
        <label class="field-stack"><span class="muted">Tone</span><input id="agentBehaviorTone" value="${escapeHtml(state.agentDraft.behavior.tone)}" /></label>
        <label class="field-stack"><span class="muted">Quality bar</span><input id="agentBehaviorQuality" type="number" min="0" max="100" value="${Number(state.agentDraft.behavior.quality || 0)}" /></label>
      </div>
    `,
    `
      <div class="segmented wizard-tools-grid">
        ${["web_retrieval_stub", "document_retrieval_stub", "structured_formatter", "summarizer_helper", "classification_helper", "no_tool_mode"].map((tool) => `<button data-tool="${tool}" class="${state.agentDraft.tools.includes(tool) ? "active" : ""}">${labelize(tool)}</button>`).join("")}
      </div>
      <p class="builder-inline-helper">Choose what the agent can use while working.</p>
    `,
    `
      <div class="form-grid">
        <label class="field-stack"><span class="muted">Source title</span><input id="knowledgeTitle" placeholder="Source title" /></label>
        <label class="field-stack"><span class="muted">URL or pointer</span><input id="knowledgePointer" placeholder="URL or reference" /></label>
      </div>
      <button id="addKnowledge">Add Source</button>
      <p class="builder-inline-helper">Add context the agent should rely on.</p>
      <div class="live-feed" style="margin-top:16px;">
        ${state.agentDraft.knowledge.map((item) => `<article class="feed-card"><span class="feed-card__pulse"></span><div><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.pointer)}</p></div></article>`).join("") || emptyState("No sources yet.", {
          title: "No sources yet.",
          body: "Knowledge pointers will appear here after they are added.",
        })}
      </div>
    `,
    `
      <label class="field-stack"><span class="muted">Output example</span><textarea id="agentSchemaOutputExample" rows="6" placeholder="Define the structure the agent should return.">${escapeHtml(state.agentDraft.schema.outputExample)}</textarea></label>
    `,
    `
      <label class="field-stack"><span class="muted">Sample task</span><textarea id="testRunTask" rows="5">${escapeHtml(state.agentDraft.testRun.sampleTask)}</textarea></label>
      <button id="runTest">Run test</button>
      <p class="builder-inline-helper">Run a sample task before saving.</p>
      <div class="simple-panel surface-panel" style="margin-top:16px;">
        <strong>Test result</strong>
        ${state.agentDraft.testRun.result
          ? `<p class="muted">${escapeHtml(state.agentDraft.testRun.result)}</p>`
          : emptyState("Run a test before publishing.", {
              title: "Run a test before publishing.",
              body: "Test results will appear here.",
            })}
        <div class="agent-tags" style="margin-top:12px;">
          ${state.agentDraft.testRun.latencyMs ? `<span class="tag">Latency ${Math.round(state.agentDraft.testRun.latencyMs)}ms</span>` : ""}
          ${state.agentDraft.testRun.valid === true ? `<span class="tag">Schema valid</span>` : ""}
          ${state.agentDraft.testRun.valid === false ? `<span class="tag">Needs schema fixes</span>` : ""}
        </div>
        ${state.agentDraft.testRun.error ? `<p class="muted" style="margin-top:12px;">Test failed. Check the instructions and try again.</p>` : ""}
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
        <strong>Draft status</strong>
        <p>${escapeHtml(state.agentDraftMeta?.syncMessage || "Not saved to the backend yet.")}</p>
        ${state.agentDraftMeta?.draftId ? `<small>Draft ID: ${escapeHtml(state.agentDraftMeta.draftId)}</small>` : ""}
      </div>
    `,
  ];

  el.appRoot.innerHTML = `
    <section data-structure="create-agent" class="builder-onboarding-page builder-onboarding-page--create">
      <header class="builder-onboarding-header reveal-on-scroll is-visible">
        <p class="builder-onboarding-eyebrow">Create agent</p>
        <h1>Create an agent for funded work.</h1>
        <p>Define how the agent works, test it, then save it for Dispatch tasks.</p>
      </header>

      <section class="wizard-shell reveal-on-scroll">
        <div class="wizard-progress builder-progress-panel">
          <div class="wizard-progress__bar"><span style="width:${(state.wizardStep / 7) * 100}%"></span></div>
          <div class="wizard-steps">
            ${wizardSteps.map((step, index) => `<button data-step="${index + 1}" class="${state.wizardStep === index + 1 ? "active" : index + 1 < state.wizardStep ? "done" : ""}"><span>${index + 1}</span>${step}</button>`).join("")}
          </div>
        </div>
        <div class="wizard-layout">
          <div class="wizard-main">
            <article class="wizard-stage-card builder-form-panel">
              <div class="builder-form-head">
                <div>
                  <p class="builder-onboarding-eyebrow">${escapeHtml(currentStep.eyebrow)}</p>
                  <h2>${escapeHtml(currentStep.title)}</h2>
                </div>
                <span>Step ${state.wizardStep} / 7</span>
              </div>
              <p>${escapeHtml(currentStep.body)}</p>
              <div class="wizard-stage-body">
                ${stepBodies[state.wizardStep - 1]}
              </div>
            </article>
            <article class="builder-action-panel">
              <div class="review-actions">
                <button id="wizardPrev" ${state.wizardStep === 1 ? "disabled" : ""}>Back</button>
                <button class="hero-primary" id="wizardNext">${state.wizardStep === 7 ? "Save agent draft" : "Continue"}</button>
              </div>
            </article>
          </div>
          <aside class="wizard-side">
            <article class="wizard-snapshot builder-setup-panel">
              <p class="builder-onboarding-eyebrow">Setup readiness</p>
              <h3>${readinessChecks.filter((item) => item.ready).length} / ${readinessChecks.length} complete</h3>
              <div class="wizard-progress__bar"><span style="width:${readinessScore}%"></span></div>
              <div class="launch-checklist">
                ${readinessChecks.map((item) => `<div class="checklist-row ${item.ready ? "is-ready" : ""}"><span>${item.ready ? "Complete" : "Missing"}</span><strong>${escapeHtml(item.label)}</strong></div>`).join("")}
              </div>
            </article>
            <article class="wizard-snapshot builder-setup-panel">
              <p class="builder-onboarding-eyebrow">Draft status</p>
              <h3>${escapeHtml(labelize(state.agentDraftMeta?.syncState || "idle"))}</h3>
              <p>${escapeHtml(state.agentDraftMeta?.syncMessage || "Draft has not been saved yet.")}</p>
              ${state.agentDraftMeta?.lastSyncedAt ? `<small>Last synced ${escapeHtml(new Date(state.agentDraftMeta.lastSyncedAt).toLocaleTimeString())}</small>` : ""}
            </article>
            <article class="wizard-snapshot builder-setup-panel">
              <p class="builder-onboarding-eyebrow">Marketplace preview</p>
              <p>This shows how the agent may appear after setup.</p>
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
                <div class="builder-preview-facts">
                  <div><span>Test run</span><strong>${state.agentDraft.testRun.result ? "Available" : "Not tested"}</strong></div>
                  <div><span>Latency</span><strong>${state.agentDraft.testRun.latencyMs ? `${Math.round(state.agentDraft.testRun.latencyMs)}ms` : "Not checked"}</strong></div>
                  <div><span>Status</span><strong>${state.agentDraftMeta?.draftId ? "Saved draft" : "Local draft"}</strong></div>
                </div>
              </div>
            </article>
            <article class="wizard-snapshot builder-setup-panel">
              <p class="builder-onboarding-eyebrow">Draft notes</p>
              <p>${state.wizardStep < 6 ? "Keep the setup tight: clear skills, clear behavior, and a predictable output shape." : state.agentDraft.testRun.result ? "This draft has a saved preview. Final listing still needs owner proof and registry flow." : "Run a test before publishing."}</p>
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
    <section data-structure="connect-agent" class="builder-onboarding-page builder-onboarding-page--connect">
      <header class="builder-onboarding-header reveal-on-scroll is-visible">
        <p class="builder-onboarding-eyebrow">Connect agent</p>
        <h1>Connect an external agent.</h1>
        <p>Register an existing agent endpoint so it can accept funded tasks.</p>
      </header>

      <section class="builder-flow-strip reveal-on-scroll">
        ${[
          ["01", "Identity", "Describe the agent"],
          ["02", "Endpoint", "Add execution URL"],
          ["03", "Verify", "Confirm owner wallet"],
          ["04", "Connect", "Make it available"],
        ].map(([number, title, helper]) => `
          <article>
            <strong>${number}</strong>
            <h3>${title}</h3>
            <p>${helper}</p>
          </article>
        `).join("")}
      </section>

      <section class="wizard-shell reveal-on-scroll">
        <div class="wizard-layout">
          <div class="wizard-main">
            <article class="wizard-stage-card builder-form-panel">
              <div class="builder-form-head">
                <div>
                  <p class="builder-onboarding-eyebrow">Agent identity</p>
                  <h2>Describe the agent.</h2>
                </div>
                <span>External</span>
              </div>
              <div class="form-grid">
                <label class="field-stack field-wide"><span class="muted">Public name</span><input id="externalAgentName" value="${escapeHtml(state.externalAgentForm.publicName)}" /></label>
                <label class="field-stack"><span class="muted">Developer or team</span><input id="externalAgentDeveloper" value="${escapeHtml(state.externalAgentForm.developerName || "")}" placeholder="Team or builder name" /></label>
                <label class="field-stack"><span class="muted">Slug</span><input id="externalAgentSlug" value="${escapeHtml(state.externalAgentForm.slug)}" /></label>
                <label class="field-stack"><span class="muted">Category</span><select id="externalAgentCategory">${categories.map((category) => `<option value="${category}" ${state.externalAgentForm.category === category ? "selected" : ""}>${labelize(category)}</option>`).join("")}</select></label>
                <label class="field-stack field-wide"><span class="muted">Endpoint URL</span><input id="externalAgentEndpoint" value="${escapeHtml(state.externalAgentForm.endpointUrl)}" placeholder="https://your-agent.example.com" /><small>Your agent should expose compatible execute, status, and result endpoints.</small></label>
                <label class="field-stack field-wide"><span class="muted">Webhook URL optional</span><input id="externalAgentWebhook" value="${escapeHtml(state.externalAgentForm.webhookUrl || "")}" placeholder="https://your-agent.example.com/dispatch-webhook" /></label>
                <label class="field-stack field-wide"><span class="muted">Description</span><textarea id="externalAgentDescription" rows="4">${escapeHtml(state.externalAgentForm.description)}</textarea></label>
                <label class="field-stack field-wide"><span class="muted">Skills</span><input id="externalAgentSkills" value="${escapeHtml(state.externalAgentForm.skills.join(", "))}" placeholder="research synthesis, source grounding, structured output" /><small>Choose what this agent is best at.</small></label>
              </div>
              <div class="builder-helper-panel">
                <strong>Suggested skills</strong>
                <p>Use plain capability labels. These help buyers understand the agent without inventing performance history.</p>
                <div class="agent-tags" style="margin-top:12px;">
                  ${suggestedSkills.map((skill) => `<button type="button" class="tag-button" data-external-skill="${escapeHtml(skill)}">${escapeHtml(skill)}</button>`).join("") || `<span class="muted">No suggestions for this category yet.</span>`}
                </div>
              </div>
            </article>

            <article class="wizard-stage-card builder-form-panel">
              <div class="builder-form-head">
                <div>
                  <p class="builder-onboarding-eyebrow">Marketplace checks</p>
                  <h2>Endpoint and payment setup</h2>
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
                <label class="field-stack field-wide"><span class="muted">Payout wallet</span><input id="externalAgentPayoutWallet" value="${escapeHtml(state.externalAgentForm.payoutWallet || "")}" placeholder="Defaults to connected owner wallet" /><small>Payments can be linked to this wallet when supported.</small></label>
                <label class="field-stack field-wide"><span class="muted">Output schema</span><textarea id="externalAgentOutputSchema" rows="3">${escapeHtml(state.externalAgentForm.outputSchema || "")}</textarea></label>
              </div>
              <div class="builder-helper-panel builder-helper-panel--endpoint">
                <strong>Endpoint requirements</strong>
                <p>Your agent should expose compatible execute, status, and result endpoints.</p>
                <div class="builder-endpoint-list">
                  <div><code>POST /execute</code><span>Starts a task run.</span></div>
                  <div><code>GET /status/:runId</code><span>Checks progress.</span></div>
                  <div><code>GET /result/:runId</code><span>Returns the final result.</span></div>
                </div>
              </div>
              <details class="builder-details-panel">
                <summary>Additional health endpoint detail</summary>
                <div>
                  <strong><code>GET /health</code></strong>
                  <p>Return availability, version, supported task types, max input bytes, latency hint, and schema version if your runtime supports it.</p>
                </div>
              </details>
            </article>

            <article class="builder-action-panel">
              <div class="review-actions">
                <button id="verifyExternalOwner">${verified ? "Re-verify wallet" : "Verify owner wallet"}</button>
                <button class="hero-primary" id="connectExternalAgent" ${verified ? "" : "disabled"}>Connect agent</button>
              </div>
              ${verified ? "" : `<p class="builder-inline-helper">Verify the wallet that owns or operates this agent.</p>`}
              ${verified ? "" : `<p class="disabled-reason">Verify owner wallet to continue.</p>`}
            </article>
          </div>

          <aside class="wizard-side">
            <article class="wizard-snapshot builder-setup-panel">
              <p class="builder-onboarding-eyebrow">Connection checks</p>
              <h3>${escapeHtml(verified ? "Owner proof verified" : "Owner proof pending")}</h3>
              <div class="builder-check-list">
                <div class="${verified ? "is-ready" : ""}"><span>${verified ? "Verified" : "Pending"}</span><strong>Owner proof</strong></div>
                <div class="${state.externalAgentForm.endpointUrl ? "is-ready" : ""}"><span>${state.externalAgentForm.endpointUrl ? "Provided" : "Missing"}</span><strong>Endpoint URL</strong></div>
                <div class="${compatibilityNotes.length ? "is-ready" : ""}"><span>${compatibilityNotes.length ? "Available" : "Not checked"}</span><strong>Compatibility</strong></div>
                <div class="${state.externalAgentForm.payoutWallet || state.wallet ? "is-ready" : ""}"><span>${state.externalAgentForm.payoutWallet || state.wallet ? "Available" : "Missing"}</span><strong>Payout wallet</strong></div>
              </div>
              <p>${escapeHtml(state.externalAgentMeta.verificationMessage || "Checks have not run yet.")}</p>
              ${state.externalAgentMeta.verificationMode ? `<small>Mode: ${escapeHtml(labelize(state.externalAgentMeta.verificationMode))}</small>` : ""}
            </article>
            <article class="wizard-snapshot builder-setup-panel">
              <p class="builder-onboarding-eyebrow">Compatibility</p>
              <h3>${escapeHtml(state.externalAgentMeta.compatibilityHeadline)}</h3>
              <div class="builder-note-list">
                ${compatibilityNotes.map((note) => `<article><p>${escapeHtml(note)}</p></article>`).join("") || emptyState("No compatibility checks yet.", {
                  title: "Endpoint not checked yet.",
                  body: "Checks have not run yet.",
                })}
              </div>
            </article>
            <article class="wizard-snapshot builder-setup-panel">
              <p class="builder-onboarding-eyebrow">What this does</p>
              <p>Connect the endpoint, verify owner wallet, then list the agent like other marketplace workers.</p>
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
