import { createMarketplaceChainClient } from "./chain-client.js";
import {
  connectInjectedWallet as connectBrowserWallet,
  getInjectedWalletAddress,
  getInjectedWalletProviderLabel,
  isInjectedWalletAvailable,
  signInjectedWalletMessage,
  watchInjectedWallet,
} from "./browser-wallet.js";
import { API_BASE, categories, createInitialState, routes } from "./app-config.js";
import { loadMarketData as hydrateMarketData, getJson as fetchJson, sendJson as postJson } from "./app-data.js";
import { getAppElements } from "./app-dom.js";
import {
  renderAgentProfilePage,
  renderAgentsMarketplacePage,
  renderDashboardPage,
  renderHomePage,
} from "./app-pages-marketplace.js";
import { renderConnectExternalAgentPage, renderCreateAgentWizardPage, renderTaskDetailPageView } from "./app-pages-flow.js";
import {
  animateCounters,
  applyTheme,
  burst as showBurst,
  closeWalletSheet,
  countMarkup,
  deadlineCountdown,
  emptyState,
  escapeHtml,
  formatCurrency,
  formatPercent,
  initials,
  isActive,
  labelize,
  renderNav as mountNav,
  renderAppFooter as mountFooter,
  renderTopbar as mountTopbar,
  renderWalletSheet as mountWalletSheet,
  requireWallet as requireConnectedWallet,
  revealSections,
  richEmptyState,
  setChrome as mountChrome,
  setButtonLoading,
  speedLabel,
  statusChip,
  statusMessage,
  taskUrgencyClass,
  trustScore,
  updateStatus as setStatus,
} from "./app-ui.js";
import {
  validateAgentListResponse,
  validateLeaderboardResponse,
  validateNanoBudgetActivityResponse,
  validateNanoBudgetDraftResponse,
  validateNanoBudgetListResponse,
  validateNanoArcProofVerifyResponse,
  validateNanoHealthResponse,
  validateNanoMetricsResponse,
  validateNanoSpendIntentResponse,
  validateNanoSpendReceiptResponse,
  validateSettlementHistoryResponse,
  validateTaskDraftCreateResponse,
  validateTaskDetailResponse,
  validateTaskListResponse,
} from "./api-contracts.js";
import {
  buildPostTaskChecklist,
  buildReviewPanelModel,
  buildTaskDisputeDisplayModel,
  buildArcTransactionLink,
  buildNanoAgentDecisionPresentation,
  buildNanoBudgetGuardrailModel,
  buildNanoBudgetStatusModel,
  buildNanoMetricsModel,
  buildNanoMultiSpendPlanRows,
  buildNanoPaymentActionModel,
  buildNanoReceiptStatusModel,
  buildNanoRecipientWalletModel,
  buildNanoResetDraftState,
  buildNanoReceiptDetailModel,
  buildNanoRunHistoryModel,
  buildNanoSelectedRunModel,
  buildNanoRunProgressPresentation,
  buildNanoResultPreviewPresentation,
  buildNanoSourceUnlockPresentation,
  buildNanoSpendPlanPresentation,
  buildNanoSpendIntentStatusModel,
  buildTaskResultModel,
  buildTaskRevisionDisplayModel,
  buildTaskTemplateBrief,
  formatNanoUsdc,
  getTaskBriefTemplate,
  nanoBudgetPresets,
  nanoApiUnavailableMessage,
  nanoSourcePaymentSpendPlanRows,
  shortWallet,
  taskBriefTemplates,
  validateNanoBudgetAmount,
  walletNetworkSnapshotsEqual,
} from "./ui-models.js";
const state = createInitialState();
const el = getAppElements();
let ambientRefreshPending = false;
let attachmentIngestionModulePromise = null;
let initialMarketHydrationPromise = null;
let postTaskReadinessPromise = null;
let postTaskReadinessLastAttemptAt = 0;
let nanoAutoRefreshWalletKey = "";
const pendingTaskAutoChecks = new Set();
const pendingTaskReviewActions = new Set();
let activeTaskDetailRenderToken = 0;
const nanoPlannedSpendRows = nanoSourcePaymentSpendPlanRows;

function persistRevisionRequests() {
  localStorage.setItem("dispatchRevisionRequests", JSON.stringify(state.revisionRequests || {}));
}

function persistDisputeRecords() {
  localStorage.setItem("dispatchDisputeRecords", JSON.stringify(state.disputeRecords || {}));
}

function resetNanoDataForWallet() {
  nanoAutoRefreshWalletKey = "";
  state.nano.budgets = [];
  state.nano.budgetsLoaded = false;
  state.nano.budgetsError = "";
  state.nano.selectedBudgetId = "";
  state.nano.activity = null;
  state.nano.activityError = "";
  state.nano.runActivities = {};
  state.nano.runHistoryLoading = false;
  state.nano.runHistoryError = "";
  state.nano.metrics = null;
  state.nano.metricsError = "";
}

function resetNanoDraftFlow() {
  nanoAutoRefreshWalletKey = "";
  state.nano = buildNanoResetDraftState(state.nano, { preserveHistory: true });
}

function resetNanoProofDraftFields() {
  state.nano.arcProofTxHash = "";
  state.nano.arcProofIntentId = "";
  state.nano.arcProofStatus = "";
  state.nano.arcProofMessage = "";
}

function loadAttachmentIngestionModule() {
  if (!attachmentIngestionModulePromise) {
    attachmentIngestionModulePromise = import("./attachment-ingestion.js");
  }
  return attachmentIngestionModulePromise;
}

function renderFatalAppError(error, title = "App startup failed") {
  const message = statusMessage(error, "The marketplace UI hit an unexpected error.");
  console.error(title, error);
  if (!el.appRoot) return;
  el.appRoot.innerHTML = `
    <section class="error-state state-card state-card--error shell-section surface-page">
      <span class="empty-state__mark" aria-hidden="true"></span>
      <strong>${escapeHtml(title)}</strong>
      <p>${escapeHtml(message)}</p>
      <div class="empty-state-actions">
        <button class="hero-primary" id="retryAppRender">Retry</button>
        <button data-route="/">Go Home</button>
      </div>
    </section>
  `;
  document.getElementById("retryAppRender")?.addEventListener("click", () => {
    safeRender("Manual retry failed");
  });
}

async function safeRender(context = "Render failed") {
  try {
    await render();
  } catch (error) {
    renderFatalAppError(error, context);
  }
}

window.addEventListener("error", (event) => {
  renderFatalAppError(event.error || new Error(event.message || "Unexpected browser error."), "Frontend error");
});

window.addEventListener("unhandledrejection", (event) => {
  renderFatalAppError(
    event.reason instanceof Error ? event.reason : new Error(String(event.reason || "Unhandled promise rejection.")),
    "Unhandled app error",
  );
});

const chainClient = createMarketplaceChainClient({
  apiBase: API_BASE,
  getWalletAddress: () => state.wallet,
  onStatus: (transactionState, message) => {
    state.chainTransaction = {
      state: transactionState,
      message,
    };
    const tone = transactionState === "failed" ? "warn" : transactionState === "accepted" ? "success" : "neutral";
    updateStatus("Arc transaction", message, tone);
  },
});

el.ownerWallet.value = state.wallet;

syncInjectedWalletFromBrowser().catch((error) => {
  updateStatus("Wallet unavailable", statusMessage(error, "Wallet connection could not be prepared."), "warn");
  renderTopbar();
});
watchInjectedWallet({
  onAccountsChanged: (accounts) => {
    const nextWallet = accounts[0] || "";
    const nextProviderLabel = nextWallet ? getInjectedWalletProviderLabel() : "";
    const walletChanged = state.wallet.trim().toLowerCase() !== nextWallet.trim().toLowerCase();
    const nextConnectionType = nextWallet ? "injected" : "manual";
    const connectionChanged = state.walletConnectionType !== nextConnectionType || state.walletProviderLabel !== nextProviderLabel;
    if (!walletChanged && !connectionChanged) {
      void refreshWalletNetworkState();
      return;
    }
    if (walletChanged) resetNanoDataForWallet();
    state.wallet = nextWallet;
    state.walletConnectionType = nextConnectionType;
    state.walletProviderLabel = nextProviderLabel;
    localStorage.setItem("activeWallet", nextWallet);
    localStorage.setItem("walletConnectionType", state.walletConnectionType);
    localStorage.setItem("walletProviderLabel", nextProviderLabel);
    el.ownerWallet.value = nextWallet;
    void refreshWalletNetworkState();
    renderTopbar();
    safeRender("Wallet change render failed");
  },
  onChainChanged: () => {
    chainClient.resetBrowserContext?.();
    void refreshWalletNetworkState();
    safeRender("Chain change render failed");
  },
});

document.addEventListener("click", (event) => {
  const routeTrigger = event.target.closest("[data-route]");
  if (routeTrigger) {
    event.preventDefault();
    state.mobileNavOpen = false;
    navigate(routeTrigger.dataset.route);
    return;
  }

  if (event.target.closest("[data-theme]")) {
    state.theme = state.theme === "dark" ? "light" : "dark";
    localStorage.setItem("theme", state.theme);
    applyTheme(el, state.theme);
    renderTopbar();
    return;
  }

  const walletToggle = event.target.closest("[data-wallet]");
  if (walletToggle) {
    state.mobileNavOpen = false;
    renderNav();
    renderWalletSheet(walletToggle.dataset.wallet === "open");
  }

  const menuToggle = event.target.closest("[data-menu]");
  if (menuToggle) {
    state.mobileNavOpen = menuToggle.dataset.menu === "open";
    renderNav();
    return;
  }
});

window.addEventListener("popstate", () => {
  safeRender("History render failed");
});

function navigate(path) {
  state.mobileNavOpen = false;
  history.pushState({}, "", path);
  safeRender("Navigation render failed");
}

function renderWalletSheet(open) {
  if (!open) {
    closeWalletSheet(el);
    return;
  }
  mountWalletSheet({
    el,
    state,
    shortWallet,
    walletAvailable: isInjectedWalletAvailable(),
    walletProviderLabel: getInjectedWalletProviderLabel(),
    onConnectInjected: async () => {
      try {
        const wallet = await connectBrowserWallet();
        const providerLabel = getInjectedWalletProviderLabel();
        if (state.wallet !== wallet) resetNanoDataForWallet();
        state.wallet = wallet;
        state.walletConnectionType = "injected";
        state.walletProviderLabel = providerLabel;
        el.ownerWallet.value = wallet;
        localStorage.setItem("activeWallet", wallet);
        localStorage.setItem("walletConnectionType", state.walletConnectionType);
        localStorage.setItem("walletProviderLabel", providerLabel);
        await refreshWalletNetworkState();
        updateStatus("Wallet connected", `${providerLabel} connected as ${shortWallet(wallet)}.`, "success");
        closeWalletSheet(el);
        safeRender("Wallet connect render failed");
      } catch (error) {
        updateStatus("Wallet connection failed", statusMessage(error, "Could not connect the browser wallet."), "warn");
      }
    },
    onDisconnect: () => {
      resetNanoDataForWallet();
      state.wallet = "";
      state.walletConnectionType = "manual";
      state.walletProviderLabel = "";
      state.walletNetwork = {
        ...state.walletNetwork,
        error: "",
        chainId: null,
        isArcTestnet: false,
        usdcBalance: null,
        nativeGasBalance: null,
        message: "",
      };
      el.ownerWallet.value = "";
      localStorage.removeItem("activeWallet");
      localStorage.setItem("walletConnectionType", state.walletConnectionType);
      localStorage.removeItem("walletProviderLabel");
      updateStatus("Wallet disconnected", "Browser wallet cleared from this local session.", "neutral");
      closeWalletSheet(el);
      safeRender("Wallet disconnect render failed");
    },
    onSwitchNetwork: async () => {
      try {
        state.walletNetwork.loading = true;
        updateStatus("Switching network", "Requesting Arc Testnet in your wallet.", "neutral");
        const snapshot = await chainClient.switchWalletToArcTestnet();
        state.walletNetwork = { ...state.walletNetwork, ...snapshot, loading: false, error: "" };
        updateStatus("Arc Testnet ready", "Wallet is connected to Arc Testnet.", "success");
        renderWalletSheet(true);
        safeRender("Wallet network switch render failed");
      } catch (error) {
        state.walletNetwork = {
          ...state.walletNetwork,
          loading: false,
          error: statusMessage(error, "Could not switch to Arc Testnet."),
        };
        updateStatus("Network switch failed", state.walletNetwork.error, "warn");
      }
    },
    onClose: () => closeWalletSheet(el),
  });
}

async function settleWithin(promise, timeoutMs, message) {
  let timeoutId;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timeoutId = window.setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function refreshWalletNetworkState() {
  if (!state.wallet.trim()) return null;
  try {
    if (!state.walletNetwork.loading || state.walletNetwork.error) {
      state.walletNetwork = { ...state.walletNetwork, loading: true, error: "" };
    }
    const snapshot = await settleWithin(chainClient.getWalletNetworkSnapshot(), 4500, "Wallet network check timed out.");
    const nextNetwork = { ...state.walletNetwork, ...snapshot, loading: false, error: "" };
    if (!walletNetworkSnapshotsEqual(state.walletNetwork, nextNetwork) || state.walletNetwork.loading || state.walletNetwork.error) {
      state.walletNetwork = nextNetwork;
    }
    return snapshot;
  } catch (error) {
    const nextNetwork = {
      ...state.walletNetwork,
      loading: false,
      error: statusMessage(error, "Wallet network check failed."),
    };
    if (!walletNetworkSnapshotsEqual(state.walletNetwork, nextNetwork) || state.walletNetwork.loading || state.walletNetwork.error !== nextNetwork.error) {
      state.walletNetwork = nextNetwork;
    }
    return null;
  }
}

async function loadMarketData() {
  state.marketDataLoading = true;
  try {
    await loadMarketDataModule();
    state.marketDataLoaded = true;
  } finally {
    state.marketDataLoading = false;
  }
}
const loadMarketDataModule = () =>
  hydrateMarketData({
    apiBase: API_BASE,
    state,
    chainClient,
    validators: {
      validateAgentListResponse,
      validateTaskListResponse,
      validateLeaderboardResponse,
    },
  });

function getJson(path, validate) {
  return fetchJson(API_BASE, path, validate);
}

function sendJson(path, method, body, validate) {
  return postJson(API_BASE, path, method, body, validate);
}

function updateStatus(title, body, tone = "neutral") {
  return setStatus(el, title, body, tone);
}

function requireWallet() {
  return requireConnectedWallet(state);
}

function renderNav() {
  return mountNav(el, routes, isActive, state);
}

function renderTopbar() {
  return mountTopbar(el, state, shortWallet);
}

function renderFooter() {
  return mountFooter(el, routes);
}

function setChrome(eyebrow, title, sidebarTitle, sidebarLead, progress) {
  return mountChrome(el, eyebrow, title, sidebarTitle, sidebarLead, progress);
}

function burst(kind) {
  return showBurst(el, kind);
}

function renderHome() {
  setChrome(
    "Landing / Home",
    "Dispatch Home",
    "Post USDC-funded tasks, assign AI workers, and release payment after owner approval.",
    "AI agents that work, earn, and build reputation on Arc Testnet.",
    100,
  );
  renderHomePage({ el, state, onNavigate: navigate });
}

function renderArcDemoRemoved() {
  setChrome(
    "Dispatch",
    "Arc Demo Removed",
    "This demo route is no longer part of the public Dispatch interface.",
    "Use the marketplace, funded task flow, and task detail pages for current Arc Testnet review flows.",
    20,
  );
  el.appRoot.innerHTML = `
    <section data-structure="route-removed" class="surface-page">
      ${richEmptyState(
        "Arc Demo removed.",
        "This demo route is no longer part of the Dispatch interface.",
        ['<button class="hero-primary" data-route="/">Go home</button>'],
        "info",
      )}
    </section>
  `;
  revealSections(el.appRoot);
}

function renderAgentsPage() {
  setChrome(
    "Agent Marketplace",
    "Explore Agents",
    "Find the right worker for funded execution faster.",
    "Dispatch makes agent reputation, earnings, recent work, and response expectations easy to scan before you assign funded work.",
    92,
  );
  renderAgentsMarketplacePage({ el, state, onNavigate: navigate, rerender: renderAgentsPage });
}

async function renderAgentProfile(slug) {
  setChrome(
    "Agent Profile",
    "Agent Profile",
    "A sales page for funded hiring, not a technical profile dump.",
    "Trust stats, approved outcomes, response time, and a strong hire action keep this page conversion-focused.",
    88,
  );
  renderAgentProfilePage({ el, state, slug, onNavigate: navigate });
}

function taskPayloadFromForm() {
  const rewardAmount = Number(state.taskForm.rewardAmount);
  const deadlineValue = state.taskForm.deadline ? new Date(state.taskForm.deadline) : null;
  return {
    title: state.taskForm.title.trim(),
    description: state.taskForm.description.trim(),
    category: state.taskForm.category,
    rewardAmount: Number.isFinite(rewardAmount) ? rewardAmount : NaN,
    deadline: deadlineValue && !Number.isNaN(deadlineValue.getTime()) ? deadlineValue.toISOString() : null,
    hiringMode: state.taskForm.hiringMode,
    selectedAgentId: state.taskForm.hiringMode === "direct_hire" ? (state.taskForm.selectedAgentId || null) : null,
    attachments: state.taskForm.attachments,
    evaluationPreference: state.taskForm.evaluationPreference,
    structuredNotes: state.taskForm.structuredNotes.trim() || null,
    creatorWallet: state.wallet,
    maxParticipants: state.taskForm.hiringMode === "open_market" ? Number(state.taskForm.maxParticipants || 1) : 1,
  };
}

function bestFitLabels(agent) {
  return (agent?.profile?.skills?.length ? agent.profile.skills : agent?.profile?.capabilityTags || [])
    .slice(0, 4)
    .map((item) => labelize(item));
}

function starterIdeasForAgent(agent) {
  const skills = agent?.profile?.skills || [];
  if (skills.includes("contract_qa")) {
    return [
      "Review this contract and tell me the termination, renewal, and data retention terms.",
      "Answer these clause questions using only the visible source text.",
    ];
  }
  if (skills.includes("field_extraction")) {
    return [
      "Extract the important fields from this invoice into a clean structured format.",
      "Pull structured data from the text below and separate uncertain values clearly.",
    ];
  }
  if (skills.includes("schema_design")) {
    return [
      "Turn this messy input into a clean JSON schema and example output.",
      "Map these fields into a machine-readable payload without inventing extra fields.",
    ];
  }
  if (skills.includes("meeting_summary")) {
    return [
      "Summarize this meeting into key updates, risks, and next steps.",
      "Turn these notes into a one-screen executive brief.",
    ];
  }
  if (skills.includes("translation")) {
    return [
      "Translate the product copy below and preserve product terms.",
      "Localize this support content for the target language and tone.",
    ];
  }
  if (skills.includes("runbook_design")) {
    return [
      "Turn this request into a runbook with steps, owners, and risks.",
      "Create an SOP from the notes below without inventing missing details.",
    ];
  }
  if (skills.includes("research_synthesis")) {
    return [
      "Turn these market notes into a strategy brief with signals and implications.",
      "Synthesize the research below and recommend one next move.",
    ];
  }
  if (skills.includes("homepage_copy")) {
    return [
      "Rewrite this homepage copy to be clearer and more convincing.",
      "Write sharper launch copy using only the proof below.",
    ];
  }
  if (skills.includes("campaign_planning")) {
    return [
      "Build a campaign plan with audience, message, channels, and sequencing.",
      "Turn this launch brief into a simple rollout plan.",
    ];
  }
  return [
    "Describe the outcome you want and the format you need back.",
    "Include what good looks like, what to avoid, and any source material.",
  ];
}

function slugifyDraftName(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function splitListInput(value) {
  return String(value || "")
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniqueItems(items) {
  return Array.from(new Set((items || []).map((item) => String(item).trim()).filter(Boolean)));
}

function inferKnowledgeKind(pointer) {
  return /^https?:\/\//i.test(pointer) ? "url" : "note";
}

function inferFieldType(key) {
  const normalized = String(key || "").toLowerCase();
  if (normalized.includes("count") || normalized.includes("amount") || normalized.includes("price") || normalized.includes("score")) {
    return "number";
  }
  if (normalized.startsWith("is_") || normalized.startsWith("has_") || normalized.includes("enabled") || normalized.includes("valid")) {
    return "boolean";
  }
  if (normalized.includes("items") || normalized.includes("tags") || normalized.includes("list")) {
    return "array";
  }
  return "string";
}

function parseOutputExample(value) {
  const source = String(value || "").trim();
  if (!source) return { output: "" };
  try {
    const parsed = JSON.parse(source);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // fall through to string wrapper
  }
  return { output: source };
}

async function sha256Hex(input) {
  const encoder = new TextEncoder();
  const data = encoder.encode(String(input || ""));
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((item) => item.toString(16).padStart(2, "0"))
    .join("");
}

function stringifyTestRunResult(result) {
  if (typeof result === "string") return result;
  try {
    return JSON.stringify(result, null, 2);
  } catch {
    return String(result ?? "");
  }
}

function buildAgentDraftPayload() {
  const capabilityTags = uniqueItems(state.agentDraft.identity.tags);
  return {
    ownerWallet: state.wallet || "local-draft-owner",
    currentStep: state.wizardStep,
    identity: {
      publicName: state.agentDraft.identity.name.trim(),
      slug: slugifyDraftName(state.agentDraft.identity.slug || state.agentDraft.identity.name),
      tagline: state.agentDraft.identity.tagline.trim(),
      category: state.agentDraft.identity.category,
      capabilityTags,
      avatarUrl: null,
    },
    behavior: {
      systemInstructions: state.agentDraft.behavior.systemPrompt.trim(),
      prohibitedBehaviors: splitListInput(state.agentDraft.behavior.prohibited),
      toneStyle: state.agentDraft.behavior.tone.trim(),
      structuredOutputRequired: Boolean(String(state.agentDraft.behavior.structured || "").trim()),
      domainConstraints: splitListInput(state.agentDraft.behavior.constraints),
      qualityPreference: Number(state.agentDraft.behavior.quality || 0),
    },
    tools: {
      selectedTools: ["web_retrieval_stub", "document_retrieval_stub", "structured_formatter", "summarizer_helper", "classification_helper", "no_tool_mode"].map((toolId) => ({
        id: toolId,
        enabled: state.agentDraft.tools.includes(toolId),
        config: {},
      })),
      advancedOpen: false,
    },
    knowledge: {
      attachments: (state.agentDraft.knowledge || []).map((item) => ({
        id: item.id,
        kind: inferKnowledgeKind(item.pointer),
        title: item.title,
        pointer: item.pointer,
      })),
      retrievalHooks: [],
      notes: [],
    },
    schemaDefinition: {
      inputFields: (state.agentDraft.schema.inputFields || []).map((field) => ({
        key: field.key,
        label: field.label,
        type: inferFieldType(field.key),
        required: true,
        description: `${field.label} supplied by the buyer.`,
      })),
      outputFields: (state.agentDraft.schema.outputFields || []).map((field) => ({
        key: field.key,
        label: field.label,
        type: inferFieldType(field.key),
        description: `${field.label} returned by the agent.`,
      })),
      outputExample: parseOutputExample(state.agentDraft.schema.outputExample),
    },
  };
}

function setAgentDraftSyncState(syncState, syncMessage) {
  state.agentDraftMeta.syncState = syncState;
  state.agentDraftMeta.syncMessage = syncMessage;
  if (syncState === "synced") {
    state.agentDraftMeta.lastSyncedAt = new Date().toISOString();
  }
}

async function ensureAgentDraftSaved() {
  const payload = buildAgentDraftPayload();
  state.agentDraft.identity.slug = payload.identity.slug;
  if (payload.identity.publicName.length < 2 || payload.identity.tagline.length < 6) {
    throw new Error("Add a clear public name and tagline before saving this agent draft.");
  }
  if (payload.behavior.systemInstructions.length < 1) {
    throw new Error("Add system instructions before saving this agent draft.");
  }

  if (!state.agentDraftMeta.draftId) {
    setAgentDraftSyncState("saving", "Saving an agent draft.");
    const created = await sendJson("/api/agent-builder/drafts", "POST", payload);
    state.agentDraftMeta.draftId = created.draftId;
  setAgentDraftSyncState("synced", "Agent draft saved and ready for testing.");
    return created;
  }

  setAgentDraftSyncState("saving", "Saving the latest draft changes.");
  const updated = await sendJson(`/api/agent-builder/drafts/${encodeURIComponent(state.agentDraftMeta.draftId)}`, "PATCH", {
    currentStep: state.wizardStep,
    identity: payload.identity,
    behavior: payload.behavior,
    tools: payload.tools,
    knowledge: payload.knowledge,
    schemaDefinition: payload.schemaDefinition,
  });
  setAgentDraftSyncState("synced", "Agent draft updated.");
  return updated;
}

async function runAgentDraftTestPreview() {
  const sampleTask = document.getElementById("testRunTask")?.value.trim() || state.agentDraft.testRun.sampleTask.trim();
  if (sampleTask.length < 10) {
    throw new Error("Add a fuller sample task before running the preview.");
  }

  state.agentDraft.testRun.sampleTask = sampleTask;
  await ensureAgentDraftSaved();
  setAgentDraftSyncState("testing", "Running a test preview for this draft.");
  const result = await sendJson(`/api/agent-builder/drafts/${encodeURIComponent(state.agentDraftMeta.draftId)}/test-run`, "POST", {
    sampleTask,
    sampleInput: parseOutputExample(state.agentDraft.schema.outputExample),
  });
  state.agentDraft.testRun.result = stringifyTestRunResult(result.result);
  state.agentDraft.testRun.latencyMs = result.latencyMs;
  state.agentDraft.testRun.valid = result.parseValid;
  state.agentDraft.testRun.error = result.errors?.length ? result.errors.join(" ") : null;
  state.agentDraftMeta.lastTestRunAt = result.runAt;
  setAgentDraftSyncState(
    "synced",
    result.parseValid
      ? "Test completed successfully."
      : "Test finished, but the output shape still needs work.",
  );
  return result;
}

function buildExternalAgentRegistrationPayload() {
  const skills = uniqueItems(state.externalAgentForm.skills);
  const slug = slugifyDraftName(state.externalAgentForm.slug || state.externalAgentForm.publicName);
  const versionHash = state.externalAgentForm.versionHash || `ext_${slug}_${Date.now()}`;
  state.externalAgentForm.slug = slug;
  state.externalAgentForm.versionHash = versionHash;
  return {
    ownerProofId: state.externalAgentMeta.ownerProofId,
    ownerWallet: state.wallet,
    publicName: state.externalAgentForm.publicName.trim(),
    slug,
    description: state.externalAgentForm.description.trim(),
    avatarUrl: null,
    originType: "external",
    developerName: state.externalAgentForm.developerName.trim() || undefined,
    category: state.externalAgentForm.category,
    capabilityTags: skills,
    skills,
    skillCategories: [state.externalAgentForm.category],
    endpointUrl: state.externalAgentForm.endpointUrl.trim(),
    webhookUrl: state.externalAgentForm.webhookUrl.trim() || null,
    adapterType: state.externalAgentForm.adapterType || "erc8183_adapter",
    outputSchema: state.externalAgentForm.outputSchema.trim() || "External endpoint-managed output schema",
    payoutWallet: state.externalAgentForm.payoutWallet.trim() || state.wallet,
    erc8183Compatible: true,
    expectedLatencyMsRange: {
      minMs: Number(state.externalAgentForm.minLatencyMs || 0),
      maxMs: Number(state.externalAgentForm.maxLatencyMs || 0),
    },
    pricingHint: state.externalAgentForm.pricingHint.trim() || "External endpoint-backed agent",
    activeVersionHash: versionHash,
    compatibility: {
      supportedCategories: [state.externalAgentForm.category],
      declaredLatencyEstimateMs: Number(state.externalAgentForm.maxLatencyMs || 0),
      declaredMaxPayloadSize: Number(state.externalAgentForm.maxPayloadSize || 1),
      versionHashOrFingerprint: versionHash,
    },
  };
}

async function verifyExternalAgentOwnerProof() {
  requireWallet();
  state.externalAgentMeta.verificationState = "verifying";
  state.externalAgentMeta.verificationMessage = "Requesting owner wallet verification.";
  const challenge = await sendJson("/api/agent-registry/owner-proof/challenge", "POST", {
    walletAddress: state.wallet,
  });
  let signature = "";
  try {
    signature = await signInjectedWalletMessage(challenge.message, state.wallet);
  } catch (error) {
    throw new Error(statusMessage(error, "Could not sign the ownership message."));
  }

  let verification = await sendJson("/api/agent-registry/owner-proof/verify", "POST", {
    challengeId: challenge.challengeId,
    walletAddress: state.wallet,
    signature,
  });

  if (!verification.verified && API_BASE.includes("localhost")) {
    const devSignature = await sha256Hex(`${state.wallet}::${challenge.message}`);
    verification = await sendJson("/api/agent-registry/owner-proof/verify", "POST", {
      challengeId: challenge.challengeId,
      walletAddress: state.wallet,
      signature: devSignature,
    });
  }

  if (!verification.verified || !verification.proofId) {
    throw new Error("Verify owner wallet to continue.");
  }

  state.externalAgentMeta.ownerProofId = verification.proofId;
  state.externalAgentMeta.verificationMode = verification.mode;
  state.externalAgentMeta.verificationState = "verified";
  state.externalAgentMeta.verificationMessage =
    verification.mode === "development"
      ? "Owner wallet verified in development mode for local testing."
      : "Owner wallet verified. You can now connect the agent.";
  return verification;
}

async function connectExternalAgent() {
  requireWallet();
  if (!state.externalAgentMeta.ownerProofId) {
    throw new Error("Verify owner wallet to continue.");
  }
  const payload = buildExternalAgentRegistrationPayload();
  if (payload.publicName.length < 2 || payload.description.length < 10) {
    throw new Error("Add a clearer external agent name and description before connecting it.");
  }
  if (!payload.endpointUrl) {
    throw new Error("Add endpoint URL to continue.");
  }

  state.externalAgentMeta.compatibilityHeadline = "Connecting agent.";
  state.externalAgentMeta.compatibilityNotes = ["Submitting the agent endpoint."];

  const registryAgent = await sendJson("/api/agent-registry/agents/register", "POST", payload);
  state.externalAgentMeta.registryAgentId = registryAgent.profile.agentId;

  const version = {
    versionHash: payload.activeVersionHash,
    agentId: registryAgent.profile.agentId,
    configType: "hybrid",
    systemPrompt: `External endpoint-backed agent for ${labelize(payload.category)} tasks.`,
    tools: [],
    outputSchema: "External endpoint-managed output schema",
    knowledgeAssetRefs: [],
    publishedAt: new Date().toISOString(),
  };

  await sendJson(`/api/agent-registry/agents/${encodeURIComponent(registryAgent.profile.agentId)}/versions`, "POST", {
    ownerWallet: state.wallet,
    version,
    runHealthcheck: false,
    runCompatibilityProbe: false,
  });

  const activatedAgent = await sendJson(`/api/agent-registry/agents/${encodeURIComponent(registryAgent.profile.agentId)}/activate`, "POST", {
    actorWallet: state.wallet,
  });

  const notes = [
    activatedAgent.compatibilityReport?.compatible ? "Compatible." : "Needs review.",
    activatedAgent.healthStatus ? `Endpoint health: ${labelize(activatedAgent.healthStatus)}.` : null,
    ...(activatedAgent.compatibilityReport?.notes || []),
  ].filter(Boolean);
  state.externalAgentMeta.compatibilityHeadline = activatedAgent.compatibilityReport?.compatible
    ? "Agent connected."
    : "Agent connected with follow-up notes.";
  state.externalAgentMeta.compatibilityNotes = notes;
  await loadMarketData();
  return activatedAgent;
}

async function createTask() {
  const buttons = [document.getElementById("fundTaskButton"), document.getElementById("fundTaskMobile")].filter(Boolean);
  let taskId = null;
  let writeResult = null;
  let latestReceipt = null;
  let payload = null;

  async function syncTaskAfterWrite(receiptOverride = null) {
    if (!taskId || !writeResult) return null;
    const resolvedReceipt = receiptOverride || latestReceipt;
    if (!resolvedReceipt) return null;
    return chainClient.syncTask(taskId, writeResult, resolvedReceipt);
  }

  async function reconcileTaskAfterWrite() {
    if (!taskId || !writeResult) return null;

    const candidateHashes = [
      writeResult.assignTxHash,
      writeResult.fundTxHash,
      writeResult.createTxHash,
    ].filter((hash) => typeof hash === "string" && hash.startsWith("0x"));

    let resolvedReceipt = latestReceipt;
    if (!resolvedReceipt) {
      for (const hash of candidateHashes) {
        resolvedReceipt = await chainClient.pollReceipt(hash, { intervalMs: 1500, maxAttempts: 4 }).catch(() => null);
        if (resolvedReceipt) break;
      }
    }
    if (!resolvedReceipt) {
      resolvedReceipt = await chainClient.findSuccessfulExternalReceipt([
        writeResult.assignTxHash,
        writeResult.fundTxHash,
        writeResult.createTxHash,
      ]).catch(() => null);
    }

    const pendingReceipt = candidateHashes[0]
      ? {
        hash: candidateHashes[0],
        status: "PENDING",
        accepted: false,
        finalized: false,
        undetermined: false,
        contractAddress: null,
        blockNumber: null,
      }
      : null;

    const onchainSnapshot = await chainClient.readOnchainTask(taskId).catch(() => null);
    const onchainTask = onchainSnapshot?.onchainTask || null;
    const onchainState = String(onchainTask?.state || "").toUpperCase();
    const escrowLocked = readBigIntLike(onchainTask?.escrow_locked ?? onchainTask?.escrowLocked ?? 0n);
    const fundingStateConfirmed = escrowLocked > 0n && [
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

    if (fundingStateConfirmed) {
      resolvedReceipt = resolvedReceipt && (resolvedReceipt.accepted || resolvedReceipt.finalized)
        ? resolvedReceipt
        : {
          hash: writeResult.assignTxHash || writeResult.fundTxHash || writeResult.createTxHash || "onchain_state_confirmed",
          status: "ACCEPTED",
          accepted: true,
          finalized: false,
          undetermined: false,
          contractAddress: null,
          blockNumber: null,
        };
      latestReceipt = resolvedReceipt;
      return syncTaskAfterWrite(resolvedReceipt);
    }

    if (resolvedReceipt) {
      latestReceipt = resolvedReceipt;
      return syncTaskAfterWrite(resolvedReceipt);
    }

    if (pendingReceipt) {
      latestReceipt = pendingReceipt;
      return syncTaskAfterWrite(pendingReceipt);
    }

    return null;
  }
  try {
    buttons.forEach((button) => setButtonLoading(button, true, "Funding task"));
    state.chainTransaction = {
      state: "pending_wallet",
      message: "Preparing the funding flow.",
    };
      payload = taskPayloadFromForm();
      requireWallet();
      const walletSnapshot = await refreshWalletNetworkState();
      if (!walletSnapshot?.isArcTestnet) {
        throw new Error("Switch to Arc Testnet.");
      }
      const walletUsdcBalance = walletSnapshot.usdcBalance == null ? null : Number(walletSnapshot.usdcBalance);
      if (walletUsdcBalance != null && walletUsdcBalance < Number(payload.rewardAmount || 0)) {
        throw new Error(`Not enough USDC for this reward. Required: ${payload.rewardAmount} USDC.`);
      }
      if (payload.title.length < 3) throw new Error("Add a clearer task title.");
      if (payload.description.length < 20) throw new Error("Add a fuller task description so the agent can execute confidently.");
      if (!Number.isFinite(payload.rewardAmount) || payload.rewardAmount <= 0) throw new Error("Set a reward before posting the task.");
      if (!payload.deadline) throw new Error("Set a valid deadline before posting the task.");
      if (payload.hiringMode === "direct_hire" && !payload.selectedAgentId) throw new Error("Select an agent for direct hire.");

    updateStatus("Task draft created", "Preparing the task before wallet funding.", "neutral");
    const draft = await sendJson("/api/task-market/tasks/draft", "POST", payload, validateTaskDraftCreateResponse);
    taskId = draft.task.taskId;
    const metadataHash = `task_meta_${taskId}`;
    const metadataUri = `offchain://tasks/${taskId}`;
    const taskMode = payload.hiringMode === "open_market" ? "multi" : "single";
    const selectedAgent = payload.selectedAgentId
      ? state.agents.find((agent) => agent.profile.agentId === payload.selectedAgentId)
      : null;

    state.taskForm.title = "";
    state.taskForm.description = "";
    state.taskForm.templateId = "custom_task";
    state.taskForm.templateFields = {};
    state.taskForm.templateMessage = "";
    state.taskForm.selectedServicePackage = null;
    state.taskForm.structuredNotes = "";
    state.taskForm.attachments = [];
    state.taskForm.rewardAmount = "";
    state.taskForm.deadline = "";
    state.taskForm.selectedAgentId = "";
    state.taskForm.maxParticipants = 3;

    updateStatus("Funded task created", "Opening the new task page while your wallet finishes the funding steps.", "success");
    navigate(`/tasks/${taskId}`);

    updateStatus("Wallet ready", "Sending task funding through your wallet.", "neutral");
    writeResult = await chainClient.createTaskLifecycle({
      taskId,
      rewardAmount: payload.rewardAmount,
      deadlineIso: payload.deadline,
      taskMode,
      metadataUri,
      metadataHash,
      selectedAgentId: payload.selectedAgentId,
      selectedAgentOnchainId: selectedAgent?.profile.onchainAgentId ?? null,
    });
    latestReceipt = writeResult.latestReceipt;
    const sync = await reconcileTaskAfterWrite();

    if (sync?.task?.onchainTaskRef || sync?.task?.transactionState === "accepted") {
      state.chainTransaction = {
        state: latestReceipt.finalized ? "accepted" : "pending_chain",
        message: `${latestReceipt.status} receipt captured and offchain state synchronized.`,
      };
      updateStatus(
        "Task funding synced",
        `${latestReceipt.status} receipt captured and task state updated.`,
        latestReceipt.finalized ? "success" : "neutral",
      );
    }
    burst("publish");
    await loadMarketData();
    navigate(`/tasks/${taskId}`);
  } catch (error) {
    let message = statusMessage(error, "Task creation failed");
    if (/Arc writes are disabled|configured Arc RPC|router|RPC/i.test(message)) {
      message = /Arc writes are disabled/i.test(message)
        ? "Funding is unavailable in this environment."
        : "Arc Testnet is temporarily unavailable. Try again shortly.";
    }
    if (typeof error?.message === "string" && /wallet balance is too low|not enough USDC/i.test(error.message)) {
      message = `${error.message} Add USDC before funding this task.`;
    }
    const partialWriteResult = error?.partialWriteResult || null;
    if (partialWriteResult) {
      writeResult = {
        ...partialWriteResult,
        createTxHash: partialWriteResult.createTxHash || "draft_only",
        fundTxHash: partialWriteResult.fundTxHash || `missing_fund:${taskId || "draft"}`,
        assignTxHash: partialWriteResult.assignTxHash || null,
      };
      latestReceipt = partialWriteResult.latestReceipt || latestReceipt;
      if (partialWriteResult.createTxHash && !partialWriteResult.fundTxHash) {
        message = "You approved task creation, but funding did not complete. The task draft was saved and is not funded yet.";
      } else if (partialWriteResult.fundTxHash && payload?.hiringMode === "direct_hire" && !partialWriteResult.assignTxHash) {
        message = "Funding completed, but agent assignment did not finish. Your wallet may need one more approval.";
      } else if (partialWriteResult.pendingBrowserTxHash && partialWriteResult.pendingStep === "create_task") {
        writeResult.createTxHash = partialWriteResult.pendingBrowserTxHash;
        message = "Your wallet sent task creation, but Dispatch is still syncing the transaction.";
      } else if (partialWriteResult.pendingBrowserTxHash && partialWriteResult.pendingStep === "fund_task") {
        writeResult.fundTxHash = partialWriteResult.pendingBrowserTxHash;
        message = "Your wallet sent funding, but Dispatch is still syncing the transaction.";
      } else if (partialWriteResult.pendingBrowserTxHash && partialWriteResult.pendingStep === "assign_task") {
        writeResult.assignTxHash = partialWriteResult.pendingBrowserTxHash;
        message = "Your wallet sent agent assignment, but Dispatch is still syncing the transaction.";
      }
    }
    if (taskId) {
      try {
        writeResult = {
          createTxHash: writeResult?.createTxHash || "draft_only",
          fundTxHash: writeResult?.fundTxHash || `missing_fund:${taskId}`,
          assignTxHash: writeResult?.assignTxHash || null,
          onchainTaskRef: writeResult?.onchainTaskRef || null,
        };
        await reconcileTaskAfterWrite();
      } catch {
        // best-effort sync for draft failure state
      }
      await loadMarketData().catch(() => {});
      state.chainTransaction = {
        state: "failed",
        message,
      };
      updateStatus("Task creation failed", message, "warn");
      navigate(`/tasks/${taskId}`);
      return;
    }
    state.chainTransaction = {
      state: "failed",
      message,
    };
    updateStatus("Task creation failed", message, "warn");
  } finally {
    buttons.forEach((button) => setButtonLoading(button, false));
  }
}

function refreshPostTaskReadiness() {
  if (postTaskReadinessPromise) return postTaskReadinessPromise;
  postTaskReadinessLastAttemptAt = Date.now();
  postTaskReadinessPromise = (async () => {
    try {
      state.chainStatus = await settleWithin(chainClient.getStatus(), 4500, "Arc Testnet status check timed out.");
      state.chainConfig = state.chainStatus.config;
      state.chainStatusError = "";
    } catch (error) {
      state.chainStatusError = error instanceof Error ? error.message : "Chain status request failed.";
    }
    if (state.wallet.trim()) {
      await refreshWalletNetworkState();
    }
  })().finally(() => {
    postTaskReadinessPromise = null;
    if (window.location.pathname === "/post-task") {
      safeRender("Post task readiness render failed");
    }
  });
  return postTaskReadinessPromise;
}

function renderPostTaskPage() {
  if (!postTaskReadinessPromise && Date.now() - postTaskReadinessLastAttemptAt > 10000) {
    void refreshPostTaskReadiness();
  }

  setChrome(
    "Post Funded Task",
    "Post Funded Task",
    "Create USDC-funded work for AI agents on Arc Testnet.",
    "Wallet funding, structured agent execution, owner review, and payment release stay connected.",
    76,
  );

  const selectedAgent = state.agents.find((agent) => agent.profile.agentId === state.taskForm.selectedAgentId);
  const selectedAgentBestFor = selectedAgent ? bestFitLabels(selectedAgent) : [];
  const selectedAgentIdeas = selectedAgent ? starterIdeasForAgent(selectedAgent) : [];
  const taskChecklist = buildPostTaskChecklist(state.taskForm, selectedAgent);
  const selectedTemplate = getTaskBriefTemplate(state.taskForm.templateId || "custom_task");
  const templateResult = buildTaskTemplateBrief(selectedTemplate.id, state.taskForm.templateFields || {});
  const walletReady = Boolean(state.wallet.trim());
  const chainMode = state.chainConfig?.chainMode || "unknown";
  const chainStatus = state.chainStatus;
  const chainWritable = chainMode !== "read_only" && chainMode !== "unknown";
  const walletOnArc = !walletReady || state.walletNetwork?.isArcTestnet;
  if (walletReady && walletOnArc && chainMode === "browser_wallet") {
    void chainClient.primeBrowserLifecycle().catch(() => {});
  }
  const rewardAmountForBalance = Number(state.taskForm.rewardAmount || 0);
  const usdcBalanceNumber = state.walletNetwork?.usdcBalance == null ? null : Number(state.walletNetwork.usdcBalance);
  const balanceTooLow = walletReady && walletOnArc && rewardAmountForBalance > 0 && usdcBalanceNumber != null && usdcBalanceNumber < rewardAmountForBalance;
  const fundingBlocked = !walletReady || !chainWritable || !walletOnArc || balanceTooLow;
  const primaryActionLabel = !walletReady
    ? "Connect wallet"
    : !walletOnArc
      ? "Switch to Arc Testnet"
    : balanceTooLow
      ? "Not enough USDC"
    : !chainWritable
      ? "Funding unavailable"
    : state.taskForm.hiringMode === "direct_hire"
      ? "Create and fund task"
      : "Create and fund task";
  const fundingHint = !walletReady
    ? "Connect wallet to continue."
    : !walletOnArc
      ? "Switch to Arc Testnet."
    : balanceTooLow
      ? `Not enough USDC for this reward.`
    : !chainWritable
      ? "Funding is unavailable in this environment."
    : state.taskForm.hiringMode === "direct_hire"
        ? "Your wallet may ask you to approve each funding step."
        : "Your wallet may ask you to approve task creation and funding.";
  const routeChoiceHelper = state.taskForm.hiringMode === "direct_hire"
    ? "Send this task to the selected agent."
    : "Let available agents pick up the task.";
  const routeChoiceLabel = state.taskForm.hiringMode === "direct_hire" ? "Choose an agent" : "Post to marketplace";
  const templateShortLabels = {
    write_x_thread: "X thread",
    summarize_article: "Summary",
    debug_code: "Code fix",
    research_project: "Research",
    rewrite_content: "Rewrite",
    custom_task: "Custom",
  };
  const chainBanner = !walletReady
    ? {
        title: "Wallet required",
        body: "Connect wallet to fund this task.",
        tone: "warning",
      }
      : chainMode === "read_only"
      ? {
          title: "Read-only environment",
          body: "Marketplace browsing works, but funding is unavailable in this environment.",
          tone: "warning",
        }
      : chainMode === "unknown"
        ? {
            title: "Arc Testnet unavailable",
            body: "Arc Testnet is temporarily unavailable. Try again shortly.",
            tone: "info",
          }
        : chainStatus && !chainStatus.ok
          ? {
              title: chainStatus.rpcReachable ? "Arc Testnet requires attention" : "Arc Testnet unavailable",
              body: chainStatus.rpcReachable
                ? "Switch to Arc Testnet."
                : "Arc Testnet is temporarily unavailable. Try again shortly.",
              tone: "warning",
            }
        : null;
  el.appRoot.innerHTML = `
    <section data-structure="task-composer" class="post-task-page">
      <header class="post-task-header reveal-on-scroll is-visible">
        <p class="post-task-eyebrow">Post funded task</p>
        <h1>Create funded work for an AI agent.</h1>
        <p>Describe the work, choose who should do it, and fund the reward in USDC.</p>
        <span>USDC stays locked until you approve the work.</span>
      </header>

      <section class="post-task-flow reveal-on-scroll">
        ${[
          ["01", "Brief", "Describe the work"],
          ["02", "Agent", "Choose who should do it"],
          ["03", "Fund", "Lock USDC before work starts"],
          ["04", "Review", "Approve before payment moves"],
        ].map(([number, title, helper]) => `
          <article>
            <strong>${number}</strong>
            <h3>${title}</h3>
            <p>${helper}</p>
          </article>
        `).join("")}
      </section>

      <section class="post-task-layout">
        <div class="post-task-main">
          ${chainBanner ? `
            <article class="post-task-alert post-task-alert--${chainBanner.tone} reveal-on-scroll">
              <strong>${escapeHtml(chainBanner.title)}</strong>
              <p>${escapeHtml(chainBanner.body)}</p>
            </article>
          ` : ""}

          <article class="post-task-composer reveal-on-scroll">
            <div class="post-task-section-head">
              <div>
                <p class="post-task-eyebrow">Work request</p>
                <h2>What do you need done?</h2>
                <p>Describe the outcome you want. Templates and packages only help you start faster.</p>
              </div>
              <div class="post-task-meta">
                <span>${state.taskForm.rewardAmount ? `Reward ${formatCurrency(state.taskForm.rewardAmount)}` : "Reward not set"}</span>
                <span>${escapeHtml(routeChoiceLabel)}</span>
              </div>
            </div>

            ${state.taskForm.selectedServicePackage ? `
              <div class="post-package-summary">
                <div>
                  <span>Selected package</span>
                  <strong>${escapeHtml(state.taskForm.selectedServicePackage.tier)}: ${escapeHtml(state.taskForm.selectedServicePackage.name)}</strong>
                  <p>${selectedAgent ? escapeHtml(selectedAgent.profile.publicName) : "Agent selected from package"} | This package prefills the task. You can edit the brief before funding.</p>
                </div>
                <strong>${escapeHtml(Number(state.taskForm.selectedServicePackage.priceUsdc || 0).toLocaleString(undefined, { maximumFractionDigits: 6 }))} USDC</strong>
              </div>
            ` : ""}

            <section class="post-brief-fields">
              <label class="post-field post-field--wide"><strong>Task title</strong><input id="taskTitle" value="${escapeHtml(state.taskForm.title)}" placeholder="Rewrite our pricing page for higher conversion clarity" /></label>
              <label class="post-field post-field--wide"><strong>Work request <span class="post-required-badge">Required</span></strong><span>Tell the agent what outcome you want.</span><textarea id="taskDescription" rows="9" placeholder="Example: Write a 5-post X thread explaining my product in simple language.">${escapeHtml(state.taskForm.description)}</textarea></label>
            </section>

            <section class="post-template-section">
              <div class="post-task-section-head post-task-section-head--compact">
                <div>
                  <p class="post-task-eyebrow">Quick start</p>
                  <h3>Start from a template</h3>
                  <p>Pick a starting point, then edit the brief.</p>
                </div>
                <span>${escapeHtml(selectedTemplate.name)}</span>
              </div>
              <div class="post-template-grid">
                ${taskBriefTemplates.map((template) => `
                  <button type="button" data-template-card="${template.id}" class="${selectedTemplate.id === template.id ? "is-selected" : ""}">
                    <strong>${escapeHtml(templateShortLabels[template.id] || template.name)}</strong>
                    <span>${escapeHtml(template.category ? labelize(template.category) : "Custom brief")}</span>
                  </button>
                `).join("")}
              </div>
              ${selectedTemplate.id === "custom_task" ? `
                <p class="post-helper">Write your own brief below.</p>
              ` : `
                <div class="post-template-fields">
                  ${selectedTemplate.fields.map((field) => {
                    const value = state.taskForm.templateFields?.[field.key] || "";
                    return field.multiline
                      ? `<label class="post-field post-field--wide"><strong>${escapeHtml(field.label)}${field.required ? " *" : ""}</strong><textarea data-template-field="${field.key}" rows="3" placeholder="${escapeHtml(field.label)}">${escapeHtml(value)}</textarea></label>`
                      : `<label class="post-field"><strong>${escapeHtml(field.label)}${field.required ? " *" : ""}</strong><input data-template-field="${field.key}" value="${escapeHtml(value)}" placeholder="${escapeHtml(field.label)}" /></label>`;
                  }).join("")}
                </div>
                <button type="button" class="post-quiet-button" id="generateTaskBrief">Generate brief</button>
                ${state.taskForm.templateMessage ? `<div class="post-task-alert post-task-alert--${templateResult.missingFields.length ? "warning" : "info"}"><strong>Template guidance</strong><p>${escapeHtml(state.taskForm.templateMessage)}</p></div>` : ""}
              `}
            </section>

            <section class="post-brief-fields">
              <label class="post-field"><strong>Category</strong><select id="taskCategory">${categories.map((category) => `<option value="${category}" ${state.taskForm.category === category ? "selected" : ""}>${labelize(category)}</option>`).join("")}</select></label>
              <label class="post-field"><strong>USDC reward</strong><input id="taskReward" type="number" min="1" value="${state.taskForm.rewardAmount}" /><span>This amount is locked before the agent starts.</span></label>
              <label class="post-field"><strong>Deadline</strong><input id="taskDeadline" type="datetime-local" value="${state.taskForm.deadline}" /></label>
            </section>
          </article>

          <article class="post-assignment-card reveal-on-scroll">
            <div class="post-task-section-head">
              <div>
                <p class="post-task-eyebrow">Assignment</p>
                <h2>Who should do it?</h2>
                <p>Send the task to one agent or let available agents pick it up.</p>
              </div>
            </div>
            <div class="post-assignment-options">
              <button type="button" data-mode="direct_hire" class="${state.taskForm.hiringMode === "direct_hire" ? "is-selected" : ""}">
                <strong>Choose an agent</strong>
                <span>Best when you already know who should do the work.</span>
              </button>
              <button type="button" data-mode="open_market" class="${state.taskForm.hiringMode === "open_market" ? "is-selected" : ""}">
                <strong>Post to marketplace</strong>
                <span>Best when you want available agents to pick it up.</span>
              </button>
            </div>
            ${state.taskForm.hiringMode === "direct_hire"
              ? `
                <label class="post-field"><strong>Selected agent</strong>
                  <select id="selectedAgentId">
                    <option value="">${state.marketDataLoading && !state.marketDataLoaded ? "Loading agents..." : "Choose an agent"}</option>
                    ${state.agents.map((agent) => `<option value="${agent.profile.agentId}" ${state.taskForm.selectedAgentId === agent.profile.agentId ? "selected" : ""}>${escapeHtml(agent.profile.publicName)} | ${trustScore(agent)} readiness</option>`).join("")}
                  </select>
                  <span>${escapeHtml(routeChoiceHelper)}</span>
                </label>
              `
              : `
                <label class="post-field"><strong>Max participants</strong><input id="taskParticipants" type="number" min="1" max="20" value="${state.taskForm.maxParticipants}" /><span>${escapeHtml(routeChoiceHelper)}</span></label>
              `}
          </article>

          <details class="post-advanced reveal-on-scroll">
            <summary>
              <span>Optional details</span>
              <small>Files, evaluation, and extra setup</small>
            </summary>
            <div class="post-advanced__body">
              <p class="post-helper">Use these only if your task needs files, evaluation, or extra setup.</p>
              <div class="post-advanced-grid">
                <label class="post-field"><strong>Evaluation preference</strong>
                  <select id="taskEvaluationPreference">
                    <option value="user_review_only" ${state.taskForm.evaluationPreference === "user_review_only" ? "selected" : ""}>User review only</option>
                    <option value="assisted_evaluation" ${state.taskForm.evaluationPreference === "assisted_evaluation" ? "selected" : ""}>Assisted evaluation</option>
                    <option value="hybrid_review" ${state.taskForm.evaluationPreference === "hybrid_review" ? "selected" : ""}>Hybrid review</option>
                  </select>
                </label>
                <label class="post-field post-field--wide"><strong>Structured notes</strong><textarea id="taskStructuredNotes" rows="4" placeholder="Formatting rules, references, or approval hints.">${escapeHtml(state.taskForm.structuredNotes)}</textarea></label>
                <label class="post-field"><strong>Attachment title</strong><input id="attachmentTitle" placeholder="Product brief" /></label>
                <label class="post-field"><strong>Attachment pointer</strong><input id="attachmentPointer" placeholder="https://... or ipfs://..." /></label>
                <label class="post-field post-field--wide"><strong>Attachment text</strong><textarea id="attachmentText" rows="5" placeholder="Paste source text here if you want grounded summarization, extraction, or clause review."></textarea></label>
                <label class="post-field post-field--wide"><strong>Upload file</strong><input id="attachmentFile" type="file" accept=".txt,.md,.csv,.json,.pdf,.docx,.png,.jpg,.jpeg,.webp,text/plain,text/markdown,application/json,text/csv,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg,image/webp" /></label>
              </div>
              <button type="button" class="post-quiet-button" id="addAttachment">Add Attachment</button>
              <div class="attachment-list">
                ${state.taskForm.attachments.length
                  ? state.taskForm.attachments.map((attachment) => `
                      <div class="attachment-item">
                        <strong>${escapeHtml(attachment.title)}</strong>
                        <small>${escapeHtml(attachment.pointer)}</small>
                        <small>${attachment.textContent ? `${Math.min(attachment.textContent.length, 20000)} chars of inline source text attached` : "Pointer-only reference"}</small>
                        ${attachment.extractionSource ? `<small>Parsed from ${escapeHtml(attachment.extractionSource.toUpperCase())}${attachment.truncated ? " | truncated for task safety" : ""}</small>` : ""}
                      </div>
                    `).join("")
                  : emptyState("No supporting material yet. Add briefs, docs, or references to make execution sharper.", {
                      title: "No supporting material yet.",
                      body: "Add briefs, docs, or references if the task needs grounded context.",
                    })}
              </div>
            </div>
          </details>

          <details class="post-demo-card reveal-on-scroll">
            <summary>Local test flow</summary>
            <p>Use only for local testing when wallet funding is unavailable.</p>
            <button type="button" data-start-demo-flow>Run local test</button>
          </details>
        </div>

        <aside class="post-task-side">
          <article class="post-funding-summary reveal-on-scroll">
            <p class="post-task-eyebrow">Checkout</p>
            <h2>Fund the task</h2>
            <p class="post-helper">This reward is locked before work starts.</p>
            <div class="post-summary-list">
              <div><span>Reward</span><strong>${state.taskForm.rewardAmount ? formatCurrency(state.taskForm.rewardAmount) : "Not set"}</strong></div>
              <div><span>Network</span><strong>Arc Testnet</strong></div>
              <div><span>Token</span><strong>USDC</strong></div>
              <div><span>Wallet</span><strong>${walletReady ? shortWallet(state.wallet) : "Required"}</strong></div>
              <div><span>Balance</span><strong>${walletReady ? escapeHtml(state.walletNetwork?.usdcBalance == null ? "Balance unavailable" : `${Number(state.walletNetwork.usdcBalance).toLocaleString(undefined, { maximumFractionDigits: 6 })} USDC`) : "Connect wallet"}</strong></div>
              <div><span>Task path</span><strong>${state.taskForm.hiringMode === "direct_hire" ? (selectedAgent ? escapeHtml(selectedAgent.profile.publicName) : "Choose an agent") : "Post to marketplace"}</strong></div>
              <div><span>Package</span><strong>${state.taskForm.selectedServicePackage ? escapeHtml(state.taskForm.selectedServicePackage.name) : "Custom task"}</strong></div>
            </div>
            ${!walletOnArc && walletReady ? `<button type="button" class="hero-secondary post-switch-button" id="switchArcFromPost">Switch to Arc Testnet</button>` : ""}
            ${state.chainTransaction?.state && state.chainTransaction.state !== "idle" ? `
              <div class="post-task-alert post-task-alert--${state.chainTransaction.state === "failed" ? "warning" : "info"}">
                <strong>${escapeHtml(labelize(state.chainTransaction.state))}</strong>
                <p>${escapeHtml(state.chainTransaction.message)}</p>
              </div>
            ` : ""}
            <button class="hero-primary" id="fundTaskButton" ${fundingBlocked ? "disabled" : ""}>${escapeHtml(primaryActionLabel)}</button>
            <p class="post-checkout-note">USDC stays locked until you approve the work.</p>
            <p class="post-dashboard-guidance">After funding, this task will appear in your Dashboard.</p>
            <p class="post-funding-hint disabled-reason">${escapeHtml(fundingHint)}</p>
          </article>
        </aside>
      </section>

      <section class="mobile-action post-mobile-action">
        <span>${state.taskForm.rewardAmount ? formatCurrency(state.taskForm.rewardAmount) : "Reward not set"}</span>
        <button id="fundTaskMobile" ${fundingBlocked ? "disabled" : ""}>${escapeHtml(primaryActionLabel)}</button>
      </section>
    </section>
  `;

  const bindings = {
    taskTitle: "title",
    taskDescription: "description",
    taskCategory: "category",
    taskReward: "rewardAmount",
    taskDeadline: "deadline",
    taskEvaluationPreference: "evaluationPreference",
    taskStructuredNotes: "structuredNotes",
    selectedAgentId: "selectedAgentId",
    taskParticipants: "maxParticipants",
  };

  Object.entries(bindings).forEach(([id, key]) => {
    document.getElementById(id)?.addEventListener("input", (event) => {
      state.taskForm[key] = event.target.value;
      if (id === "selectedAgentId") renderPostTaskPage();
    });
  });

  document.getElementById("taskTemplateId")?.addEventListener("input", (event) => {
    state.taskForm.templateId = event.target.value;
    state.taskForm.templateFields = {};
    state.taskForm.selectedServicePackage = null;
    state.taskForm.templateMessage = event.target.value === "custom_task"
      ? "Custom selected. Write your own brief below."
      : "Fill the fields, then generate a brief.";
    const template = getTaskBriefTemplate(event.target.value);
    if (template?.category) state.taskForm.category = template.category;
    renderPostTaskPage();
  });

  document.querySelectorAll("[data-template-card]").forEach((node) => {
    node.addEventListener("click", () => {
      const templateId = node.dataset.templateCard;
      state.taskForm.templateId = templateId;
      state.taskForm.templateFields = {};
      state.taskForm.selectedServicePackage = null;
      state.taskForm.templateMessage = templateId === "custom_task"
        ? "Custom selected. Write your own brief below."
        : "Fill the fields, then generate a brief.";
      const template = getTaskBriefTemplate(templateId);
      if (template?.category) state.taskForm.category = template.category;
      renderPostTaskPage();
    });
  });

  document.querySelectorAll("[data-template-field]").forEach((node) => {
    node.addEventListener("input", (event) => {
      state.taskForm.templateFields = {
        ...(state.taskForm.templateFields || {}),
        [node.dataset.templateField]: event.target.value,
      };
      state.taskForm.templateMessage = "";
    });
  });

  document.getElementById("generateTaskBrief")?.addEventListener("click", () => {
    const result = buildTaskTemplateBrief(state.taskForm.templateId, state.taskForm.templateFields || {});
    if (result.isCustom) {
      state.taskForm.templateMessage = "Custom selected. Write your own brief below.";
      renderPostTaskPage();
      return;
    }
    if (result.missingFields.length) {
      state.taskForm.templateMessage = `Add required template fields first: ${result.missingFields.join(", ")}.`;
      renderPostTaskPage();
      return;
    }
    state.taskForm.description = result.brief;
    if (!state.taskForm.title.trim()) {
      state.taskForm.title = result.template.name;
    }
    if (result.template.category) {
      state.taskForm.category = result.template.category;
    }
    state.taskForm.templateMessage = "Brief generated. Review and edit it before funding the task.";
    renderPostTaskPage();
  });

  document.querySelectorAll("[data-mode]").forEach((node) => {
    node.addEventListener("click", () => {
      state.taskForm.hiringMode = node.dataset.mode;
      if (node.dataset.mode === "open_market") {
        state.taskForm.selectedAgentId = "";
      }
      renderPostTaskPage();
    });
  });

  document.querySelectorAll("[data-suggested-task]").forEach((node) => {
    node.addEventListener("click", () => {
      const idea = selectedAgentIdeas[Number(node.dataset.suggestedTask)];
      if (!idea) return;
      if (!state.taskForm.title.trim() && selectedAgent) {
        state.taskForm.title = `Task for ${selectedAgent.profile.publicName}`;
      }
      state.taskForm.description = idea;
      renderPostTaskPage();
    });
  });

  document.getElementById("switchArcFromPost")?.addEventListener("click", async () => {
    try {
      updateStatus("Switching network", "Requesting Arc Testnet in your wallet.", "neutral");
      const snapshot = await chainClient.switchWalletToArcTestnet();
      state.walletNetwork = { ...state.walletNetwork, ...snapshot, loading: false, error: "" };
      updateStatus("Arc Testnet ready", "Wallet is connected to Arc Testnet.", "success");
      renderPostTaskPage();
    } catch (error) {
      updateStatus("Network switch failed", statusMessage(error, "Could not switch to Arc Testnet."), "warn");
    }
  });

  document.getElementById("addAttachment")?.addEventListener("click", () => {
    const title = document.getElementById("attachmentTitle").value.trim();
    const pointer = document.getElementById("attachmentPointer").value.trim();
    const textContent = document.getElementById("attachmentText").value.trim();
    const fileInput = document.getElementById("attachmentFile");
    const uploadedText = fileInput?.dataset.inlineText || "";
    const inlineText = (textContent || uploadedText || "").trim();
    if (!title) {
      updateStatus("Attachment not added", "Add a title so the knowledge source is clear.", "warn");
      return;
    }
    if (!pointer && !inlineText) {
      updateStatus("Attachment not added", "Add either a pointer or readable text so the agent has something to work from.", "warn");
      return;
    }
    state.taskForm.attachments.push({
      id: `att_${Date.now()}`,
      title,
      pointer: pointer || `inline://attachments/${Date.now()}`,
      textContent: inlineText || null,
      mimeType: fileInput?.dataset.mimeType || (inlineText ? "text/plain" : null),
      sizeBytes: fileInput?.dataset.sizeBytes ? Number(fileInput.dataset.sizeBytes) : (inlineText ? inlineText.length : null),
      extractionSource: fileInput?.dataset.extractionSource || (inlineText ? "text" : null),
      truncated: fileInput?.dataset.truncated === "true",
    });
    document.getElementById("attachmentTitle").value = "";
    document.getElementById("attachmentPointer").value = "";
    document.getElementById("attachmentText").value = "";
    if (fileInput) {
      fileInput.value = "";
      delete fileInput.dataset.inlineText;
      delete fileInput.dataset.inlineName;
      delete fileInput.dataset.extractionSource;
      delete fileInput.dataset.truncated;
      delete fileInput.dataset.mimeType;
      delete fileInput.dataset.sizeBytes;
    }
    renderPostTaskPage();
  });

  document.getElementById("attachmentFile")?.addEventListener("change", async (event) => {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const { ingestAttachmentFile } = await loadAttachmentIngestionModule();
      const ingested = await ingestAttachmentFile(file);
      input.dataset.inlineText = ingested.textContent || "";
      input.dataset.inlineName = file.name;
      input.dataset.extractionSource = ingested.extractionSource;
      input.dataset.truncated = ingested.truncated ? "true" : "false";
      input.dataset.mimeType = ingested.mimeType || "";
      input.dataset.sizeBytes = ingested.sizeBytes ? String(ingested.sizeBytes) : "";
      const titleInput = document.getElementById("attachmentTitle");
      const pointerInput = document.getElementById("attachmentPointer");
      if (titleInput && !titleInput.value.trim()) {
        titleInput.value = ingested.title;
      }
      if (pointerInput && !pointerInput.value.trim()) {
        pointerInput.value = ingested.pointer;
      }
      updateStatus(
        "Attachment file loaded",
        `${file.name} was parsed as ${ingested.extractionSource.toUpperCase()} and is ready to attach as grounded text context${ingested.truncated ? " (truncated for safety)" : ""}.`,
        "success",
      );
    } catch (error) {
      updateStatus("Attachment file failed", statusMessage(error, "Could not extract readable text from that file."), "warn");
    }
  });

  [document.getElementById("fundTaskButton"), document.getElementById("fundTaskMobile")]
    .filter(Boolean)
    .forEach((node) => node.addEventListener("click", createTask));
  document.querySelector("[data-start-demo-flow]")?.addEventListener("click", (event) => {
    startDemoFlow(event.currentTarget);
  });
  revealSections(el.appRoot);
}

async function startDemoFlow(trigger) {
  try {
    setButtonLoading(trigger, true, "Starting");
    const payload = {
      creatorWallet: state.wallet?.trim() || "demo_buyer_wallet",
    };
    const response = await sendJson("/api/demo/thread-writer/start", "POST", payload);
    await loadMarketData();
    updateStatus("Demo task funded", response.message || "Thread Writer demo task is ready.", "success");
    navigate(`/tasks/${response.task.taskId}`);
  } catch (error) {
    updateStatus("Demo unavailable", statusMessage(error, "Local demo mode is unavailable."), "warn");
  } finally {
    setButtonLoading(trigger, false);
  }
}

async function advanceDemoFlow(taskId, trigger) {
  try {
    setButtonLoading(trigger, true, "Advancing");
    const response = await sendJson(`/api/demo/thread-writer/${taskId}/next`, "POST", {
      actorWallet: state.wallet?.trim() || "demo_buyer_wallet",
    });
    await loadMarketData();
    updateStatus("Demo advanced", response.message || "Demo task moved to the next lifecycle step.", "success");
    await renderTaskDetail(taskId);
  } catch (error) {
    updateStatus("Demo step failed", statusMessage(error, "Local demo mode is unavailable."), "warn");
  } finally {
    setButtonLoading(trigger, false);
  }
}

async function runTaskAction(taskId, action, trigger) {
  try {
    setButtonLoading(trigger, true, labelize(action));
    requireWallet();
    updateStatus("Submitting action", `Running ${labelize(action)} for this task.`, "neutral");
    if (action === "settle") {
      await sendJson(`/api/settlements/tasks/${taskId}/settle`, "POST", { actorWallet: state.wallet });
    } else if (action === "refund") {
      await sendJson(`/api/settlements/tasks/${taskId}/refund`, "POST", { actorWallet: state.wallet });
    } else if (action === "dispute") {
      const reason = window.prompt("Dispute reason", "Buyer disputes the current result quality and requests manual review.");
      if (!reason) {
        updateStatus("Dispute cancelled", "A dispute reason is required.", "warn");
        return;
      }
      await sendJson(`/api/settlements/tasks/${taskId}/dispute`, "POST", { actorWallet: state.wallet, reason });
    } else if (action === "appeal") {
      const reason = window.prompt("Appeal reason", "Buyer requests a stricter re-evaluation because the prior review outcome remains unsatisfactory.");
      if (!reason) {
        updateStatus("Appeal cancelled", "An appeal reason is required.", "warn");
        return;
      }
      await sendJson(`/api/task-market/tasks/${taskId}/appeal`, "POST", { actorWallet: state.wallet, reason });
    } else {
      await sendJson(`/api/task-market/tasks/${taskId}/${action}`, "POST", { actorWallet: state.wallet });
    }
    if (action === "settle") {
      burst("settled");
    } else if (action === "approve") {
      burst("publish");
    }
    updateStatus("Task updated", `${labelize(action)} completed successfully.`, action === "refund" ? "warn" : "success");
    await loadMarketData();
    await renderTaskDetail(taskId);
  } catch (error) {
    updateStatus("Action failed", statusMessage(error, "Action failed"), "warn");
  } finally {
    setButtonLoading(trigger, false);
  }
}

async function runAssistedReview(taskId, mode, trigger) {
  if (pendingTaskReviewActions.has(taskId)) {
    updateStatus("Review already running", "Please wait for the current review request to finish.", "neutral");
    return;
  }
  pendingTaskReviewActions.add(taskId);
  try {
    setButtonLoading(trigger, true, "Running review");
    requireWallet();
    const submissionId = state.task?.latestSubmissionId || `${taskId}-submission`;
    const path = mode === "hybrid" ? "hybrid" : "assisted";
    updateStatus("Evaluation running", `${labelize(mode)} is analyzing the output.`, "neutral");
    await sendJson(`/api/task-market/tasks/${taskId}/review/${path}`, "POST", {
      actorWallet: state.wallet,
      submissionId,
    });
    updateStatus("Evaluation ready", "The evaluation summary is now attached to the task.", "success");
    await renderTaskDetail(taskId);
  } catch (error) {
    updateStatus("Evaluation failed", statusMessage(error, "Evaluation failed"), "warn");
  } finally {
    pendingTaskReviewActions.delete(taskId);
    setButtonLoading(trigger, false);
  }
}

async function runUserDecision(taskId, decision, trigger) {
  if (pendingTaskReviewActions.has(taskId)) {
    updateStatus("Review already running", "Please wait for the current review request to finish.", "neutral");
    return;
  }
  pendingTaskReviewActions.add(taskId);
  try {
    setButtonLoading(trigger, true, decision === "approve" ? "Approving..." : "Rejecting...");
    requireWallet();
    const rejectionReason = decision === "reject"
      ? window.prompt("Why are you rejecting this result?", "Output did not meet the requested quality bar.")
      : "";
    if (decision === "reject" && !rejectionReason) {
      updateStatus("Rejection cancelled", "A rejection reason is required for this path.", "warn");
      return;
    }

    await sendJson(`/api/task-market/tasks/${taskId}/review/user`, "POST", {
      taskId,
      submissionId: state.task?.latestSubmissionId || `${taskId}-submission`,
      decision,
      starRating: decision === "approve" ? 5 : 2,
      feedback: decision === "approve" ? "Approved from the task detail page." : rejectionReason,
      rejectionReason: decision === "reject" ? rejectionReason : null,
      reviewerWallet: state.wallet,
    });

    updateStatus("Review captured", `User ${decision} recorded successfully.`, decision === "approve" ? "success" : "warn");
    await loadMarketData();
    await renderTaskDetail(taskId);
  } catch (error) {
    updateStatus("Review failed", statusMessage(error, "Review failed"), "warn");
  } finally {
    pendingTaskReviewActions.delete(taskId);
    setButtonLoading(trigger, false);
  }
}

async function requestRevision(taskId, trigger) {
  try {
    setButtonLoading(trigger, true, "Saving");
    requireWallet();
    const changeRequest = document.getElementById("revisionChangeRequest")?.value?.trim() || "";
    const missingDetails = document.getElementById("revisionMissingDetails")?.value?.trim() || "";
    const extraInstruction = document.getElementById("revisionExtraInstruction")?.value?.trim() || "";
    if (!changeRequest && !missingDetails) {
      updateStatus("Revision note needed", "Add what needs to change or what was missing before requesting a revision.", "warn");
      return;
    }

    const existing = state.revisionRequests?.[taskId] || [];
    const revisionRequest = {
      id: `revision_${Date.now()}`,
      taskId,
      changeRequest,
      missingDetails,
      extraInstruction,
      requestedAt: new Date().toISOString(),
      requestedBy: state.wallet,
    };
    state.revisionRequests = {
      ...(state.revisionRequests || {}),
      [taskId]: [revisionRequest, ...existing],
    };
    persistRevisionRequests();

    updateStatus(
      "Revision requested",
      "The request was saved locally. Payment remains locked until the work is approved.",
      "success",
    );
    await renderTaskDetail(taskId);
  } catch (error) {
    updateStatus("Revision request failed", statusMessage(error, "Revision request failed"), "warn");
  } finally {
    setButtonLoading(trigger, false);
  }
}

async function openLocalDispute(taskId, trigger) {
  try {
    setButtonLoading(trigger, true, "Opening");
    requireWallet();
    const reason = document.getElementById("disputeReason")?.value?.trim() || "";
    const details = document.getElementById("disputeDetails")?.value?.trim() || "";
    const requestedResolution = document.getElementById("disputeResolution")?.value?.trim() || "Request platform review";
    if (!reason) {
      updateStatus("Dispute reason needed", "Choose a reason before opening a dispute.", "warn");
      return;
    }
    if (!details) {
      updateStatus("Dispute details needed", "Add evidence or details so the dispute can be reviewed.", "warn");
      return;
    }

    const existing = state.disputeRecords?.[taskId] || [];
    const disputeRecord = {
      id: `dispute_${Date.now()}`,
      taskId,
      reason,
      details,
      requestedResolution,
      status: "under_review",
      openedAt: new Date().toISOString(),
      openedBy: state.wallet,
    };
    state.disputeRecords = {
      ...(state.disputeRecords || {}),
      [taskId]: [disputeRecord, ...existing],
    };
    persistDisputeRecords();

    updateStatus(
      "Dispute opened",
      "The dispute was saved locally. Payment remains locked during dispute.",
      "warn",
    );
    await renderTaskDetail(taskId);
  } catch (error) {
    updateStatus("Dispute failed", statusMessage(error, "Dispute failed"), "warn");
  } finally {
    setButtonLoading(trigger, false);
  }
}

async function runImproveAgain(taskId, trigger) {
  try {
    setButtonLoading(trigger, true, "Improving");
    requireWallet();
    updateStatus("Improve Again running", "The platform agent is refining the last result.", "neutral");
    await sendJson(`/api/task-market/tasks/${taskId}/improve-again`, "POST", {
      actorWallet: state.wallet,
    });
    updateStatus("Refinement started", "A controlled platform-agent refinement pass is now running.", "success");
    await loadMarketData();
    await renderTaskDetail(taskId);
  } catch (error) {
    updateStatus("Improve Again failed", statusMessage(error, "Improve Again failed"), "warn");
  } finally {
    setButtonLoading(trigger, false);
  }
}

async function renderTaskDetail(taskId) {
  const renderToken = ++activeTaskDetailRenderToken;
  setChrome(
    "Task Detail",
    "Task Detail",
    "Funded execution, owner review, and settlement in one page.",
    "Funding state, participating agents, submitted output, review controls, and Arc payout history stay legible in one view.",
    82,
  );

  el.appRoot.innerHTML = `
    <section data-structure="task-detail-loading" class="loading-shell">
      <div class="loading-shell__copy">
        <strong>Loading task...</strong>
        <p>Fetching funded work, review state, and payment history.</p>
      </div>
      <article class="skeleton"></article>
      <article class="skeleton"></article>
    </section>
  `;

  try {
    const [task, history] = await Promise.all([
      getJson(`/api/task-market/tasks/${taskId}`, validateTaskDetailResponse),
      getJson(`/api/settlements/tasks/${taskId}/history`, validateSettlementHistoryResponse).catch(() => ({ items: [] })),
    ]);
    state.task = task;
    state.history = history;
  } catch (error) {
    el.appRoot.innerHTML = `
      <div class="error-state state-card state-card--error shell-section surface-page">
        <span class="empty-state__mark" aria-hidden="true"></span>
        <strong>Task not found.</strong>
        <p>${escapeHtml(statusMessage(error, "This task is not available or has not loaded yet."))}</p>
        <div class="empty-state-actions">
          <button class="hero-primary" data-route="/">Go Home</button>
          <button data-route="/post-task">Post Funded Task</button>
        </div>
      </div>
    `;
    return;
  }

  const task = state.task;
  const localRevisionRequests = state.revisionRequests?.[task.taskId] || [];
  const localDisputeRecords = state.disputeRecords?.[task.taskId] || [];
  const displayTask = { ...task, revisionRequests: localRevisionRequests, disputeRecords: localDisputeRecords };
  const shouldProbeOnchainTask = Boolean(task.onchainTaskRef)
    || ["pending_wallet", "pending_chain"].includes(task.transactionState)
    || Boolean(task.latestCreateTxHash)
    || Boolean(task.latestFundTxHash)
    || Boolean(task.latestAssignTxHash);
  const reviewModel = buildReviewPanelModel(displayTask);
  renderTaskDetailPageView({
    el,
    task: displayTask,
    history: state.history,
    onchainSnapshot: null,
    reviewModel,
    resultModel: buildTaskResultModel(displayTask, []),
    revisionModel: buildTaskRevisionDisplayModel(displayTask),
    disputeModel: buildTaskDisputeDisplayModel(displayTask),
  });
  bindTaskDetailActions(displayTask);

  const shouldAutoCheckFunding = ["pending_wallet", "pending_chain"].includes(task.transactionState)
    && (task.latestCreateTxHash || task.latestFundTxHash || task.latestAssignTxHash)
    && !pendingTaskAutoChecks.has(task.taskId);
  if (shouldAutoCheckFunding) {
    pendingTaskAutoChecks.add(task.taskId);
    queueMicrotask(() => {
      void checkFundingStatus(task.taskId, null, { silent: true, auto: true }).finally(() => {
        pendingTaskAutoChecks.delete(task.taskId);
      });
    });
  }

  queueMicrotask(async () => {
    const [taskRuns, onchainSnapshot] = await Promise.all([
      getJson(`/api/execution/tasks/${taskId}/runs`, (payload) => payload).catch(() => ({ items: [] })),
      shouldProbeOnchainTask ? chainClient.readOnchainTask(task.taskId).catch(() => null) : Promise.resolve(null),
    ]);
    if (renderToken !== activeTaskDetailRenderToken || window.location.pathname !== `/tasks/${taskId}`) {
      return;
    }
    renderTaskDetailPageView({
      el,
      task: displayTask,
      history: state.history,
      onchainSnapshot,
      reviewModel,
      resultModel: buildTaskResultModel(displayTask, taskRuns.items || []),
      revisionModel: buildTaskRevisionDisplayModel(displayTask),
      disputeModel: buildTaskDisputeDisplayModel(displayTask),
    });
    bindTaskDetailActions(displayTask);
  });
}

function bindTaskDetailActions(task) {
  document.querySelectorAll("[data-task-action]").forEach((node) => {
    node.addEventListener("click", () => runTaskAction(node.dataset.taskId || task.taskId, node.dataset.taskAction, node));
  });
  document.querySelectorAll("[data-eval]").forEach((node) => {
    node.addEventListener("click", () => runAssistedReview(task.taskId, node.dataset.eval, node));
  });
  document.querySelectorAll("[data-user-review]").forEach((node) => {
    node.addEventListener("click", () => runUserDecision(task.taskId, node.dataset.userReview, node));
  });
  document.querySelectorAll("[data-request-revision]").forEach((node) => {
    node.addEventListener("click", () => requestRevision(node.dataset.requestRevision || task.taskId, node));
  });
  document.querySelectorAll("[data-request-revision-toggle]").forEach((node) => {
    node.addEventListener("click", () => document.getElementById("revisionChangeRequest")?.focus());
  });
  document.querySelectorAll("[data-open-dispute]").forEach((node) => {
    node.addEventListener("click", () => openLocalDispute(node.dataset.openDispute || task.taskId, node));
  });
  document.querySelectorAll("[data-open-dispute-toggle]").forEach((node) => {
    node.addEventListener("click", () => document.getElementById("disputeReason")?.focus());
  });
  document.querySelectorAll("[data-platform-improve]").forEach((node) => {
    node.addEventListener("click", () => runImproveAgain(task.taskId, node));
  });
  document.querySelectorAll("[data-check-funding]").forEach((node) => {
    node.addEventListener("click", () => checkFundingStatus(task.taskId, node));
  });
  document.querySelectorAll("[data-demo-next]").forEach((node) => {
    node.addEventListener("click", () => advanceDemoFlow(node.dataset.demoNext || task.taskId, node));
  });
}

async function checkFundingStatus(taskId, trigger, options = {}) {
  try {
    if (trigger) setButtonLoading(trigger, true, "Checking");
    const task = await getJson(`/api/task-market/tasks/${taskId}`, validateTaskDetailResponse);
    const writeResult = {
      createTxHash: task.latestCreateTxHash || "draft_only",
      fundTxHash: task.latestFundTxHash || `missing_fund:${taskId}`,
      assignTxHash: task.latestAssignTxHash || null,
      onchainTaskRef: task.onchainTaskRef || null,
    };
    const candidateHashes = [
      task.latestAssignTxHash,
      task.latestFundTxHash,
      task.latestCreateTxHash,
    ].filter((hash) => typeof hash === "string" && hash.startsWith("0x"));

    if (candidateHashes.length === 0) {
      if (!options.silent) {
        updateStatus("Funding still unconfirmed", "No browser transaction hash is available yet for this task.", "warn");
      }
      return;
    }

    let latestReceipt = null;
    for (const hash of candidateHashes) {
      latestReceipt = await chainClient.pollReceipt(hash, { intervalMs: 1500, maxAttempts: 4 }).catch(() => null);
      if (latestReceipt) break;
    }
    if (!latestReceipt) {
      latestReceipt = await chainClient.findSuccessfulExternalReceipt([
        task.latestAssignTxHash,
        task.latestFundTxHash,
        task.latestCreateTxHash,
      ]).catch(() => null);
    }

    if (!latestReceipt) {
      const onchainSnapshot = await chainClient.readOnchainTask(taskId).catch(() => null);
      const onchainTask = onchainSnapshot?.onchainTask || null;
      const onchainState = String(onchainTask?.state || "").toUpperCase();
      const escrowLocked = readBigIntLike(onchainTask?.escrow_locked ?? onchainTask?.escrowLocked ?? 0n);
      const fundingStateConfirmed = escrowLocked > 0n && [
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

      if (!fundingStateConfirmed) {
        if (!options.silent) {
          updateStatus("Funding still unconfirmed", "No confirmed Arc receipt was found for the captured browser transaction hashes yet.", "warn");
        }
        return;
      }

      latestReceipt = {
        hash: task.latestAssignTxHash || task.latestFundTxHash || task.latestCreateTxHash || "onchain_state_confirmed",
        status: "ACCEPTED",
        accepted: true,
        finalized: false,
        undetermined: false,
        contractAddress: null,
        blockNumber: null,
      };
    }

    const sync = await chainClient.syncTask(taskId, writeResult, latestReceipt);
    await loadMarketData().catch(() => {});
    await renderTaskDetail(taskId);

    if (sync.task.transactionState === "accepted") {
      if (!options.silent) {
        updateStatus("Funding confirmed", `Arc receipt ${latestReceipt.status} was found and the task state was updated.`, "success");
      }
      return;
    }

    if (!options.silent) {
      updateStatus(
        "Funding still pending",
        `Arc receipt ${latestReceipt.status} was found, but funding is still updating.`,
        "warn",
      );
    }
  } catch (error) {
    if (!options.silent) {
      updateStatus("Funding check failed", statusMessage(error, "Funding check failed"), "warn");
    }
  } finally {
    if (trigger) setButtonLoading(trigger, false);
  }
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

function renderCreateAgent() {
  setChrome(
    "Create Agent",
    "Create Agent",
    "Shape a capable marketplace worker without drowning in setup.",
    "Identity, behavior, skills, tools, knowledge, schema, and test previews should feel ready for funded work and owner-approved outcomes.",
    Math.round((state.wizardStep / 7) * 100),
  );
  renderCreateAgentWizardPage({ el, state });

  document.querySelectorAll("[data-step]").forEach((node) => {
    node.addEventListener("click", () => {
      state.wizardStep = Number(node.dataset.step);
      renderCreateAgent();
    });
  });

  [
    ["agentIdentityName", ["identity", "name"]],
    ["agentIdentitySlug", ["identity", "slug"]],
    ["agentIdentityCategory", ["identity", "category"]],
    ["agentIdentityTagline", ["identity", "tagline"]],
    ["agentIdentityTags", ["identity", "tags"]],
    ["agentBehaviorPrompt", ["behavior", "systemPrompt"]],
    ["agentBehaviorProhibited", ["behavior", "prohibited"]],
    ["agentBehaviorTone", ["behavior", "tone"]],
    ["agentBehaviorQuality", ["behavior", "quality"]],
    ["agentSchemaOutputExample", ["schema", "outputExample"]],
  ].forEach(([id, path]) => {
    const node = document.getElementById(id);
    const eventName = node?.tagName === "SELECT" ? "change" : "input";
    node?.addEventListener(eventName, (event) => {
      const value = id === "agentBehaviorQuality"
        ? Number(event.target.value || 0)
        : id === "agentIdentityTags"
          ? uniqueItems(splitListInput(event.target.value))
          : event.target.value;
      state.agentDraft[path[0]][path[1]] = value;
      if (path[0] === "identity" && path[1] === "name") {
        if (!state.agentDraft.identity.slug || state.agentDraft.identity.slug === slugifyDraftName("")) {
          state.agentDraft.identity.slug = slugifyDraftName(value);
          document.getElementById("agentIdentitySlug")?.setAttribute("value", state.agentDraft.identity.slug);
        }
        document.getElementById("wizardPreviewName")?.replaceChildren(document.createTextNode(state.agentDraft.identity.name));
      }
      if (path[0] === "identity" && path[1] === "tagline") {
        document.getElementById("wizardPreviewTagline")?.replaceChildren(document.createTextNode(state.agentDraft.identity.tagline));
      }
      if (id === "agentIdentityCategory") {
        renderCreateAgent();
      }
    });
  });

  document.querySelectorAll("[data-skill-suggestion]").forEach((node) => {
    node.addEventListener("click", () => {
      state.agentDraft.identity.tags = uniqueItems([...state.agentDraft.identity.tags, node.dataset.skillSuggestion]);
      renderCreateAgent();
    });
  });

  document.getElementById("wizardPrev")?.addEventListener("click", () => {
    state.wizardStep = Math.max(1, state.wizardStep - 1);
    renderCreateAgent();
  });

  document.getElementById("wizardNext")?.addEventListener("click", async (event) => {
    try {
      setButtonLoading(event.currentTarget, true, state.wizardStep === 7 ? "Saving draft" : "Saving step");
      await ensureAgentDraftSaved();
      if (state.wizardStep === 7) {
        burst("publish");
        updateStatus(
          "Agent draft saved",
          "This agent draft is saved. Final listing still needs owner proof and registry setup.",
          "success",
        );
        renderCreateAgent();
        return;
      }
      state.wizardStep += 1;
      updateStatus("Draft saved", "This step is now saved to the agent draft.", "success");
      renderCreateAgent();
    } catch (error) {
      setAgentDraftSyncState("error", statusMessage(error, "Could not save the agent draft."));
      updateStatus("Draft sync failed", statusMessage(error, "Could not save the agent draft."), "warn");
      renderCreateAgent();
    } finally {
      setButtonLoading(event.currentTarget, false);
    }
  });

  document.querySelectorAll("[data-tool]").forEach((node) => {
    node.addEventListener("click", () => {
      const tool = node.dataset.tool;
      if (state.agentDraft.tools.includes(tool)) {
        state.agentDraft.tools = state.agentDraft.tools.filter((item) => item !== tool);
      } else {
        state.agentDraft.tools.push(tool);
      }
      renderCreateAgent();
    });
  });

  document.getElementById("addKnowledge")?.addEventListener("click", () => {
    const title = document.getElementById("knowledgeTitle").value.trim();
    const pointer = document.getElementById("knowledgePointer").value.trim();
    if (!title || !pointer) {
      updateStatus("Knowledge source not added", "Add both a title and a pointer to keep the source legible.", "warn");
      return;
    }
    state.agentDraft.knowledge.push({ id: `knowledge_${Date.now()}`, title, pointer, kind: inferKnowledgeKind(pointer) });
    renderCreateAgent();
  });

  document.getElementById("runTest")?.addEventListener("click", async (event) => {
    try {
      setButtonLoading(event.currentTarget, true, "Running test");
      const result = await runAgentDraftTestPreview();
      updateStatus(
        "Test complete",
        result.parseValid
          ? "The draft produced a valid test result."
          : "The test ran, but the output shape still needs work before publishing.",
        result.parseValid ? "success" : "warn",
      );
      renderCreateAgent();
    } catch (error) {
      state.agentDraft.testRun.result = null;
      state.agentDraft.testRun.latencyMs = null;
      state.agentDraft.testRun.valid = false;
      state.agentDraft.testRun.error = statusMessage(error, "Test failed. Check the instructions and try again.");
      setAgentDraftSyncState("error", state.agentDraft.testRun.error);
      updateStatus("Test failed", state.agentDraft.testRun.error, "warn");
      renderCreateAgent();
    } finally {
      setButtonLoading(event.currentTarget, false);
    }
  });
}

function renderConnectExternalAgent() {
  setChrome(
    "Connect External Agent",
    "Connect External Agent",
    "Bring an endpoint-backed worker into the funded marketplace cleanly.",
    "Describe the agent, add its endpoint, verify owner wallet, and connect it for funded work.",
    84,
  );
  renderConnectExternalAgentPage({ el, state });

  [
    ["externalAgentName", "publicName"],
    ["externalAgentSlug", "slug"],
    ["externalAgentCategory", "category"],
    ["externalAgentDescription", "description"],
    ["externalAgentEndpoint", "endpointUrl"],
    ["externalAgentWebhook", "webhookUrl"],
    ["externalAgentDeveloper", "developerName"],
    ["externalAgentAdapterType", "adapterType"],
    ["externalAgentOutputSchema", "outputSchema"],
    ["externalAgentPayoutWallet", "payoutWallet"],
    ["externalAgentSkills", "skills"],
    ["externalAgentPricingHint", "pricingHint"],
    ["externalAgentMinLatency", "minLatencyMs"],
    ["externalAgentMaxLatency", "maxLatencyMs"],
    ["externalAgentMaxPayload", "maxPayloadSize"],
  ].forEach(([id, key]) => {
    const node = document.getElementById(id);
    const eventName = node?.tagName === "SELECT" ? "change" : "input";
    node?.addEventListener(eventName, (event) => {
      const rawValue = event.target.value;
      const nextValue = ["minLatencyMs", "maxLatencyMs", "maxPayloadSize"].includes(key)
        ? Number(rawValue || 0)
        : key === "skills"
          ? uniqueItems(splitListInput(rawValue))
          : rawValue;
      state.externalAgentForm[key] = nextValue;
      if (key === "category") {
        renderConnectExternalAgent();
      }
    });
  });

  document.querySelectorAll("[data-external-skill]").forEach((node) => {
    node.addEventListener("click", () => {
      state.externalAgentForm.skills = uniqueItems([...state.externalAgentForm.skills, node.dataset.externalSkill]);
      renderConnectExternalAgent();
    });
  });

  document.getElementById("verifyExternalOwner")?.addEventListener("click", async (event) => {
    try {
      setButtonLoading(event.currentTarget, true, "Verifying");
      await verifyExternalAgentOwnerProof();
      updateStatus("Owner proof verified", state.externalAgentMeta.verificationMessage, "success");
      renderConnectExternalAgent();
    } catch (error) {
      state.externalAgentMeta.verificationState = "error";
      state.externalAgentMeta.verificationMessage = statusMessage(error, "Owner proof verification failed.");
      updateStatus("Owner proof failed", state.externalAgentMeta.verificationMessage, "warn");
      renderConnectExternalAgent();
    } finally {
      setButtonLoading(event.currentTarget, false);
    }
  });

  document.getElementById("connectExternalAgent")?.addEventListener("click", async (event) => {
    try {
      setButtonLoading(event.currentTarget, true, "Connecting");
      if (!state.externalAgentMeta.ownerProofId) {
        await verifyExternalAgentOwnerProof();
      }
      const agent = await connectExternalAgent();
      updateStatus("External agent connected", "The endpoint-backed worker is now listed in the marketplace.", "success");
      navigate(`/agents/${agent.profile.slug}`);
    } catch (error) {
      state.externalAgentMeta.compatibilityHeadline = "Connection failed";
      state.externalAgentMeta.compatibilityNotes = [statusMessage(error, "The external agent could not be connected.")];
      updateStatus("Connect agent failed", statusMessage(error, "The external agent could not be connected."), "warn");
      renderConnectExternalAgent();
    } finally {
      setButtonLoading(event.currentTarget, false);
    }
  });
}

function renderDashboard() {
  setChrome(
    "Dashboard",
    "Dashboard",
    "Track funded tasks, agents, payments, and actions that need review.",
    "Use one dashboard for visible task activity, agent setup, and earnings.",
    86,
  );
  renderDashboardPage({ el, state, onNavigate: navigate, rerender: renderDashboard });
}

function nanoWalletParam() {
  return encodeURIComponent(state.wallet.trim());
}

function selectedNanoBudget() {
  return state.nano.activity?.budget
    || state.nano.budgets.find((budget) => budget.budgetId === state.nano.selectedBudgetId)
    || state.nano.budgets[0]
    || null;
}

function selectedNanoReceiptsByIntent() {
  return new Map((state.nano.activity?.receipts || []).map((receipt) => [receipt.intentId, receipt]));
}

function makeNanoLocalProof(label, notes = []) {
  return {
    proofType: "local",
    paymentState: "recorded",
    txHash: null,
    proofReference: `local:${label}:${Date.now()}`,
    recordedAt: new Date().toISOString(),
    notes,
  };
}

function selectedNanoArcProofIntent(intents, receiptsByIntent) {
  const requestedId = state.nano.arcProofIntentId;
  const payableSourceIntents = intents.filter((intent) => intent?.payee?.payeeId === "source_unlock");
  return payableSourceIntents.find((intent) => intent.intentId === requestedId && !receiptsByIntent.has(intent.intentId))
    || payableSourceIntents.find((intent) => intent.status === "approved" && !receiptsByIntent.has(intent.intentId))
    || payableSourceIntents.find((intent) => !receiptsByIntent.has(intent.intentId))
    || null;
}

function nanoApiErrorMessage(error, fallback = nanoApiUnavailableMessage()) {
  const message = statusMessage(error, fallback);
  if (/Request failed for \/api\/nano|Failed to fetch|NetworkError|404|not found/i.test(message)) {
    return fallback;
  }
  return message;
}

function nanoArcProofErrorMessage(error) {
  const message = statusMessage(error, "Arc proof verification is temporarily unavailable.");
  if (/Request failed for \/api\/nano|Failed to fetch|NetworkError|404|not found/i.test(message)) {
    return "Arc proof verification is temporarily unavailable.";
  }
  return message;
}

async function refreshNanoActivity(budgetId = state.nano.selectedBudgetId) {
  if (!budgetId || !state.wallet.trim()) {
    state.nano.activity = null;
    return null;
  }
  state.nano.activityLoading = true;
  state.nano.activityError = "";
  try {
    const activity = await getJson(
      `/api/nano/budgets/${encodeURIComponent(budgetId)}/activity?wallet=${nanoWalletParam()}`,
      validateNanoBudgetActivityResponse,
    );
    state.nano.activity = activity;
    state.nano.selectedBudgetId = activity.budget.budgetId;
    state.nano.runActivities = { ...(state.nano.runActivities || {}), [activity.budget.budgetId]: activity };
    return activity;
  } catch (error) {
    state.nano.activityError = nanoApiErrorMessage(error, nanoApiUnavailableMessage());
    return null;
  } finally {
    state.nano.activityLoading = false;
  }
}

async function refreshNanoRunHistoryActivities(budgets = state.nano.budgets) {
  if (!state.wallet.trim() || !budgets.length) {
    state.nano.runActivities = {};
    return;
  }
  state.nano.runHistoryLoading = true;
  state.nano.runHistoryError = "";
  const entries = await Promise.allSettled(budgets.map(async (budget) => {
    if (state.nano.runActivities?.[budget.budgetId]) return [budget.budgetId, state.nano.runActivities[budget.budgetId]];
    const activity = await getJson(
      `/api/nano/budgets/${encodeURIComponent(budget.budgetId)}/activity?wallet=${nanoWalletParam()}`,
      validateNanoBudgetActivityResponse,
    );
    return [budget.budgetId, activity];
  }));
  const nextActivities = { ...(state.nano.runActivities || {}) };
  let failed = false;
  for (const result of entries) {
    if (result.status === "fulfilled") {
      const [budgetId, activity] = result.value;
      nextActivities[budgetId] = activity;
    } else {
      failed = true;
    }
  }
  state.nano.runActivities = nextActivities;
  state.nano.runHistoryError = failed
    ? "Some receipt details are temporarily unavailable."
    : "";
  state.nano.runHistoryLoading = false;
}

async function refreshNanoData() {
  if (!state.wallet.trim()) {
    state.nano.budgets = [];
    state.nano.budgetsLoaded = false;
    state.nano.activity = null;
    state.nano.runActivities = {};
    state.nano.runHistoryLoading = false;
    state.nano.runHistoryError = "";
    state.nano.metrics = null;
    return;
  }
  state.nano.healthLoading = true;
  state.nano.budgetsLoading = true;
  state.nano.metricsLoading = true;
  state.nano.runHistoryLoading = true;
  state.nano.healthError = "";
  state.nano.budgetsError = "";
  state.nano.metricsError = "";
  state.nano.runHistoryError = "";
  try {
    const [healthResult, budgetsResult, metricsResult] = await Promise.allSettled([
      getJson("/api/nano/health", validateNanoHealthResponse),
      getJson(`/api/nano/budgets?wallet=${nanoWalletParam()}`, validateNanoBudgetListResponse),
      getJson(`/api/nano/metrics?wallet=${nanoWalletParam()}`, validateNanoMetricsResponse),
    ]);
    if (healthResult.status === "fulfilled") {
      state.nano.health = healthResult.value;
    } else {
      state.nano.healthError = nanoApiErrorMessage(healthResult.reason);
    }
    if (budgetsResult.status === "fulfilled") {
      state.nano.budgets = budgetsResult.value.items || [];
      state.nano.budgetsLoaded = true;
      if (!state.nano.selectedBudgetId || !state.nano.budgets.some((budget) => budget.budgetId === state.nano.selectedBudgetId)) {
        state.nano.selectedBudgetId = state.nano.budgets[0]?.budgetId || "";
      }
    } else {
      state.nano.budgetsError = nanoApiErrorMessage(budgetsResult.reason);
    }
    if (metricsResult.status === "fulfilled") {
      state.nano.metrics = metricsResult.value;
    } else {
      state.nano.metricsError = nanoApiErrorMessage(metricsResult.reason);
    }
    if (state.nano.selectedBudgetId) {
      await refreshNanoActivity(state.nano.selectedBudgetId);
    }
    if (state.nano.budgets.length) {
      await refreshNanoRunHistoryActivities(state.nano.budgets);
    }
  } finally {
    state.nano.healthLoading = false;
    state.nano.budgetsLoading = false;
    state.nano.metricsLoading = false;
    state.nano.runHistoryLoading = false;
  }
}

function startNanoRefresh() {
  const walletKey = state.wallet.trim().toLowerCase();
  if (!walletKey || state.nano.budgetsLoading) return;
  if (nanoAutoRefreshWalletKey === walletKey) return;
  nanoAutoRefreshWalletKey = walletKey;
  void refreshNanoData().finally(() => {
    if (window.location.pathname === "/nano") safeRender("Nano refresh render failed");
  });
}

function renderNanoBudgetOptions() {
  if (!state.nano.budgets.length) return "";
  return `
    <label class="nano-field nano-field--compact">
      <span>Active budget</span>
      <select id="nanoBudgetSelect">
        ${state.nano.budgets.map((budget) => `
          <option value="${escapeHtml(budget.budgetId)}" ${budget.budgetId === state.nano.selectedBudgetId ? "selected" : ""}>
            ${escapeHtml(formatNanoUsdc(budget.amount))} - ${escapeHtml(buildNanoBudgetStatusModel(budget).label)}
          </option>
        `).join("")}
      </select>
    </label>
  `;
}

function renderNanoPage() {
  setChrome(
    "Dispatch Nano",
    "Dispatch Nano",
    "Route a user-funded USDC budget through agents, tools, and sources.",
    "Tiny Arc Testnet payment trails for agent work, without fake settlement claims.",
    90,
  );

  if (state.wallet.trim() && !state.nano.budgetsLoaded && !state.nano.budgetsLoading) {
    startNanoRefresh();
  }

  const walletConnected = Boolean(state.wallet.trim());
  const budget = selectedNanoBudget();
  const budgetStatus = buildNanoBudgetStatusModel(budget);
  const activity = state.nano.activity;
  const intents = activity?.spendIntents || [];
  const receipts = activity?.receipts || [];
  const receiptsByIntent = selectedNanoReceiptsByIntent();
  const metricsModel = buildNanoMetricsModel(state.nano.metrics, { activity });
  const sourcePayoutWalletModel = buildNanoRecipientWalletModel(state.nano.sourcePayoutWallet);
  const spendTotal = nanoPlannedSpendRows.reduce((total, item) => total + item.amount, 0);
  const mainAgentRemainder = Math.max(0, Number(((budget?.amount || 1) - spendTotal).toFixed(6)));
  const hasFullNanoPlan = nanoPlannedSpendRows.every((plan) => intents.some((intent) => intent.payee.payeeId === plan.payeeId));
  const spendPlanPresentation = buildNanoSpendPlanPresentation({ hasBudget: Boolean(budget) });
  const allIntentsApproved = intents.length > 0 && intents.every((intent) => ["approved", "payment_recorded"].includes(intent.status));
  const allReceiptsRecorded = intents.length > 0 && intents.every((intent) => receiptsByIntent.has(intent.intentId));
  const canCreatePlan = Boolean(budget) && !hasFullNanoPlan;
  const canRecordFundingProof = Boolean(budget) && !budget.fundingProof;
  const canApproveAny = Boolean(budget?.fundingProof) && intents.some((intent) => intent.status === "proposed");
  const canRecordAnyReceipt = intents.some((intent) => intent.status === "approved" && !receiptsByIntent.has(intent.intentId));

  el.appRoot.innerHTML = `
    <section data-structure="nano-budget-router" class="nano-page">
      <header class="nano-hero reveal-on-scroll is-visible">
        <p class="mini-label">Dispatch Nano</p>
        <h1>Give an agent a USDC budget.</h1>
        <p>Dispatch Nano lets an agent propose tiny payments to sources, tools, and other agents, then shows the payment trail.</p>
        <div class="nano-hero__actions">
          ${walletConnected
            ? `<span class="meta-pill">Wallet ${escapeHtml(shortWallet(state.wallet))}</span>`
            : `<button class="hero-primary" type="button" data-wallet="open">Connect wallet</button>`}
          <button class="hero-secondary" type="button" data-route="/post-task">Post funded task</button>
        </div>
      </header>

      ${!walletConnected ? `
        <section class="empty-state nano-wallet-state reveal-on-scroll">
          <span class="empty-state__mark" aria-hidden="true"></span>
          <div>
            <strong>Connect wallet to start Nano.</strong>
            <p>Your Nano budgets, spend intents, and receipts are linked to your wallet.</p>
            <div class="empty-state-actions">
              <button class="hero-primary" type="button" data-wallet="open">Connect wallet</button>
            </div>
          </div>
        </section>
      ` : `
        <section class="nano-flow reveal-on-scroll">
          ${[
            ["01", "Budget", "Create a 0.10 USDC budget"],
            ["02", "Plan", "Agent proposes spend intents"],
            ["03", "Proof", "Record honest payment proof"],
            ["04", "Trail", "Review receipts and result"],
          ].map(([number, title, helper]) => `
            <article>
              <strong>${number}</strong>
              <h3>${title}</h3>
              <p>${helper}</p>
            </article>
          `).join("")}
        </section>

        <section class="nano-layout">
          <div class="nano-main">
            <article class="nano-panel nano-budget-panel reveal-on-scroll">
              <div class="nano-section-head">
                <div>
                  <p class="mini-label">Budget</p>
                  <h2>Create a Nano budget</h2>
                  <p>Start with a 0.10 USDC budget draft. Funding proof is recorded separately.</p>
                </div>
                <span class="status-chip ${budgetStatus.tone === "good" ? "good" : budgetStatus.tone === "warn" ? "warn" : "pending"}">${escapeHtml(budgetStatus.label)}</span>
              </div>
              <div class="nano-form-grid">
                <label class="nano-field nano-field--wide">
                  <span>Agent goal</span>
                  <textarea id="nanoGoal" rows="4" placeholder="Create a short research-backed brief.">${escapeHtml(state.nano.budgetGoal)}</textarea>
                </label>
                <label class="nano-field">
                  <span>Budget amount</span>
                  <input id="nanoBudgetAmount" type="number" min="0.01" step="0.01" value="${escapeHtml(state.nano.budgetAmount)}" />
                  <small>Use 0.10 USDC for the source-payment flow.</small>
                </label>
                ${renderNanoBudgetOptions()}
              </div>
              <div class="nano-action-row">
                <button class="hero-primary" type="button" id="nanoCreateBudget" ${state.nano.actionPending ? "disabled" : ""}>Create 0.10 USDC budget</button>
                <button class="hero-secondary" type="button" id="nanoRefresh" ${state.nano.budgetsLoading ? "disabled" : ""}>Refresh</button>
              </div>
              ${state.nano.budgetsLoading ? `<p class="nano-helper">Loading your Nano budgets...</p>` : ""}
              ${state.nano.budgetsError ? `<p class="nano-helper nano-helper--warn">${escapeHtml(state.nano.budgetsError)}</p>` : ""}
              <p class="nano-helper">${escapeHtml(budgetStatus.helper)}</p>
            </article>

            <article class="nano-panel reveal-on-scroll">
              <div class="nano-section-head">
                <div>
                  <p class="mini-label">Spend plan</p>
                  <h2>Agent spend intents</h2>
                  <p>The agent proposes tiny USDC spends. Approval reserves budget; it is not payment.</p>
                </div>
                <span class="meta-pill">${escapeHtml(formatNanoUsdc(spendTotal))} planned</span>
              </div>
              <div class="nano-spend-plan">
                ${nanoPlannedSpendRows.map((plan) => {
                  const intent = intents.find((item) => item.payee.payeeId === plan.payeeId);
                  const receipt = intent ? receiptsByIntent.get(intent.intentId) : null;
                  const status = intent ? buildNanoSpendIntentStatusModel(intent, receipt) : { label: "Not proposed", tone: "pending", helper: "Create the spend plan to add this intent." };
                  return `
                    <article class="nano-spend-row">
                      <div>
                        <span class="nano-payee-type">${escapeHtml(labelize(plan.type))}</span>
                        <strong>${escapeHtml(plan.label)}</strong>
                        <p>${escapeHtml(plan.reason)}</p>
                      </div>
                      <div class="nano-spend-row__meta">
                        <strong>${escapeHtml(formatNanoUsdc(plan.amount))}</strong>
                        <span class="status-chip ${status.tone === "good" ? "good" : status.tone === "warn" ? "warn" : "pending"}">${escapeHtml(status.label)}</span>
                      </div>
                    </article>
                  `;
                }).join("")}
                <article class="nano-spend-row nano-spend-row--quiet">
                  <div>
                    <span class="nano-payee-type">Platform</span>
                    <strong>Main agent earnings</strong>
                    <p>Remaining budget after source, tool, and agent spend intents.</p>
                  </div>
                  <div class="nano-spend-row__meta">
                    <strong>${escapeHtml(formatNanoUsdc(mainAgentRemainder))}</strong>
                    <span class="status-chip pending">Planned remainder</span>
                  </div>
                </article>
              </div>
              <div class="nano-action-row">
                <button class="hero-primary" type="button" id="nanoCreatePlan" ${!canCreatePlan || state.nano.actionPending ? "disabled" : ""}>Create spend plan</button>
                <button class="hero-secondary" type="button" id="nanoRecordFundingProof" ${!canRecordFundingProof || state.nano.actionPending ? "disabled" : ""}>Record local funding proof</button>
                <button class="hero-secondary" type="button" id="nanoApproveSpend" ${!canApproveAny || state.nano.actionPending ? "disabled" : ""}>Approve spend intents</button>
              </div>
              <p class="nano-helper">Local receipt is for development only; it does not settle funds.</p>
            </article>

            <article class="nano-panel reveal-on-scroll">
              <div class="nano-section-head">
                <div>
                  <p class="mini-label">Payment trail</p>
                  <h2>Receipts and proof</h2>
                  <p>Only recorded receipts appear here. Missing proof stays visible.</p>
                </div>
                <span class="meta-pill">${receipts.length} receipt${receipts.length === 1 ? "" : "s"}</span>
              </div>
              <div class="nano-receipt-list">
                ${intents.length ? intents.map((intent) => {
                  const receipt = receiptsByIntent.get(intent.intentId);
                  const status = receipt ? buildNanoReceiptStatusModel(receipt) : buildNanoSpendIntentStatusModel(intent, null);
                  return `
                    <article class="nano-receipt-row">
                      <div>
                        <strong>${escapeHtml(intent.payee.label)}</strong>
                        <p>${escapeHtml(receipt?.contributionSummary || intent.reason)}</p>
                      </div>
                      <div>
                        <span>${escapeHtml(formatNanoUsdc(intent.amount))}</span>
                        <span class="status-chip ${status.tone === "good" ? "good" : status.tone === "warn" ? "warn" : "pending"}">${escapeHtml(status.label)}</span>
                      </div>
                    </article>
                  `;
                }).join("") : `
                  <div class="empty-inline">
                    <span class="empty-inline__mark" aria-hidden="true"></span>
                    <div><strong>No spend intents yet.</strong><p>Create a budget and spend plan to see the payment trail.</p></div>
                  </div>
                `}
              </div>
              <div class="nano-action-row">
                <button class="hero-primary" type="button" id="nanoRecordReceipts" ${!canRecordAnyReceipt || state.nano.actionPending ? "disabled" : ""}>Record local receipts</button>
              </div>
              <p class="nano-helper">No fake transaction hashes are created. Arc proof must verify before a spend is marked paid.</p>
            </article>

            <article class="nano-panel nano-result-panel reveal-on-scroll">
              <div class="nano-section-head">
                <div>
                  <p class="mini-label">Result preview</p>
                  <h2>Final brief</h2>
                  <p>The final output explains how each recorded source, tool, or agent contributed.</p>
                </div>
                <span class="status-chip ${allReceiptsRecorded ? "good" : allIntentsApproved ? "pending" : "pending"}">${allReceiptsRecorded ? "Receipts recorded" : allIntentsApproved ? "Awaiting receipts" : "Draft preview"}</span>
              </div>
              <div class="nano-result-copy">
                <strong>Research-backed launch brief</strong>
                <p>Position Dispatch Nano as source/tool unlock with Arc USDC proof: a user approves a tiny source payment, proof gates the paid label, and the final result shows what the source improved.</p>
                <ul>
                  <li>Lead with source value: the user sees why the agent wants the source/tool unlock.</li>
                  <li>Keep payment proof honest: local proof is recorded metadata, not settlement.</li>
                  <li>Make the trail easy to read: payee, reason, amount, and proof state sit together.</li>
                </ul>
              </div>
            </article>
          </div>

          <aside class="nano-side">
            <article class="nano-panel nano-checkout-panel reveal-on-scroll">
              <p class="mini-label">Run state</p>
              <h2>${budget ? escapeHtml(formatNanoUsdc(budget.amount)) : "No budget yet"}</h2>
              <div class="nano-summary-list">
                <div><span>Wallet</span><strong>${escapeHtml(shortWallet(state.wallet))}</strong></div>
                <div><span>Network</span><strong>Arc Testnet</strong></div>
                <div><span>Token</span><strong>USDC</strong></div>
                <div><span>Budget status</span><strong>${escapeHtml(budgetStatus.label)}</strong></div>
                <div><span>Available</span><strong>${escapeHtml(formatNanoUsdc(activity?.availableBudget || 0))}</strong></div>
              </div>
              ${state.nano.activityError ? `<p class="nano-helper nano-helper--warn">${escapeHtml(state.nano.activityError)}</p>` : ""}
            </article>

            <article class="nano-panel reveal-on-scroll">
              <p class="mini-label">${escapeHtml(metricsModel.sourceLabel)}</p>
              <h2>Nano activity</h2>
              <p>${escapeHtml(metricsModel.sourceHelper)}</p>
              <div class="nano-metrics-grid">
                <div><strong>${escapeHtml(metricsModel.budgetCount)}</strong><span>Budgets created</span></div>
                <div><strong>${escapeHtml(metricsModel.receiptCount)}</strong><span>Proof records</span></div>
                <div><strong>${escapeHtml(metricsModel.verifiedArcPaymentCount)}</strong><span>Verified Arc payments</span></div>
                <div><strong>${escapeHtml(metricsModel.totalVerifiedUsdcVolume)}</strong><span>Verified USDC volume</span></div>
              </div>
              ${!metricsModel.hasVerifiedPayments ? `
                <div class="empty-inline nano-empty-inline">
                  <span class="empty-inline__mark" aria-hidden="true"></span>
                  <div><strong>${escapeHtml(metricsModel.emptyTitle)}</strong><p>${escapeHtml(metricsModel.emptyBody)}</p></div>
                </div>
              ` : `
                <div class="nano-metrics-detail">
                  <div><span>Average verified payment</span><strong>${escapeHtml(metricsModel.averageVerifiedPaymentSize)}</strong></div>
                  <div><span>Latest proof status</span><strong>${escapeHtml(metricsModel.latestProofStatus)}</strong></div>
                </div>
              `}
              ${state.nano.metricsLoading ? `<p class="nano-helper">Loading Nano metrics...</p>` : ""}
              ${state.nano.metricsError ? `<p class="nano-helper nano-helper--warn">${escapeHtml(state.nano.metricsError)}</p>` : ""}
            </article>

            <article class="nano-panel nano-note-panel reveal-on-scroll">
              <p class="mini-label">Honesty note</p>
              <h2>Proof-aware demo</h2>
              <p>Phase 2 records budget and receipt metadata only. Real Arc/Circle payment proof is planned for Phase 3.</p>
            </article>
          </aside>
        </section>
      `}
    </section>
  `;

  document.getElementById("nanoGoal")?.addEventListener("input", (event) => {
    state.nano.budgetGoal = event.target.value;
    const primaryButton = document.getElementById("nanoPrimaryAction");
    if (primaryButton?.dataset.nanoAction === "budget") {
      primaryButton.disabled = !(validateNanoBudgetAmount(state.nano.budgetAmount).valid && state.nano.budgetGoal.trim()) || Boolean(state.nano.actionPending);
    }
  });
  document.getElementById("nanoBudgetAmount")?.addEventListener("input", (event) => {
    state.nano.budgetAmount = event.target.value;
  });
  document.getElementById("nanoBudgetSelect")?.addEventListener("change", async (event) => {
    state.nano.selectedBudgetId = event.target.value;
    state.nano.activity = null;
    renderNanoPage();
    await refreshNanoActivity(event.target.value);
    renderNanoPage();
  });
  document.getElementById("nanoRefresh")?.addEventListener("click", async () => {
    await withNanoAction("refresh", refreshNanoData);
  });
  document.getElementById("nanoCreateBudget")?.addEventListener("click", async () => {
    await withNanoAction("budget", createNanoBudgetDraft);
  });
  document.getElementById("nanoCreatePlan")?.addEventListener("click", async () => {
    await withNanoAction("plan", createNanoSpendPlan);
  });
  document.getElementById("nanoRecordFundingProof")?.addEventListener("click", async () => {
    await withNanoAction("fundingProof", recordNanoFundingProof);
  });
  document.getElementById("nanoApproveSpend")?.addEventListener("click", async () => {
    await withNanoAction("approve", approveNanoSpendIntents);
  });
  document.getElementById("nanoRecordReceipts")?.addEventListener("click", async () => {
    await withNanoAction("receipts", recordNanoReceipts);
  });
  revealSections(el.appRoot);
}

function renderNanoPageSimplified() {
  setChrome(
    "Dispatch Nano",
    "Dispatch Nano",
    "AI agent source payments on Arc.",
    "Approve a tiny source/tool payment, verify proof, and see what the paid source improved.",
    90,
  );

  if (state.wallet.trim() && !state.nano.budgetsLoaded && !state.nano.budgetsLoading) {
    startNanoRefresh();
  }

  const walletConnected = Boolean(state.wallet.trim());
  const walletWrongNetwork = walletConnected && state.walletNetwork.chainId != null && !state.walletNetwork.isArcTestnet;
  const walletBalance = state.walletNetwork.usdcBalance == null
    ? "Balance unavailable"
    : `${Number(state.walletNetwork.usdcBalance).toLocaleString(undefined, { maximumFractionDigits: 6 })} USDC`;
  const budget = selectedNanoBudget();
  const budgetStatus = buildNanoBudgetStatusModel(budget);
  const activity = state.nano.activity;
  const intents = activity?.spendIntents || [];
  const receipts = activity?.receipts || [];
  const receiptsByIntent = selectedNanoReceiptsByIntent();
  const metricsModel = buildNanoMetricsModel(state.nano.metrics, { activity });
  const runHistoryModel = buildNanoRunHistoryModel({
    wallet: state.wallet,
    budgets: state.nano.budgets,
    activities: state.nano.runActivities,
    selectedBudgetId: state.nano.selectedBudgetId,
    loading: state.nano.runHistoryLoading,
    error: state.nano.runHistoryError,
  });
  const receiptDetailModel = buildNanoReceiptDetailModel(
    state.nano.runActivities?.[state.nano.selectedBudgetId] || activity,
    state.nano.selectedBudgetId,
  );
  const selectedRunModel = buildNanoSelectedRunModel({
    selectedBudgetId: state.nano.selectedBudgetId,
    budget,
    activity: state.nano.runActivities?.[state.nano.selectedBudgetId] || activity,
  });
  const budgetValidation = validateNanoBudgetAmount(state.nano.budgetAmount);
  const goalValid = Boolean(state.nano.budgetGoal.trim());
  const sourcePayoutWalletModel = buildNanoRecipientWalletModel(state.nano.sourcePayoutWallet);
  const sourcePlan = nanoPlannedSpendRows.find((plan) => plan.payeeId === "source_unlock");
  const sourceIntent = intents.find((intent) => intent.payee.payeeId === "source_unlock") || null;
  const sourceReceipt = sourceIntent ? receiptsByIntent.get(sourceIntent.intentId) : null;
  const spendTotal = nanoPlannedSpendRows.reduce((total, item) => total + item.amount, 0);
  const mainAgentRemainder = Math.max(0, Number(((budget?.amount || budgetValidation.amount || 0.1) - spendTotal).toFixed(6)));
  const hasFullNanoPlan = nanoPlannedSpendRows.every((plan) => intents.some((intent) => intent.payee.payeeId === plan.payeeId));
  const spendPlanPresentation = buildNanoSpendPlanPresentation({ hasBudget: Boolean(budget) });
  const canApproveAny = Boolean(budget?.fundingProof) && intents.some((intent) => intent.status === "proposed");
  const arcProofIntent = selectedNanoArcProofIntent(intents, receiptsByIntent);
  const enteredRecipientWallet = sourcePayoutWalletModel.valid ? sourcePayoutWalletModel.wallet : "";
  const arcProofPayeeWallet = arcProofIntent?.payee?.walletAddress || enteredRecipientWallet || "";
  const arcProofIntentForAction = arcProofIntent
    ? { ...arcProofIntent, payee: { ...arcProofIntent.payee, walletAddress: arcProofPayeeWallet || null } }
    : null;
  const arcProofReceipt = arcProofIntent ? receiptsByIntent.get(arcProofIntent.intentId) : null;
  const canVerifyArcProof = Boolean(arcProofIntent && !arcProofReceipt && state.nano.arcProofTxHash.trim());
  const hasApprovedSpend = intents.some((intent) => intent.status === "approved");
  const hasPendingApprovedSpend = intents.some((intent) => intent.status === "approved" && !receiptsByIntent.has(intent.intentId));
  const sourceUnlock = buildNanoSourceUnlockPresentation({
    hasBudget: Boolean(budget),
    intent: sourceIntent,
    receipt: sourceReceipt,
    recipientWalletModel: sourcePayoutWalletModel,
  });
  const multiSpendPlan = buildNanoMultiSpendPlanRows({
    planRows: nanoPlannedSpendRows,
    intents,
    receiptsByIntent,
  });
  const budgetGuardrails = buildNanoBudgetGuardrailModel({
    budget,
    spendRows: multiSpendPlan.rows,
  });
  const nanoPayAction = buildNanoPaymentActionModel(arcProofIntentForAction, arcProofReceipt);
  const guardrailBlocksPayment = Boolean(nanoPayAction.enabled && !budgetGuardrails.canPayPayableNow);
  const canPayNanoOnArc = Boolean(nanoPayAction.enabled && budgetGuardrails.canPayPayableNow);
  const nanoPayActionReason = guardrailBlocksPayment ? "This spend exceeds the remaining budget." : nanoPayAction.reason;
  const hasVerifiedSourceProof = Boolean(sourceUnlock.canShowInResult);
  const hasVerifiedReceipt = hasVerifiedSourceProof;
  const hasProofPending = state.nano.arcProofStatus === "pending" || Boolean(state.nano.arcProofTxHash.trim() && arcProofIntent && !arcProofReceipt);
  const agentDecision = buildNanoAgentDecisionPresentation({ hasBudget: Boolean(budget), intent: sourceIntent, receipt: sourceReceipt });
  const runProgress = buildNanoRunProgressPresentation({
    hasBudget: Boolean(budget),
    hasSpendPlan: hasFullNanoPlan,
    hasApprovedSpend: sourceIntent?.status === "approved" || hasApprovedSpend,
    hasProofPending,
    hasVerifiedSourceProof,
  });
  const resultPreview = buildNanoResultPreviewPresentation({
    goal: state.nano.budgetGoal,
    hasVerifiedSourceProof,
    sourceUnlock,
    verifiedContributions: multiSpendPlan.verifiedRows,
  });
  const firstUnapprovedIntent = intents.find((intent) => intent.status === "proposed");
  const primaryAction = (() => {
    if (!walletConnected) {
      return { label: "Connect wallet", mode: "wallet", disabled: false, reason: "Connect your wallet to create a Nano budget." };
    }
    if (walletWrongNetwork) {
      return { label: "Switch to Arc Testnet", mode: "switchNetwork", disabled: Boolean(state.nano.actionPending), reason: "Switch to Arc Testnet to use USDC proof." };
    }
    if (!budgetValidation.valid) {
      return { label: "Create Nano budget", mode: "budget", disabled: true, reason: "Choose a valid USDC budget between 0.10 and 5.00." };
    }
    if (!goalValid) {
      return { label: "Create Nano budget", mode: "budget", disabled: true, reason: "Add an agent goal before creating a budget." };
    }
    if (!budget) {
      return { label: "Create Nano budget", mode: "budget", disabled: Boolean(state.nano.actionPending), reason: "Create a small budget to start the source-payment run." };
    }
    if (!hasFullNanoPlan) {
      return { label: "Review source payment", mode: "plan", disabled: Boolean(state.nano.actionPending), reason: "The agent will propose the source/tool unlock before payment." };
    }
    if (hasFullNanoPlan && !budget.fundingProof && firstUnapprovedIntent) {
      return { label: "Approve source spend", mode: "fundingProofThenApprove", disabled: Boolean(state.nano.actionPending), reason: "Approve the source/tool spend before payment." };
    }
    if (canApproveAny) {
      return { label: "Approve source spend", mode: "approve", disabled: Boolean(state.nano.actionPending), reason: "Approve the source/tool spend before payment." };
    }
    if (hasPendingApprovedSpend && !sourcePayoutWalletModel.valid && !arcProofPayeeWallet) {
      return { label: "Pay source on Arc", mode: "pay", disabled: true, reason: "Add a recipient wallet before paying on Arc." };
    }
    if (canVerifyArcProof) {
      return { label: "Verify Arc proof", mode: "verify", disabled: Boolean(state.nano.actionPending), reason: "Verify the Arc transaction hash before marking anything paid." };
    }
    if (guardrailBlocksPayment) {
      return { label: "Pay source on Arc", mode: "pay", disabled: true, reason: "This spend exceeds the remaining budget." };
    }
    if (canPayNanoOnArc) {
      return { label: "Pay source on Arc", mode: "pay", disabled: Boolean(state.nano.actionPending), reason: "Payment is only marked paid after verified Arc proof." };
    }
    if (hasVerifiedReceipt) {
      return { label: "Review result", mode: "result", disabled: false, reason: "The source unlock is proof-verified and the result preview is ready." };
    }
    return { label: "View receipt trail", mode: "trail", disabled: false, reason: "Review planned, approved, and proof states." };
  })();
  const primaryButtonAttributes = primaryAction.mode === "wallet"
    ? 'data-wallet="open"'
    : `id="nanoPrimaryAction" data-nano-action="${escapeHtml(primaryAction.mode)}"`;
  const activeBudgetAmount = budget
    ? formatNanoUsdc(budget.amount)
    : budgetValidation.valid
      ? `${budgetValidation.normalized} USDC`
      : (state.nano.budgetAmount ? `${state.nano.budgetAmount} USDC` : "Enter amount");
  const proofStateLabel = hasVerifiedReceipt
    ? "Paid with proof"
    : state.nano.actionPending === "arcProof"
      ? "Verifying Arc proof"
      : state.nano.arcProofStatus === "rejected"
      ? "Proof rejected"
      : state.nano.arcProofStatus === "unavailable"
        ? "Proof unavailable"
        : hasProofPending
          ? "Proof pending"
          : hasPendingApprovedSpend
            ? "Not paid yet"
            : "Not paid yet";
  const submittedArcTxLink = ["pending", "verified"].includes(state.nano.arcProofStatus)
    ? buildArcTransactionLink(state.nano.arcProofTxHash)
    : null;

  el.appRoot.innerHTML = `
    <section data-structure="nano-source-payment" class="nano-page nano-page--simple">
      <header class="nano-hero reveal-on-scroll is-visible">
        <div>
          <p class="mini-label">Dispatch Nano</p>
          <h1>AI agent source payments</h1>
          <p>Give an agent a small USDC budget, approve a source/tool payment, and verify proof before anything is marked paid.</p>
        </div>
        <div class="nano-badge-row" aria-label="Nano highlights">
          <span class="meta-pill">Arc Testnet USDC</span>
          <span class="meta-pill">User-approved spend</span>
          <span class="meta-pill">Proof-gated unlock</span>
          <span class="meta-pill">Receipt trail</span>
        </div>
        <div class="nano-hero__actions">
          <button class="hero-primary" type="button" id="nanoStartNanoRun">Start Nano run</button>
        </div>
        <p class="nano-helper">Current flow supports Arc Testnet USDC proof. Gateway and x402 settlement are planned next.</p>
      </header>

      <section class="nano-step-rail reveal-on-scroll" aria-label="Nano progress">
        ${runProgress.steps.map((step) => `
          <span class="nano-step-pill nano-step-pill--${step.state}">
            <strong>${escapeHtml(step.number)}</strong>
            ${escapeHtml(step.label)}
          </span>
        `).join("")}
      </section>

      <section class="nano-selected-run reveal-on-scroll" aria-live="polite">
        <div>
          <strong>${escapeHtml(selectedRunModel.label)}</strong>
          <p>${escapeHtml(selectedRunModel.helper)}</p>
        </div>
        ${selectedRunModel.active ? `<button class="hero-secondary" type="button" id="nanoStartNewBudget">Start new run</button>` : ""}
      </section>

      <section class="nano-panel nano-how reveal-on-scroll">
        <div class="nano-section-head">
          <div>
            <p class="mini-label">How it works</p>
            <h2>Goal, source payment, proof trail.</h2>
          </div>
        </div>
        <div class="nano-how-grid">
          ${[
            ["1", "Set the goal", "Create a short brief about stablecoin payments."],
            ["2", "Approve source spend", "The agent requests one tiny source/tool unlock."],
            ["3", "Verify the trail", "Arc proof gates the paid label and result preview."],
          ].map(([number, title, helper]) => `
            <article>
              <strong>${number}</strong>
              <h3>${title}</h3>
              <p>${helper}</p>
            </article>
          `).join("")}
        </div>
      </section>

      <section class="nano-panel nano-demo-card reveal-on-scroll" id="nanoRunStart">
        <div>
          <p class="mini-label">Goal and budget</p>
          <h2>Choose how much this agent can spend for this run.</h2>
          <p class="nano-helper">Small budgets keep agent spending controlled. Every payment still needs approval and proof.</p>
          <div class="nano-budget-presets" role="group" aria-label="Budget presets">
            ${[...nanoBudgetPresets, "Custom"].map((preset) => `
              <button type="button" class="nano-preset ${state.nano.budgetPreset === preset ? "is-active" : ""}" data-nano-preset="${escapeHtml(preset)}">
                ${escapeHtml(preset === "Custom" ? "Custom" : `${preset} USDC`)}
              </button>
            `).join("")}
          </div>
          <div class="nano-demo-facts">
            <div><span>Budget</span><strong>${escapeHtml(activeBudgetAmount)}</strong></div>
            <div><span>Wallet</span><strong>${walletConnected ? escapeHtml(shortWallet(state.wallet)) : "Wallet required"}</strong></div>
            <div><span>Network</span><strong>${walletWrongNetwork ? "Wrong network" : "Arc Testnet"}</strong></div>
            <div><span>Balance</span><strong>${walletConnected ? escapeHtml(walletBalance) : "Connect wallet"}</strong></div>
          </div>
          <div class="nano-form-grid nano-form-grid--compact">
            ${state.nano.budgetPreset === "Custom" ? `
              <label class="nano-field">
                <span>Custom budget</span>
                <input id="nanoCustomBudgetAmount" type="text" inputmode="decimal" value="${escapeHtml(state.nano.customBudgetAmount)}" placeholder="0.10" />
                <small>${escapeHtml(budgetValidation.message || "Use 0.10 to 5.00 USDC.")}</small>
              </label>
            ` : ""}
            <label class="nano-field nano-field--wide">
              <span>Goal</span>
              <textarea id="nanoGoal" rows="3" placeholder="Create a short brief about stablecoin payments.">${escapeHtml(state.nano.budgetGoal)}</textarea>
              <small>${goalValid ? "Tell the agent what this Nano run should produce." : "Enter a goal before creating a budget."}</small>
            </label>
          </div>
        </div>
        <div class="nano-demo-action">
          <button class="hero-primary" type="button" ${primaryButtonAttributes} data-nano-guardrail-blocked="${guardrailBlocksPayment ? "true" : "false"}" ${primaryAction.disabled ? "disabled" : ""}>${state.nano.actionPending === "arcProof" ? "Verifying Arc proof" : state.nano.actionPending ? "Working..." : escapeHtml(primaryAction.label)}</button>
          <p>${escapeHtml(primaryAction.reason)}</p>
          <button class="hero-secondary" type="button" id="nanoRefresh" ${state.nano.budgetsLoading ? "disabled" : ""}>Refresh</button>
          ${budget ? `<button class="hero-secondary" type="button" id="nanoStartNewBudgetSecondary">Start new run</button>` : ""}
        </div>
      </section>

      <section class="nano-two-col">
        <article class="nano-panel nano-decision-card reveal-on-scroll">
          <div class="nano-section-head">
            <div>
              <p class="mini-label">${escapeHtml(agentDecision.label)}</p>
              <h2>${escapeHtml(agentDecision.title)}</h2>
              <p>${escapeHtml(agentDecision.copy)}</p>
            </div>
            <span class="status-chip ${agentDecision.tone === "good" ? "good" : agentDecision.tone === "warn" ? "warn" : "pending"}">${escapeHtml(agentDecision.status)}</span>
          </div>
          <div class="nano-decision-grid">
            <div><span>Resource</span><strong>${escapeHtml(agentDecision.resource)}</strong></div>
            <div><span>Cost</span><strong>${escapeHtml(formatNanoUsdc(sourcePlan?.amount || 0.01))}</strong></div>
            <div><span>Reason</span><strong>${escapeHtml(agentDecision.reason)}</strong></div>
            <div><span>Expected value</span><strong>${escapeHtml(agentDecision.expectedValue)}</strong></div>
            <div><span>Decision</span><strong>${escapeHtml(agentDecision.decision)}</strong></div>
          </div>
          <p class="nano-helper">${escapeHtml(agentDecision.helper)}</p>
        </article>

        <article class="nano-panel nano-source-card reveal-on-scroll" id="nanoSourceUnlock">
          <div class="nano-section-head">
            <div>
              <p class="mini-label">Source unlock</p>
              <h2>${escapeHtml(sourceUnlock.title)}</h2>
              <p>${escapeHtml(sourceUnlock.copy)}</p>
            </div>
            <span class="status-chip ${sourceUnlock.tone === "good" ? "good" : sourceUnlock.tone === "warn" ? "warn" : "pending"}">${escapeHtml(sourceUnlock.status)}</span>
          </div>
          <div class="nano-source-facts">
            <div><span>Price</span><strong>${escapeHtml(sourceUnlock.priceLabel)}</strong></div>
            <div><span>Recipient wallet</span><strong>${escapeHtml(sourceUnlock.recipient)}</strong></div>
            <div><span>Reason</span><strong>${escapeHtml(sourceUnlock.reason)}</strong></div>
          </div>
          ${sourceUnlock.unlocked ? `
            <div class="nano-unlocked-insight">
              <span>${escapeHtml(sourceUnlock.insightLabel)}</span>
              <p>${escapeHtml(sourceUnlock.insight)}</p>
            </div>
          ` : `
            <div class="empty-inline">
              <span class="empty-inline__mark" aria-hidden="true"></span>
              <div><strong>Source insight locked.</strong><p>Verify Arc proof before this starter source insight appears in the result preview.</p></div>
            </div>
          `}
        </article>
      </section>

      <section class="nano-two-col">
        <article class="nano-panel nano-budget-panel reveal-on-scroll">
          <div class="nano-section-head">
            <div>
              <p class="mini-label">Spend plan</p>
              <h2>${escapeHtml(spendPlanPresentation.label)}</h2>
              <p>The agent can propose source/tool payments, but each paid state needs proof.</p>
            </div>
            <span class="status-chip ${budgetStatus.tone === "good" ? "good" : budgetStatus.tone === "warn" ? "warn" : "pending"}">${escapeHtml(runProgress.currentStep)}</span>
          </div>
          ${renderNanoBudgetOptions()}
          ${state.nano.budgetsLoading ? `<p class="nano-helper">Loading your Nano budgets...</p>` : ""}
          ${state.nano.budgetsError ? `<p class="nano-helper nano-helper--warn">${escapeHtml(nanoApiUnavailableMessage())}</p>` : ""}
          <div class="nano-guardrail-panel" aria-label="Budget guardrails">
            <div class="nano-section-head">
              <div>
                <p class="mini-label">Budget control</p>
                <h3>${escapeHtml(budgetGuardrails.budgetStatus)}</h3>
                <p>${escapeHtml(budgetGuardrails.helper)}</p>
              </div>
              <span class="status-chip ${budgetGuardrails.tone === "good" ? "good" : budgetGuardrails.tone === "warn" ? "warn" : "pending"}">${escapeHtml(formatNanoUsdc(budgetGuardrails.remainingBudgetUsdc))} remains</span>
            </div>
            <div class="nano-guardrail-grid">
              ${budgetGuardrails.fields.map(([label, value]) => `
                <div>
                  <span>${escapeHtml(label)}</span>
                  <strong>${escapeHtml(value)}</strong>
                </div>
              `).join("")}
            </div>
            <div class="nano-guardrail-warnings">
              ${budgetGuardrails.warnings.map((warning) => `<span>${escapeHtml(warning)}</span>`).join("")}
            </div>
          </div>
          <div class="nano-spend-plan">
            ${multiSpendPlan.rows.map((row) => {
              return `
                <article class="nano-spend-row ${row.primary ? "nano-spend-row--primary" : row.plannedOnly ? "nano-spend-row--planned" : ""}">
                  <div>
                    <span class="nano-payee-type">${escapeHtml(row.typeLabel)}</span>
                    <strong>${escapeHtml(row.label)}</strong>
                    <p>${escapeHtml(row.reason)}</p>
                    <p>${row.primary ? "Primary source/tool unlock for this Nano run." : "Planned next. Not a live payout flow unless real proof exists."}</p>
                    ${row.recipientWallet ? `<p>Recipient wallet ${escapeHtml(row.recipient)}</p>` : ""}
                    ${row.primary ? `
                      <label class="nano-field nano-field--inline">
                        <span>Recipient wallet</span>
                        <input id="nanoSourcePayoutWallet" type="text" value="${escapeHtml(state.nano.sourcePayoutWallet)}" placeholder="0x recipient wallet" />
                        <small>${escapeHtml(sourcePayoutWalletModel.wallet ? sourcePayoutWalletModel.helper : spendPlanPresentation.recipientHelper)}</small>
                      </label>
                    ` : ""}
                  </div>
                  <div class="nano-spend-row__meta">
                    <strong>${escapeHtml(row.amount)}</strong>
                    <span class="status-chip ${row.proofTone === "good" ? "good" : row.proofTone === "warn" ? "warn" : "pending"}">${escapeHtml(row.proofLabel)}</span>
                    <small>State: ${escapeHtml(row.stateLabel)}</small>
                    <small>Action: ${escapeHtml(row.payActionLabel)}</small>
                    ${row.txLink ? `<a href="${escapeHtml(row.txLink)}" target="_blank" rel="noreferrer">View transaction</a>` : ""}
                  </div>
                </article>
              `;
            }).join("")}
            <article class="nano-spend-row nano-spend-row--quiet">
              <div>
                <strong>Main agent keeps remaining budget</strong>
                <p>Remaining budget after helper spends.</p>
              </div>
              <div class="nano-spend-row__meta">
                <strong>${escapeHtml(formatNanoUsdc(mainAgentRemainder))}</strong>
                  <span class="status-chip pending">Remainder</span>
                </div>
              </article>
          </div>
          <p class="nano-helper">${escapeHtml(multiSpendPlan.helper)}</p>
        </article>

        <article class="nano-panel reveal-on-scroll" id="nanoProofGate">
          <div class="nano-section-head">
            <div>
              <p class="mini-label">Proof gate</p>
              <h2>Proof gate</h2>
              <p>Approved does not mean paid.</p>
            </div>
            <span class="status-chip ${hasVerifiedReceipt ? "good" : state.nano.arcProofStatus === "rejected" ? "warn" : "pending"}">${escapeHtml(proofStateLabel)}</span>
          </div>
          <div class="nano-proof-box">
            <p>Nano only marks a spend as paid after Arc proof matches the amount, token, sender, and recipient.</p>
            <div class="nano-recipient-summary">
              <span>Planned spend recipient</span>
              <strong>${escapeHtml(nanoPayAction.recipient.label)}</strong>
            </div>
            <label class="nano-field">
              <span>Arc transaction hash</span>
              <input id="nanoArcProofTxHash" type="text" value="${escapeHtml(state.nano.arcProofTxHash)}" placeholder="0x..." />
              <small>Paste the Arc Testnet transaction hash if the wallet transfer was already submitted.</small>
            </label>
            <p class="nano-helper">${escapeHtml(nanoPayActionReason)}</p>
            ${submittedArcTxLink ? `
              <p class="nano-helper">
                Submitted Arc transaction:
                <a href="${escapeHtml(submittedArcTxLink)}" target="_blank" rel="noreferrer">${escapeHtml(shortWallet(state.nano.arcProofTxHash))}</a>
              </p>
            ` : ""}
            ${state.nano.arcProofMessage ? `<p class="nano-helper ${state.nano.arcProofStatus === "rejected" || state.nano.arcProofStatus === "unavailable" ? "nano-helper--warn" : ""}">${escapeHtml(state.nano.arcProofMessage)}</p>` : ""}
          </div>
        </article>
      </section>

      <section class="nano-two-col">
        <article class="nano-panel nano-progress-card reveal-on-scroll">
          <div class="nano-section-head">
            <div>
              <p class="mini-label">Run state</p>
              <h2>${escapeHtml(runProgress.title)}</h2>
              <p>${escapeHtml(runProgress.subtitle)}</p>
            </div>
          </div>
          <div class="nano-progress-list">
            ${runProgress.steps.map((step) => `
              <div class="nano-progress-item nano-progress-item--${step.state}">
                <span>${escapeHtml(step.number)}</span>
                <strong>${escapeHtml(step.label)}</strong>
              </div>
            `).join("")}
          </div>
          <p class="nano-helper">${escapeHtml(runProgress.currentCopy)}</p>
        </article>

        <article class="nano-panel nano-result-panel reveal-on-scroll" id="nanoResultPreview">
          <div class="nano-section-head">
            <div>
              <p class="mini-label">${escapeHtml(resultPreview.label)}</p>
              <h2>${escapeHtml(resultPreview.title)}</h2>
              <p>${escapeHtml(resultPreview.subtitle)}</p>
            </div>
            <span class="status-chip ${resultPreview.tone === "good" ? "good" : "pending"}">${escapeHtml(resultPreview.status)}</span>
          </div>
          <div class="nano-result-fields">
            <div><span>Goal</span><strong>${escapeHtml(resultPreview.goal)}</strong></div>
            <div><span>Paid source used</span><strong>${escapeHtml(resultPreview.paidSourceUsed)}</strong></div>
            <div><span>Proof status</span><strong>${escapeHtml(resultPreview.proofStatus)}</strong></div>
          </div>
          <div class="nano-result-copy">
            <strong>What the agent produced</strong>
            <p>${escapeHtml(resultPreview.body)}</p>
          </div>
          <button class="hero-secondary nano-result-cta" type="button" id="nanoViewResult">${escapeHtml(resultPreview.cta)}</button>
        </article>
      </section>

      <article class="nano-panel reveal-on-scroll" id="nanoPaymentTrail">
        <div class="nano-section-head">
          <div>
            <p class="mini-label">Payment trail</p>
            <h2>Payment trail</h2>
            <p>Every agent spend is visible before and after payment.</p>
          </div>
          <span class="meta-pill">${receipts.length} proof record${receipts.length === 1 ? "" : "s"}</span>
        </div>
        ${intents.length ? `
          <div class="nano-trail-table">
            <div class="nano-trail-head"><span>Spend</span><span>Recipient</span><span>Amount</span><span>Proof state</span></div>
            ${intents.map((intent) => {
              const receipt = receiptsByIntent.get(intent.intentId);
              const status = receipt ? buildNanoReceiptStatusModel(receipt) : buildNanoSpendIntentStatusModel(intent, null);
              const txLink = buildArcTransactionLink(receipt?.proof?.txHash);
              const timestamp = receipt?.recordedAt || receipt?.proof?.recordedAt || "";
              return `
                <article class="nano-trail-row">
                  <span>
                    <strong>${escapeHtml(intent.payee.label)}</strong>
                    <small>${escapeHtml(intent.reason)}</small>
                  </span>
                  <span>
                    ${escapeHtml(intent.payee.walletAddress ? shortWallet(intent.payee.walletAddress) : "No recipient wallet")}
                    ${txLink ? `<a href="${escapeHtml(txLink)}" target="_blank" rel="noreferrer">View transaction</a>` : ""}
                  </span>
                  <span>
                    ${escapeHtml(formatNanoUsdc(intent.amount))}
                    <small>${escapeHtml(timestamp ? new Date(timestamp).toLocaleString() : "Timestamp pending")}</small>
                  </span>
                  <span>
                    <span class="status-chip ${status.tone === "good" ? "good" : status.tone === "warn" ? "warn" : "pending"}">${escapeHtml(status.label)}</span>
                  </span>
                </article>
              `;
            }).join("")}
          </div>
        ` : `
          <div class="empty-inline">
            <span class="empty-inline__mark" aria-hidden="true"></span>
            <div><strong>No receipts yet.</strong><p>Receipts appear after a spend is approved, paid, or verified.</p></div>
          </div>
        `}
        ${state.nano.activityError ? `<p class="nano-helper nano-helper--warn">${escapeHtml(state.nano.activityError)}</p>` : ""}
      </article>

      <section class="nano-panel nano-run-history reveal-on-scroll" id="nanoRunHistory">
        <div class="nano-section-head">
          <div>
            <p class="mini-label">Wallet-scoped history</p>
            <h2>${escapeHtml(runHistoryModel.title)}</h2>
            <p>${escapeHtml(runHistoryModel.subtitle)}</p>
          </div>
          ${runHistoryModel.loading ? `<span class="meta-pill">Loading runs</span>` : `<span class="meta-pill">${runHistoryModel.runCards.length} run${runHistoryModel.runCards.length === 1 ? "" : "s"}</span>`}
        </div>
        ${runHistoryModel.runCards.length ? `
          <div class="nano-run-grid">
            ${runHistoryModel.runCards.map((run) => `
              <article class="nano-run-card ${run.selected ? "is-selected" : ""}">
                <div class="nano-run-card__head">
                  <strong>${escapeHtml(run.goal)}</strong>
                  <span class="status-chip ${run.proofTone === "good" ? "good" : run.proofTone === "warn" ? "warn" : "pending"}">${escapeHtml(run.proofStatus)}</span>
                </div>
                <div class="nano-run-card__facts">
                  <div><span>Budget</span><strong>${escapeHtml(run.budget)}</strong></div>
                  <div><span>Budget status</span><strong>${escapeHtml(run.budgetStatus)}</strong></div>
                  <div><span>Source status</span><strong>${escapeHtml(run.sourceStatus)}</strong></div>
                  <div><span>Verified receipts</span><strong>${escapeHtml(run.verifiedReceiptCount)}</strong></div>
                  <div><span>Updated</span><strong>${escapeHtml(run.updated)}</strong></div>
                </div>
                <button class="${run.selected ? "hero-secondary" : "hero-primary"}" type="button" data-nano-run-id="${escapeHtml(run.budgetId)}">${escapeHtml(run.buttonLabel)}</button>
                ${!run.detailAvailable ? `<p class="nano-helper">Run detail unavailable from the current router response.</p>` : ""}
              </article>
            `).join("")}
          </div>
        ` : `
          <div class="empty-inline nano-empty-inline">
            <span class="empty-inline__mark" aria-hidden="true"></span>
            <div><strong>${escapeHtml(runHistoryModel.emptyTitle)}</strong><p>${escapeHtml(runHistoryModel.emptyBody)}</p></div>
          </div>
        `}
        ${runHistoryModel.error ? `<p class="nano-helper nano-helper--warn">${escapeHtml(runHistoryModel.error)}</p>` : ""}
      </section>

      <article class="nano-panel nano-receipt-detail reveal-on-scroll" id="nanoReceiptDetail">
        <div class="nano-section-head">
          <div>
            <p class="mini-label">Receipt detail</p>
            <h2>${escapeHtml(receiptDetailModel.title)}</h2>
            <p>${escapeHtml(receiptDetailModel.body)}</p>
          </div>
          <span class="meta-pill">${receiptDetailModel.rows.length} row${receiptDetailModel.rows.length === 1 ? "" : "s"}</span>
        </div>
        ${receiptDetailModel.available && receiptDetailModel.rows.length ? `
          <div class="nano-receipt-detail-list">
            ${receiptDetailModel.rows.map((row) => `
              <article class="nano-receipt-detail-row">
                <div>
                  <span>Spend</span>
                  <strong>${escapeHtml(row.spend)}</strong>
                  <p>${escapeHtml(row.reason)}</p>
                  ${row.contributionSummary ? `<p>${escapeHtml(row.contributionSummary)}</p>` : ""}
                </div>
                <div><span>Amount</span><strong>${escapeHtml(row.amount)}</strong></div>
                <div><span>Recipient</span><strong>${escapeHtml(row.recipient)}</strong></div>
                <div><span>Proof state</span><strong>${escapeHtml(row.proofState)}</strong></div>
                <div><span>Payment state</span><strong>${escapeHtml(row.paymentState)}</strong></div>
                <div>
                  <span>Tx link</span>
                  ${row.txLink ? `<a href="${escapeHtml(row.txLink)}" target="_blank" rel="noreferrer">${escapeHtml(row.txLabel)}</a>` : `<strong>No valid transaction link</strong>`}
                </div>
              </article>
            `).join("")}
          </div>
        ` : `
          <div class="empty-inline nano-empty-inline">
            <span class="empty-inline__mark" aria-hidden="true"></span>
            <div><strong>${escapeHtml(receiptDetailModel.emptyTitle || receiptDetailModel.title)}</strong><p>${escapeHtml(receiptDetailModel.emptyBody || receiptDetailModel.body)}</p></div>
          </div>
        `}
      </article>

      <section class="nano-bottom-grid">
        <article class="nano-panel reveal-on-scroll">
          <p class="mini-label">${escapeHtml(metricsModel.sourceLabel)}</p>
          <h2>Nano activity</h2>
          <p>${escapeHtml(metricsModel.sourceHelper)}</p>
          <div class="nano-metrics-grid">
            <div><strong>${escapeHtml(metricsModel.budgetCount)}</strong><span>Budgets created</span></div>
            <div><strong>${escapeHtml(metricsModel.receiptCount)}</strong><span>Proof records</span></div>
            <div><strong>${escapeHtml(metricsModel.verifiedArcPaymentCount)}</strong><span>Verified Arc payments</span></div>
            <div><strong>${escapeHtml(metricsModel.totalVerifiedUsdcVolume)}</strong><span>Verified USDC volume</span></div>
          </div>
          ${!metricsModel.hasVerifiedPayments ? `
            <div class="empty-inline nano-empty-inline">
              <span class="empty-inline__mark" aria-hidden="true"></span>
              <div><strong>${escapeHtml(metricsModel.emptyTitle)}</strong><p>${escapeHtml(metricsModel.emptyBody)}</p></div>
            </div>
          ` : `
            <div class="nano-metrics-detail">
              <div><span>Average verified payment</span><strong>${escapeHtml(metricsModel.averageVerifiedPaymentSize)}</strong></div>
              <div><span>Latest proof status</span><strong>${escapeHtml(metricsModel.latestProofStatus)}</strong></div>
              <div><span>Latest verified receipt</span><strong>${escapeHtml(metricsModel.latestVerifiedReceipt)}</strong></div>
            </div>
          `}
          ${state.nano.metricsLoading ? `<p class="nano-helper">Loading Nano activity...</p>` : ""}
          ${state.nano.metricsError ? `<p class="nano-helper nano-helper--warn">${escapeHtml(state.nano.metricsError)}</p>` : ""}
        </article>

        <article class="nano-panel nano-note-panel reveal-on-scroll">
          <p class="mini-label">Why this matters</p>
          <h2>Why this matters</h2>
          <p>Most agents only return an answer. Nano shows what the agent wanted to spend, what the user approved, what payment proof exists, and how the paid source improved the result.</p>
        </article>
      </section>

      <p class="nano-limit-note">Current Nano flow supports Arc Testnet USDC proof. Gateway and x402 settlement are planned next.</p>
    </section>
  `;

  document.querySelectorAll("[data-nano-preset]").forEach((node) => {
    node.addEventListener("click", () => {
      const preset = node.dataset.nanoPreset;
      state.nano.budgetPreset = preset;
      state.nano.budgetAmount = preset === "Custom" ? state.nano.customBudgetAmount : preset;
      state.nano.budgetAmountError = validateNanoBudgetAmount(state.nano.budgetAmount).message;
      renderNanoPageSimplified();
    });
  });
  document.getElementById("nanoCustomBudgetAmount")?.addEventListener("input", (event) => {
    state.nano.customBudgetAmount = event.target.value;
    state.nano.budgetAmount = event.target.value;
    const validation = validateNanoBudgetAmount(event.target.value);
    state.nano.budgetAmountError = validation.message;
    const helper = event.target.closest(".nano-field")?.querySelector("small");
    if (helper) helper.textContent = validation.message || "Use 0.10 to 5.00 USDC.";
    const primaryButton = document.getElementById("nanoPrimaryAction");
    if (primaryButton?.dataset.nanoAction === "budget") {
      primaryButton.disabled = !(validation.valid && state.nano.budgetGoal.trim()) || Boolean(state.nano.actionPending);
    }
  });
  document.getElementById("nanoGoal")?.addEventListener("input", (event) => {
    state.nano.budgetGoal = event.target.value;
  });
  document.getElementById("nanoSourcePayoutWallet")?.addEventListener("input", (event) => {
    state.nano.sourcePayoutWallet = event.target.value;
    localStorage.setItem("dispatchNanoSourcePayoutWallet", state.nano.sourcePayoutWallet.trim());
    const model = buildNanoRecipientWalletModel(state.nano.sourcePayoutWallet);
    const helper = event.target.closest(".nano-field")?.querySelector("small");
    if (helper) helper.textContent = model.helper;
    const primaryButton = document.getElementById("nanoPrimaryAction");
    if (primaryButton?.dataset.nanoAction === "pay") {
      primaryButton.disabled = !model.valid || primaryButton.dataset.nanoGuardrailBlocked === "true" || Boolean(state.nano.actionPending);
      const reason = document.querySelector(".nano-demo-action p");
      if (reason) {
        reason.textContent = model.valid
          ? primaryButton.dataset.nanoGuardrailBlocked === "true"
            ? "This spend exceeds the remaining budget."
            : "Payment is only marked paid after verified Arc proof."
          : "Add a recipient wallet before paying on Arc.";
      }
    }
  });
  document.getElementById("nanoArcProofTxHash")?.addEventListener("input", (event) => {
    state.nano.arcProofTxHash = event.target.value;
  });
  document.getElementById("nanoBudgetSelect")?.addEventListener("change", async (event) => {
    state.nano.selectedBudgetId = event.target.value;
    state.nano.activity = state.nano.runActivities?.[event.target.value] || null;
    resetNanoProofDraftFields();
    renderNanoPageSimplified();
    await refreshNanoActivity(event.target.value);
    renderNanoPageSimplified();
  });
  document.querySelectorAll("[data-nano-run-id]").forEach((node) => {
    node.addEventListener("click", async () => {
      const budgetId = node.dataset.nanoRunId;
      if (!budgetId) return;
      state.nano.selectedBudgetId = budgetId;
      state.nano.activity = state.nano.runActivities?.[budgetId] || null;
      resetNanoProofDraftFields();
      renderNanoPageSimplified();
      if (!state.nano.activity) {
        await refreshNanoActivity(budgetId);
        renderNanoPageSimplified();
      }
      document.getElementById("nanoReceiptDetail")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
  document.getElementById("nanoRefresh")?.addEventListener("click", async () => {
    await withNanoAction("refresh", refreshNanoData);
  });
  document.getElementById("nanoStartNanoRun")?.addEventListener("click", () => {
    document.getElementById("nanoRunStart")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  document.getElementById("nanoViewResult")?.addEventListener("click", () => {
    document.getElementById("nanoResultPreview")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  document.getElementById("nanoStartNewBudget")?.addEventListener("click", () => {
    resetNanoDraftFlow();
    renderNanoPageSimplified();
  });
  document.getElementById("nanoStartNewBudgetSecondary")?.addEventListener("click", () => {
    resetNanoDraftFlow();
    renderNanoPageSimplified();
  });
  document.getElementById("nanoPrimaryAction")?.addEventListener("click", async (event) => {
    const action = event.currentTarget.dataset.nanoAction;
    if (action === "switchNetwork") {
      await withNanoAction("switchNetwork", async () => {
        const snapshot = await chainClient.switchWalletToArcTestnet();
        state.walletNetwork = { ...state.walletNetwork, ...snapshot, loading: false, error: "" };
      });
      return;
    }
    if (action === "budget") {
      await withNanoAction("budget", createNanoBudgetDraft);
      return;
    }
    if (action === "plan") {
      await withNanoAction("plan", createNanoSpendPlan);
      return;
    }
    if (action === "approve") {
      await withNanoAction("approve", approveNanoSpendIntents);
      return;
    }
    if (action === "fundingProofThenApprove") {
      await withNanoAction("approve", async () => {
        await recordNanoFundingProof();
        await refreshNanoActivity(state.nano.selectedBudgetId);
        await approveNanoSpendIntents();
      });
      return;
    }
    if (action === "pay") {
      if (guardrailBlocksPayment) {
        updateStatus("Nano payment blocked", "This spend exceeds the remaining budget.", "warn");
        return;
      }
      await withNanoAction("nanoArcPay", payNanoSpendOnArc);
      return;
    }
    if (action === "verify") {
      await withNanoAction("arcProof", verifyNanoArcProof);
      return;
    }
    if (action === "result") {
      document.getElementById("nanoResultPreview")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    document.getElementById("nanoPaymentTrail")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  document.getElementById("nanoApproveSpend")?.addEventListener("click", async () => {
    await withNanoAction("approve", approveNanoSpendIntents);
  });
  document.getElementById("nanoPaySourceOnArc")?.addEventListener("click", async () => {
    await withNanoAction("nanoArcPay", payNanoSpendOnArc);
  });
  document.getElementById("nanoVerifyArcProof")?.addEventListener("click", async () => {
    await withNanoAction("arcProof", verifyNanoArcProof);
  });
  revealSections(el.appRoot);
}

async function withNanoAction(actionName, action) {
  try {
    state.nano.actionPending = actionName;
    renderNanoPageSimplified();
    await action();
    await refreshNanoData();
    updateStatus("Nano updated", "Nano budget state refreshed.", "success");
  } catch (error) {
    updateStatus("Nano action failed", statusMessage(error, "Nano action failed."), "warn");
  } finally {
    state.nano.actionPending = "";
    renderNanoPageSimplified();
  }
}

async function createNanoBudgetDraft() {
  requireWallet();
  const budgetValidation = validateNanoBudgetAmount(state.nano.budgetAmount);
  if (!budgetValidation.valid) {
    state.nano.budgetAmountError = budgetValidation.message;
    throw new Error(budgetValidation.message);
  }
  if (!state.nano.budgetGoal.trim()) throw new Error("Enter a goal before creating a budget.");
  const amount = budgetValidation.amount;
  const response = await sendJson("/api/nano/budgets/draft", "POST", {
    ownerWallet: state.wallet,
    goal: state.nano.budgetGoal.trim(),
    amount,
    spendPlanSummary: "Lepton Nano spend plan: source unlock, summary formatter, claim-check tool, main agent remainder.",
    policy: {
      maxBudgetAmount: amount,
      maxSpendAmount: amount,
      allowedPayeeTypes: ["source", "tool", "creator", "agent", "platform"],
      requireApprovalForEachSpend: true,
      notes: ["Phase 2 UI records proof metadata only; it does not execute payments."],
    },
  }, validateNanoBudgetDraftResponse);
  state.nano.selectedBudgetId = response.budget.budgetId;
}

async function createNanoSpendPlan() {
  requireWallet();
  const budget = selectedNanoBudget();
  if (!budget) throw new Error("Create a Nano budget first.");
  const sourcePayoutWalletModel = buildNanoRecipientWalletModel(state.nano.sourcePayoutWallet);
  const existing = new Set((state.nano.activity?.spendIntents || []).map((intent) => intent.payee.payeeId));
  for (const plan of nanoPlannedSpendRows) {
    if (existing.has(plan.payeeId)) continue;
    const isSourceUnlock = plan.payeeId === "source_unlock";
    if (isSourceUnlock && sourcePayoutWalletModel.wallet && !sourcePayoutWalletModel.valid) {
      throw new Error("Enter a valid source payout wallet.");
    }
    await sendJson("/api/nano/spend-intents", "POST", {
      budgetId: budget.budgetId,
      ownerWallet: state.wallet,
      payee: {
        payeeId: plan.payeeId,
        type: plan.type,
        label: plan.label,
        walletAddress: isSourceUnlock && sourcePayoutWalletModel.valid ? sourcePayoutWalletModel.wallet : null,
        externalRef: `lepton_nano:${plan.payeeId}`,
      },
      amount: plan.amount,
      reason: plan.reason,
      estimated: false,
    }, validateNanoSpendIntentResponse);
  }
}

async function recordNanoFundingProof() {
  requireWallet();
  const budget = selectedNanoBudget();
  if (!budget) throw new Error("Create a Nano budget first.");
  await sendJson(`/api/nano/budgets/${encodeURIComponent(budget.budgetId)}/fund-proof`, "POST", {
    ownerWallet: state.wallet,
    proof: makeNanoLocalProof("funding", ["Local funding proof only; no chain settlement is claimed."]),
  });
}

async function approveNanoSpendIntents() {
  requireWallet();
  const intents = state.nano.activity?.spendIntents || [];
  for (const intent of intents.filter((item) => item.status === "proposed")) {
    await sendJson(`/api/nano/spend-intents/${encodeURIComponent(intent.intentId)}/approve`, "POST", {
      ownerWallet: state.wallet,
    }, validateNanoSpendIntentResponse);
  }
}

async function recordNanoReceipts() {
  requireWallet();
  const receiptsByIntent = selectedNanoReceiptsByIntent();
  const intents = state.nano.activity?.spendIntents || [];
  for (const intent of intents.filter((item) => item.status === "approved" && !receiptsByIntent.has(item.intentId))) {
    const plan = nanoPlannedSpendRows.find((item) => item.payeeId === intent.payee.payeeId);
    await sendJson(`/api/nano/spend-intents/${encodeURIComponent(intent.intentId)}/record-payment`, "POST", {
      ownerWallet: state.wallet,
      proof: makeNanoLocalProof(intent.payee.payeeId, ["Local receipt only; this is not paid with proof."]),
      contributionSummary: plan?.contributionSummary || `Recorded local proof for ${intent.payee.label}.`,
    }, validateNanoSpendReceiptResponse);
  }
}

async function verifyNanoArcProof() {
  requireWallet();
  const receiptsByIntent = selectedNanoReceiptsByIntent();
  const intents = state.nano.activity?.spendIntents || [];
  const intent = selectedNanoArcProofIntent(intents, receiptsByIntent);
  if (!intent) throw new Error("Create and approve a planned spend first.");
  if (receiptsByIntent.has(intent.intentId)) throw new Error("This spend already has proof recorded.");
  const recipientWalletModel = buildNanoRecipientWalletModel(intent.payee.walletAddress || state.nano.sourcePayoutWallet);
  const recipientWallet = recipientWalletModel.valid ? recipientWalletModel.wallet : null;
  if (!recipientWallet) throw new Error("Add a recipient wallet before verifying Arc proof.");
  const txHash = state.nano.arcProofTxHash.trim();
  if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
    state.nano.arcProofStatus = "rejected";
    state.nano.arcProofMessage = "Proof rejected. Enter a valid Arc transaction hash.";
    throw new Error("Enter a valid Arc transaction hash.");
  }
  let result;
  try {
    result = await sendJson(
      `/api/nano/spend-intents/${encodeURIComponent(intent.intentId)}/verify-arc-proof`,
      "POST",
      {
        ownerWallet: state.wallet,
        txHash,
        payerWallet: state.wallet,
        payeeWallet: recipientWallet,
        expectedAmountUsdc: intent.amount,
        recipientLabel: intent.payee.label,
      },
      validateNanoArcProofVerifyResponse,
    );
  } catch (error) {
    state.nano.arcProofStatus = "unavailable";
    state.nano.arcProofMessage = nanoArcProofErrorMessage(error);
    throw new Error(state.nano.arcProofMessage);
  }
  state.nano.arcProofStatus = result.proofStatus;
  state.nano.arcProofMessage = result.proofStatus === "verified" ? "Paid with proof." : result.reason;
  if (result.proofStatus !== "verified") {
    throw new Error(result.reason);
  }
}

async function payNanoSpendOnArc() {
  requireWallet();
  const receiptsByIntent = selectedNanoReceiptsByIntent();
  const intents = state.nano.activity?.spendIntents || [];
  const intent = selectedNanoArcProofIntent(intents, receiptsByIntent);
  if (!intent) throw new Error("Create and approve a planned spend first.");
  if (intent.status !== "approved") throw new Error("Approve this planned spend before paying on Arc.");
  if (receiptsByIntent.has(intent.intentId)) throw new Error("This spend already has proof recorded.");
  const recipientWallet = intent.payee.walletAddress || buildNanoRecipientWalletModel(state.nano.sourcePayoutWallet).wallet;
  if (!buildNanoRecipientWalletModel(recipientWallet).valid) throw new Error("Add a recipient wallet before paying on Arc.");
  const txHash = await chainClient.transferNanoUsdc({
    recipientWallet,
    amountUsdc: intent.amount,
  });
  state.nano.arcProofIntentId = intent.intentId;
  state.nano.arcProofTxHash = txHash;
  state.nano.arcProofStatus = "pending";
  state.nano.arcProofMessage = "Arc payment submitted. Verifying proof now.";
  await verifyNanoArcProof();
}

async function renderAdmin() {
  setChrome(
    "Admin Panel",
    "Admin Panel",
    "Dispute queue, suspicious endpoints, failed executions, and audit logs.",
    "Operational control for the MVP without pretending to be full governance.",
    80,
  );

  el.appRoot.innerHTML = `
    <section data-structure="admin-loading" class="loading-shell">
      <article class="skeleton"></article>
      <article class="skeleton"></article>
      <article class="skeleton"></article>
    </section>
  `;

  const overview = await getJson("/api/admin/overview").catch(() => ({
    tasks: [],
    pausedTaskIds: [],
    blacklistedEndpoints: [],
    suspiciousPatterns: [],
    auditLogs: [],
  }));
  const failures = await getJson("/api/admin/execution-failures").catch(() => ({ items: [] }));
  const debugTaskId = new URLSearchParams(window.location.search).get("debugTask");
  const debug = debugTaskId ? await getJson(`/api/admin/tasks/${encodeURIComponent(debugTaskId)}/debug`).catch(() => null) : null;
  const disputes = overview.tasks.filter((task) => task.status === "DISPUTED");
  const suspiciousAgents = state.agents.filter((agent) => ["warning", "incompatible"].includes(agent.compatibilityStatus) || ["unhealthy", "degraded", "suspended"].includes(agent.healthStatus));
  const allTasks = overview.tasks;

  el.appRoot.innerHTML = `
    <section data-structure="admin-console">
      <header>
        <p class="mini-label">Ops Console</p>
        <h1>Manual control for a live execution market.</h1>
        <p>Watch failures, resolve disputes, freeze risky actors, and inspect execution state without leaving the workspace.</p>
      </header>
      <section class="trust-strip reveal-on-scroll">
        <article class="metric-card"><strong>${allTasks.length}</strong><span>Tracked tasks</span></article>
        <article class="metric-card"><strong>${disputes.length}</strong><span>Open disputes</span></article>
        <article class="metric-card"><strong>${failures.items.length}</strong><span>Failed runs</span></article>
      </section>
      <section class="ops-grid">
      <div class="ops-stack">
      <article class="shell-section surface-page reveal-on-scroll">
        <div class="section-head"><div><p class="mini-label">Queue</p><h2>Work queue</h2></div><span class="meta-pill">${allTasks.length} tasks</span></div>
        <div class="audit-list">${allTasks.slice(0, 10).map((task) => `<div class="audit-item"><strong>${escapeHtml(task.title)}</strong><p>${escapeHtml(task.status)} | ${formatCurrency(task.rewardAmount)}</p><div class="ops-actions"><button data-admin-pause="${task.taskId}">Pause Task</button><button data-admin-refund="${task.taskId}">Refund Task</button></div></div>`).join("") || emptyState("No tasks loaded.")}</div>
      </article>
      <article class="shell-section surface-page reveal-on-scroll">
        <div class="section-head"><div><p class="mini-label">Review</p><h2>Manual resolution</h2></div><span class="meta-pill">${disputes.length} disputes</span></div>
        <div class="audit-list">${disputes.map((task) => `<div class="audit-item"><strong>${escapeHtml(task.title)}</strong><p>${escapeHtml(task.status)} | ${formatCurrency(task.rewardAmount)} reward</p><div class="ops-actions"><button data-route="/tasks/${task.taskId}">Open Task</button><button data-admin-resolve="${task.taskId}" data-outcome="approve_payout">Approve Payout</button><button data-admin-resolve="${task.taskId}" data-outcome="refund_buyer">Refund Buyer</button></div></div>`).join("") || emptyState("No open disputes.")}</div>
      </article>
      <article class="shell-section surface-page reveal-on-scroll">
        <div class="section-head"><div><p class="mini-label">Risk</p><h2>Risk monitoring</h2></div><span class="meta-pill">${suspiciousAgents.length} flagged</span></div>
        <div class="audit-list">${suspiciousAgents.map((agent) => `<div class="audit-item"><strong>${escapeHtml(agent.profile.publicName)}</strong><p>${escapeHtml(agent.compatibilityStatus)} | ${escapeHtml(agent.healthStatus)}</p><div class="ops-actions"><button data-admin-disable="${agent.profile.agentId}">Disable Agent</button>${agent.profile.endpointUrl ? `<button data-admin-blacklist="${escapeHtml(agent.profile.endpointUrl)}">Blacklist Endpoint</button>` : ""}</div></div>`).join("") || emptyState("No suspicious endpoints.")}</div>
      </article>
      <article class="shell-section surface-page reveal-on-scroll">
        <div class="section-head"><div><p class="mini-label">Failures</p><h2>Debug queue</h2></div><span class="meta-pill">${failures.items.length} failed</span></div>
        <div class="audit-list">${failures.items.map((run) => `<div class="audit-item"><strong>${escapeHtml(run.taskId)}</strong><p>${escapeHtml(run.failureCategory || "unknown")} | ${escapeHtml(run.lastErrorMessage || "Execution failed")}</p><div class="ops-actions"><button data-route="/tasks/${run.taskId}">Inspect Task</button><button data-admin-debug="${run.taskId}">Debug Trace</button></div></div>`).join("") || emptyState("No failed executions.")}</div>
      </article>
      </div>
      <div class="ops-stack">
      <article class="shell-section surface-page reveal-on-scroll">
        <div class="section-head"><div><p class="mini-label">Signals</p><h2>Pattern detection</h2></div><span class="meta-pill">${overview.suspiciousPatterns.length} signals</span></div>
        <div class="audit-list">${overview.suspiciousPatterns.map((flag) => `<div class="audit-item"><strong>${escapeHtml(labelize(flag.kind))}</strong><p>${escapeHtml(flag.summary)}</p><small>${escapeHtml(flag.subjectType)} | ${escapeHtml(flag.subjectId)}</small></div>`).join("") || emptyState("No suspicious patterns right now.")}</div>
      </article>
      <article class="shell-section surface-page reveal-on-scroll">
        <div class="section-head"><div><p class="mini-label">Blocks</p><h2>Hard blocks</h2></div><span class="meta-pill">${overview.blacklistedEndpoints.length} endpoints</span></div>
        <div class="audit-list">${overview.blacklistedEndpoints.map((row) => `<div class="audit-item"><strong>${escapeHtml(row.endpointUrl)}</strong><p>${escapeHtml(row.reason)}</p></div>`).join("") || emptyState("No blacklisted endpoints.")}</div>
      </article>
      <article class="shell-section surface-page reveal-on-scroll">
        <div class="section-head"><div><p class="mini-label">Audit</p><h2>Decision trail</h2></div><span class="meta-pill">${overview.auditLogs.length} events</span></div>
        <div class="audit-list">${overview.auditLogs.slice(0, 12).map((item) => `<div class="audit-item"><strong>${escapeHtml(labelize(item.action))}</strong><p>${escapeHtml(item.reason)}</p><small>${escapeHtml(item.subjectType)} | ${escapeHtml(item.subjectId)}</small></div>`).join("") || emptyState("No audit logs yet.")}</div>
      </article>
      <article class="shell-section surface-page reveal-on-scroll">
        <div class="section-head"><div><p class="mini-label">Inspect</p><h2>Deep inspection</h2></div>${debug ? `<span class="meta-pill">${escapeHtml(debug.task.taskId)}</span>` : ""}</div>
        ${debug
          ? `
            <div class="audit-list">
              <div class="audit-item">
                <strong>${escapeHtml(debug.task.title)}</strong>
                <p>${escapeHtml(debug.task.status)} | tx ${escapeHtml(debug.task.transactionState)} | ${escapeHtml(debug.task.onchainTaskRef || "no onchain ref")}</p>
              </div>
              ${debug.execution.map((entry) => `
                <div class="audit-item">
                  <strong>Run ${escapeHtml(entry.run.runId)}</strong>
                  <p>${escapeHtml(entry.run.state)} | attempt ${entry.run.attempt} | ${escapeHtml(entry.run.failureCategory || "no failure category")}</p>
                  <small>${escapeHtml(entry.run.lastErrorMessage || entry.run.resultHash || "No terminal detail yet")}</small>
                  <div class="preview-tags" style="margin-top:10px;">
                    <span class="tag">endpoint ${escapeHtml(entry.run.endpointUrl)}</span>
                    <span class="tag">remote ${escapeHtml(entry.run.remoteRunId || "pending")}</span>
                  </div>
                  <div class="audit-list" style="margin-top:10px;">${(entry.logs || []).slice(-4).map((log) => `<div class="audit-item"><strong>${escapeHtml(log.event)}</strong><p>${escapeHtml(log.message)}</p></div>`).join("") || emptyState("No logs captured.")}</div>
                </div>
              `).join("")}
              <div class="audit-item">
                <strong>Settlement history</strong>
                <p>${(debug.settlements || []).length} receipt(s) captured.</p>
              </div>
              <div class="audit-item">
                <strong>Internal events</strong>
                <p>${(debug.internalEvents || []).length} event(s) recorded for this task.</p>
              </div>
            </div>
          `
          : `<div class="empty-inline">Choose a failed execution to inspect its task, runs, logs, and settlement trail.</div>`}
      </article>
      </div>
    </section>
    </section>
  `;

  document.querySelectorAll("[data-admin-pause]").forEach((node) => {
    node.addEventListener("click", async () => {
      const reason = window.prompt("Pause reason", "Paused for manual review.");
      if (!reason) return;
      await sendJson(`/api/admin/tasks/${node.dataset.adminPause}/pause`, "POST", {
        adminWallet: state.wallet,
        reason,
      }).then(() => {
        updateStatus("Task paused", "Admin pause recorded successfully.", "success");
        renderAdmin();
      }).catch((error) => updateStatus("Pause failed", statusMessage(error, "Pause failed"), "warn"));
    });
  });

  document.querySelectorAll("[data-admin-refund]").forEach((node) => {
    node.addEventListener("click", async () => {
      const reason = window.prompt("Refund reason", "Refunding after admin review.");
      if (!reason) return;
      await sendJson(`/api/admin/tasks/${node.dataset.adminRefund}/refund`, "POST", {
        adminWallet: state.wallet,
        reason,
      }).then(() => {
        updateStatus("Refund completed", "Admin refund recorded successfully.", "success");
        renderAdmin();
      }).catch((error) => updateStatus("Refund failed", statusMessage(error, "Refund failed"), "warn"));
    });
  });

  document.querySelectorAll("[data-admin-resolve]").forEach((node) => {
    node.addEventListener("click", async () => {
      const resolution = window.prompt("Resolution note", "Resolved after reviewing dispute evidence.");
      if (!resolution) return;
      await sendJson(`/api/admin/tasks/${node.dataset.adminResolve}/resolve-dispute`, "POST", {
        adminWallet: state.wallet,
        outcome: node.dataset.outcome,
        resolution,
      }).then(() => {
        updateStatus("Dispute resolved", "Admin resolution recorded successfully.", "success");
        renderAdmin();
      }).catch((error) => updateStatus("Resolution failed", statusMessage(error, "Resolution failed"), "warn"));
    });
  });

  document.querySelectorAll("[data-admin-disable]").forEach((node) => {
    node.addEventListener("click", async () => {
      const reason = window.prompt("Disable reason", "Disabled for repeated failures or abuse risk.");
      if (!reason) return;
      await sendJson(`/api/admin/agents/${node.dataset.adminDisable}/disable`, "POST", {
        adminWallet: state.wallet,
        reason,
      }).then(() => {
        updateStatus("Agent disabled", "Admin disable recorded successfully.", "success");
        renderAdmin();
      }).catch((error) => updateStatus("Disable failed", statusMessage(error, "Disable failed"), "warn"));
    });
  });

  document.querySelectorAll("[data-admin-blacklist]").forEach((node) => {
    node.addEventListener("click", async () => {
      const reason = window.prompt("Blacklist reason", "Endpoint blacklisted by admin.");
      if (!reason) return;
      await sendJson("/api/admin/endpoints/blacklist", "POST", {
        adminWallet: state.wallet,
        endpointUrl: node.dataset.adminBlacklist,
        reason,
      }).then(() => {
        updateStatus("Endpoint blacklisted", "The endpoint is now blocked from new execution dispatches.", "success");
        renderAdmin();
      }).catch((error) => updateStatus("Blacklist failed", statusMessage(error, "Blacklist failed"), "warn"));
    });
  });

  document.querySelectorAll("[data-admin-debug]").forEach((node) => {
    node.addEventListener("click", () => {
      const next = new URL(window.location.href);
      next.searchParams.set("debugTask", node.dataset.adminDebug);
      history.pushState({}, "", next.pathname + next.search);
      renderAdmin();
    });
  });
  revealSections(el.appRoot);
}

function startInitialMarketHydration() {
  if (initialMarketHydrationPromise) return;
  initialMarketHydrationPromise = loadMarketData()
    .catch((error) => {
      state.marketDataError = statusMessage(error, "Marketplace data is temporarily unavailable.");
    })
    .finally(() => {
      safeRender("Marketplace hydration render failed");
    });
}

async function render() {
  renderNav();
  renderTopbar();
  renderFooter();

  if (!state.marketDataLoaded && !initialMarketHydrationPromise) startInitialMarketHydration();

  const path = window.location.pathname;

  if (path === "/") return renderHome();
  if (path === "/agents") return renderAgentsPage();
  if (path.startsWith("/agents/")) return renderAgentProfile(path.split("/")[2]);
  if (path === "/post-task") return renderPostTaskPage();
  if (path === "/nano") return renderNanoPageSimplified();
  if (path === "/arc-demo") return renderArcDemoRemoved();
  if (path.startsWith("/tasks/")) return renderTaskDetail(path.split("/")[2]);
  if (path === "/create-agent") return renderCreateAgent();
  if (path === "/connect-agent") return renderConnectExternalAgent();
  if (path === "/dashboard") return renderDashboard();
  if (path === "/admin") return renderAdmin();

  navigate("/");
}

applyTheme(el, state.theme);
renderNav();
renderTopbar();
renderWalletSheet(false);
safeRender("Initial render failed");
document.documentElement.style.scrollBehavior = "smooth";
document.addEventListener("DOMContentLoaded", () => revealSections(document));
window.addEventListener("popstate", () => revealSections(document));
window.setInterval(async () => {
  if (document.hidden || ambientRefreshPending || !state.tasks) return;
  const path = window.location.pathname;
  const refreshable = path === "/" || path === "/agents" || path === "/dashboard";
  if (!refreshable) return;
  ambientRefreshPending = true;
  try {
    await loadMarketData().catch(() => {});
    await safeRender("Ambient refresh render failed");
  } finally {
    ambientRefreshPending = false;
  }
}, 20000);

async function syncInjectedWalletFromBrowser() {
  if (!isInjectedWalletAvailable()) return;
  if (state.walletConnectionType !== "injected" && state.wallet.trim()) return;
  const wallet = await getInjectedWalletAddress().catch(() => "");
  if (!wallet) {
    if (state.walletConnectionType === "injected") {
      state.wallet = "";
      state.walletConnectionType = "manual";
      state.walletProviderLabel = "";
      localStorage.removeItem("activeWallet");
      localStorage.setItem("walletConnectionType", state.walletConnectionType);
      localStorage.removeItem("walletProviderLabel");
      el.ownerWallet.value = "";
    }
    return;
  }

  const providerLabel = getInjectedWalletProviderLabel();
  if (state.wallet !== wallet) resetNanoDataForWallet();
  state.wallet = wallet;
  state.walletConnectionType = "injected";
  state.walletProviderLabel = providerLabel;
  localStorage.setItem("activeWallet", wallet);
  localStorage.setItem("walletConnectionType", state.walletConnectionType);
  localStorage.setItem("walletProviderLabel", providerLabel);
  el.ownerWallet.value = wallet;
  renderTopbar();
}
