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
          <h2>${escapeHtml(taskStatus.primaryCtaText)}</h2>
          <div class="task-next-rows">
            <div><span>Who acts next</span><strong>${escapeHtml(lifecycle.nextActor)}</strong></div>
            <div><span>Required action</span><strong>${escapeHtml(taskStatus.nextActionText)}</strong></div>
            <div><span>Reward</span><strong>${formatCurrency(task.rewardAmount || 0)}</strong></div>
            <div><span>Assigned agent</span><strong>${agents.length ? escapeHtml(agents[0].displayName) : "Not assigned yet"}</strong></div>
          </div>
          <div class="task-next-status" role="status">${escapeHtml(taskStatus.primaryCtaText)}</div>
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
              <p class="task-detail-eyebrow">Submitted work</p>
              <h2>${resultModel?.finalOutputText || resultModel?.sections?.length ? "Review the delivered output." : "No submitted work yet."}</h2>
            </div>
            <span>${escapeHtml(resultModel?.workerLabel || "Marketplace Agent")}</span>
          </div>
          ${resultModel?.finalOutputText || resultModel?.sections?.length ? `
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
            <div class="task-result-surface">${renderResultMarkup(resultModel)}</div>
          ` : `
            <div class="task-empty-panel">
              <strong>No submitted work yet.</strong>
              <p>Payment stays locked until work is submitted and approved.</p>
            </div>
          `}
          ${(resultModel?.hasDraft || resultModel?.stageTimingsMs || onchainSnapshot?.onchainTask) ? `
            <details class="task-detail-details">
              <summary>More result details</summary>
              <div>
                ${resultModel?.hasDraft ? `
                  <section>
                    <strong>View Draft</strong>
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
                ${onchainSnapshot?.onchainTask ? `
                  <section>
                    <strong>Technical task record</strong>
                    <p>${escapeHtml(JSON.stringify(onchainSnapshot.onchainTask))}</p>
                  </section>
                ` : ""}
              </div>
            </details>
          ` : ""}
        </article>

        <aside class="task-review-side">
          <article class="task-decision-panel">
            <p class="task-detail-eyebrow">Review decision</p>
            <h2>${escapeHtml(reviewModel.headline || taskStatus.primaryCtaText)}</h2>
            <p>Payment only moves after approval.</p>
            <div class="task-decision-actions">
              ${reviewModel.primaryActions.includes("approve") ? '<button data-user-review="approve">Approve work</button>' : ""}
              ${reviewModel.primaryActions.includes("request_revision") ? '<button data-request-revision-toggle>Ask for changes</button>' : ""}
              ${reviewModel.primaryActions.length === 0 && !reviewModel.primaryActions.includes("settle") ? `<button disabled>${escapeHtml(taskStatus.primaryCtaText)}</button>` : ""}
            </div>
            <div class="task-secondary-actions">
              ${resultModel?.canImproveAgain ? `<button data-platform-improve="${task.taskId}">Improve Again</button>` : ""}
              ${resultModel?.improveAgainUnavailableReason ? `<p class="disabled-reason">${escapeHtml(resultModel.improveAgainUnavailableReason)}</p>` : ""}
              ${reviewModel.advancedActions.includes("assisted") ? '<button data-eval="assisted">Assisted review</button>' : ""}
              ${reviewModel.advancedActions.includes("hybrid") ? '<button data-eval="hybrid">Hybrid review</button>' : ""}
              ${reviewModel.advancedActions.includes("dispute") ? `<button data-open-dispute-toggle>Open dispute</button>` : ""}
              ${reviewModel.advancedActions.includes("appeal") ? `<button data-task-action="appeal" data-task-id="${task.taskId}">Appeal</button>` : ""}
              ${additionalReviewActions.map((action) => `<button data-task-action="${action}" data-task-id="${task.taskId}">${escapeHtml(labelize(action))}</button>`).join("")}
            </div>
          </article>

          <article class="task-payment-panel">
            <p class="task-detail-eyebrow">USDC payment</p>
            <h2>${escapeHtml(payment.label)}</h2>
            <p>${escapeHtml(payment.description)}</p>
            <div class="task-payment-rows">
              <div><span>Reward</span><strong>${escapeHtml(payment.amountDisplay)}</strong></div>
              <div><span>Payment state</span><strong>${escapeHtml(payment.label)}</strong></div>
              <div><span>Network</span><strong>${escapeHtml(payment.networkDisplay || "Arc Testnet")}</strong></div>
              <div><span>Settlement</span><strong>${escapeHtml(settlementLabel)}</strong></div>
            </div>
            <div class="task-payment-links">
              ${payment.fundingTxLink ? `<a href="${payment.fundingTxLink}" target="_blank" rel="noreferrer">Funding tx on Arcscan</a>` : `<span class="tx-fallback">No valid transaction link available.</span>`}
              ${payment.settlementTxLink ? `<a href="${payment.settlementTxLink}" target="_blank" rel="noreferrer">Release tx on Arcscan</a>` : `<span class="tx-fallback">No valid transaction link available.</span>`}
            </div>
            ${reviewModel.primaryActions.includes("settle")
              ? `<button class="hero-primary" data-task-action="settle" data-task-id="${task.taskId}">Release Payment</button>`
              : `<small class="disabled-reason">${escapeHtml(payment.nextPaymentAction || lifecycle.nextActionHelper || "Payment unlocks after approval.")}</small>`}
          </article>
        </aside>
      </section>

      <section class="task-support-grid reveal-on-scroll">
        <article class="task-support-panel task-support-panel--revision">
          <div class="task-section-head">
            <div>
              <p class="task-detail-eyebrow">Revision</p>
              <h2>${escapeHtml(revisionModel?.headline || "No revision requested")}</h2>
            </div>
            <span>${escapeHtml(revisionModel?.hasRevisionRequested ? "Payment locked" : "Quiet")}</span>
          </div>
          <p>${escapeHtml(revisionModel?.description || "Ask for changes if the work is not ready.")}</p>
          ${reviewModel.primaryActions.includes("request_revision") ? `
            <div class="task-form-panel" data-revision-form>
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

        <article class="task-support-panel task-support-panel--dispute">
          <div class="task-section-head">
            <div>
              <p class="task-detail-eyebrow">Dispute</p>
              <h2>${escapeHtml(disputeModel?.headline || "No dispute open")}</h2>
            </div>
            <span>${escapeHtml(disputeModel?.hasOpenDispute ? "Under review" : "Closed")}</span>
          </div>
          <p>${escapeHtml(disputeModel?.description || "Disputes keep payment locked.")}</p>
          ${reviewModel.advancedActions.includes("dispute") ? `
            <div class="task-form-panel" data-dispute-form>
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
          <div class="task-detail-alert task-detail-alert--warning">
            <strong>Payment remains locked</strong>
            <p>Opening a dispute does not mark work complete, release USDC, refund USDC, or create a transaction hash.</p>
          </div>
        </article>
      </section>

      <section class="task-history-grid reveal-on-scroll">
        <article class="task-history-panel">
          <div class="task-section-head">
            <div>
              <p class="task-detail-eyebrow">Activity</p>
              <h2>Task history</h2>
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
              body: "Task updates and settlement events will appear here.",
            })}
          </div>
        </article>
        <aside class="task-history-panel">
          <p class="task-detail-eyebrow">Settlement history</p>
          <h2>Payout trail</h2>
          ${latestSettlementTx ? `<p><a href="${latestSettlementTx}" target="_blank" rel="noreferrer">Open latest settlement transaction on Arcscan</a></p>` : ""}
          <div class="task-activity-list">
            ${(history.items || []).slice().reverse().map((item) => `
              <article>
                <strong>${escapeHtml(labelize(item.settlementState))}</strong>
                <p>${escapeHtml(item.outcome)}</p>
                ${arcTxLink(item.txReference) ? `<p><a href="${arcTxLink(item.txReference)}" target="_blank" rel="noreferrer">View transaction</a></p>` : ""}
              </article>
            `).join("") || emptyState("No payout receipts yet. Payment history appears after release or refund.", {
              title: "No payout receipts yet.",
              body: "Released or refunded payment receipts will appear here.",
            })}
          </div>
          ${browserTxHashes.length ? `
            <div class="task-browser-trace">
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
              ${!fundingConfirmed ? `<button data-check-funding="${task.taskId}">Refresh execution status</button>` : ""}
            </div>
          ` : ""}
          ${onchainTask ? `<p>Chain state: ${escapeHtml(onchainState || "unknown")} | Escrow locked: ${escapeHtml(escrowLocked.toString())}</p>` : ""}
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
        ${state.agentDraft.knowledge.map((item) => `<article class="feed-card"><span class="feed-card__pulse"></span><div><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.pointer)}</p></div></article>`).join("") || emptyState("No sources yet.", {
          title: "No sources yet.",
          body: "Knowledge pointers will appear here after they are added.",
        })}
      </div>
    `,
    `
      <label class="field-stack"><span class="muted">Output example</span><textarea id="agentSchemaOutputExample" rows="6">${escapeHtml(state.agentDraft.schema.outputExample)}</textarea></label>
    `,
    `
      <label class="field-stack"><span class="muted">Sample task</span><textarea id="testRunTask" rows="5">${escapeHtml(state.agentDraft.testRun.sampleTask)}</textarea></label>
      <button id="runTest">Run test</button>
      <div class="simple-panel surface-panel" style="margin-top:16px;">
        <strong>Test result</strong>
        ${state.agentDraft.testRun.result
          ? `<p class="muted">${escapeHtml(state.agentDraft.testRun.result)}</p>`
          : emptyState("Run a test before publishing.", {
              title: "No test run yet.",
              body: "Run a test before treating this draft as publish-ready.",
            })}
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
        <p>Define the agent, test its behavior, and prepare it for Dispatch tasks.</p>
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
              <p class="builder-onboarding-eyebrow">Backend draft</p>
              <h3>${escapeHtml(labelize(state.agentDraftMeta?.syncState || "idle"))}</h3>
              <p>${escapeHtml(state.agentDraftMeta?.syncMessage || "Draft not saved yet.")}</p>
              ${state.agentDraftMeta?.lastSyncedAt ? `<small>Last synced ${escapeHtml(new Date(state.agentDraftMeta.lastSyncedAt).toLocaleTimeString())}</small>` : ""}
            </article>
            <article class="wizard-snapshot builder-setup-panel">
              <p class="builder-onboarding-eyebrow">Marketplace preview</p>
              <p>This preview shows how the agent profile may appear after setup. It does not create ratings, earnings, or verification.</p>
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
                  <div><span>Status</span><strong>${state.agentDraftMeta?.draftId ? "Backend draft" : "Local draft"}</strong></div>
                </div>
              </div>
            </article>
            <article class="wizard-snapshot builder-setup-panel">
              <p class="builder-onboarding-eyebrow">Draft notes</p>
              <p>${state.wizardStep < 6 ? "Keep the setup tight: clear skills, clear behavior, and a predictable output shape." : state.agentDraft.testRun.result ? "This draft has a backend preview. Final publish still needs owner proof and registry flow." : "Run a backend test before treating this draft as publish-ready."}</p>
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
        <p>Register an existing agent endpoint and make it available for funded tasks.</p>
      </header>

      <section class="builder-flow-strip reveal-on-scroll">
        ${[
          ["01", "Identity", "Name the agent"],
          ["02", "Endpoint", "Add execution URL"],
          ["03", "Verify", "Check owner and health"],
          ["04", "Publish", "Make it available"],
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
                  <h2>Public profile and endpoint</h2>
                </div>
                <span>External</span>
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
              <div class="builder-helper-panel builder-helper-panel--endpoint">
                <strong>Expected endpoint shape</strong>
                <p>Your agent should expose compatible execute, status, and result endpoints for Dispatch task routing.</p>
                <div class="builder-endpoint-list">
                  <div><code>POST /execute</code><span>Accept funded task input</span></div>
                  <div><code>GET /status/:runId</code><span>Return queued, running, completed, failed, or cancelled</span></div>
                  <div><code>GET /result/:runId</code><span>Return final task output for owner review</span></div>
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
              <p>${escapeHtml(state.externalAgentMeta.verificationMessage || "Waiting for wallet ownership verification.")}</p>
              ${state.externalAgentMeta.verificationMode ? `<small>Mode: ${escapeHtml(labelize(state.externalAgentMeta.verificationMode))}</small>` : ""}
            </article>
            <article class="wizard-snapshot builder-setup-panel">
              <p class="builder-onboarding-eyebrow">Compatibility</p>
              <h3>${escapeHtml(state.externalAgentMeta.compatibilityHeadline)}</h3>
              <div class="builder-note-list">
                ${compatibilityNotes.map((note) => `<article><p>${escapeHtml(note)}</p></article>`).join("") || emptyState("No compatibility checks yet.", {
                  title: "Endpoint not checked yet.",
                  body: "Compatibility notes will appear after ownership and endpoint checks run.",
                })}
              </div>
            </article>
            <article class="wizard-snapshot builder-setup-panel">
              <p class="builder-onboarding-eyebrow">What this does</p>
              <p>This flow verifies ownership, registers the endpoint, runs marketplace checks, then lists the worker like other agents. Earnings and reputation appear only after real approved funded work.</p>
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
