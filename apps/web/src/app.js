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
  validateSettlementHistoryResponse,
  validateTaskDraftCreateResponse,
  validateTaskDetailResponse,
  validateTaskListResponse,
} from "./api-contracts.js";
import {
  buildPostTaskChecklist,
  buildReviewPanelModel,
  buildTaskDisputeDisplayModel,
  buildTaskResultModel,
  buildTaskRevisionDisplayModel,
  buildTaskTemplateBrief,
  getTaskBriefTemplate,
  shortWallet,
  taskBriefTemplates,
} from "./ui-models.js";
const state = createInitialState();
const el = getAppElements();
let ambientRefreshPending = false;
let attachmentIngestionModulePromise = null;
const pendingTaskAutoChecks = new Set();
let activeTaskDetailRenderToken = 0;

function persistRevisionRequests() {
  localStorage.setItem("dispatchRevisionRequests", JSON.stringify(state.revisionRequests || {}));
}

function persistDisputeRecords() {
  localStorage.setItem("dispatchDisputeRecords", JSON.stringify(state.disputeRecords || {}));
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
  renderFatalAppError(error, "Wallet initialization failed");
});
watchInjectedWallet({
  onAccountsChanged: (accounts) => {
    const nextWallet = accounts[0] || "";
    const nextProviderLabel = nextWallet ? getInjectedWalletProviderLabel() : "";
    state.wallet = nextWallet;
    state.walletConnectionType = nextWallet ? "injected" : "manual";
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

async function refreshWalletNetworkState() {
  if (!state.wallet.trim()) return null;
  try {
    state.walletNetwork = { ...state.walletNetwork, loading: true, error: "" };
    const snapshot = await chainClient.getWalletNetworkSnapshot();
    state.walletNetwork = { ...state.walletNetwork, ...snapshot, loading: false, error: "" };
    return snapshot;
  } catch (error) {
    state.walletNetwork = {
      ...state.walletNetwork,
      loading: false,
      error: statusMessage(error, "Wallet network check failed."),
    };
    return null;
  }
}

async function loadMarketData() {
  return loadMarketDataModule();
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

async function renderPostTaskPage() {
  try {
    state.chainStatus = await chainClient.getStatus();
    state.chainConfig = state.chainStatus.config;
    state.chainStatusError = "";
  } catch (error) {
    state.chainStatusError = error instanceof Error ? error.message : "Chain status request failed.";
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
  if (walletReady) {
    await refreshWalletNetworkState();
  }
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
                <p class="post-task-eyebrow">Task brief</p>
                <h2>Describe the outcome.</h2>
                <p>Tell the agent what outcome you want.</p>
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

            <section class="post-template-section">
              <div class="post-task-section-head post-task-section-head--compact">
                <div>
                  <p class="post-task-eyebrow">Template</p>
                  <h3>Pick a starting point.</h3>
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
              <label class="post-field post-field--wide"><strong>Title</strong><input id="taskTitle" value="${escapeHtml(state.taskForm.title)}" placeholder="Rewrite our pricing page for higher conversion clarity" /></label>
              <label class="post-field post-field--wide"><strong>Final editable brief</strong><textarea id="taskDescription" rows="9" placeholder="Describe what good looks like, what to avoid, and what must be delivered.">${escapeHtml(state.taskForm.description)}</textarea></label>
              <label class="post-field"><strong>Category</strong><select id="taskCategory">${categories.map((category) => `<option value="${category}" ${state.taskForm.category === category ? "selected" : ""}>${labelize(category)}</option>`).join("")}</select></label>
              <label class="post-field"><strong>USDC reward</strong><input id="taskReward" type="number" min="1" value="${state.taskForm.rewardAmount}" /><span>This amount is locked before the agent starts.</span></label>
              <label class="post-field"><strong>Deadline</strong><input id="taskDeadline" type="datetime-local" value="${state.taskForm.deadline}" /></label>
              <div class="post-route-control">
                <p class="post-task-eyebrow">Agent route</p>
                <div class="segmented">
                  <button type="button" data-mode="direct_hire" class="${state.taskForm.hiringMode === "direct_hire" ? "active" : ""}">Choose an agent</button>
                  <button type="button" data-mode="open_market" class="${state.taskForm.hiringMode === "open_market" ? "active" : ""}">Post to marketplace</button>
                </div>
                <p class="post-helper">${escapeHtml(routeChoiceHelper)}</p>
              </div>
              ${state.taskForm.hiringMode === "direct_hire"
                ? `
                  <label class="post-field post-field--wide"><strong>Selected agent</strong>
                    <select id="selectedAgentId">
                      <option value="">Choose an agent</option>
                      ${state.agents.map((agent) => `<option value="${agent.profile.agentId}" ${state.taskForm.selectedAgentId === agent.profile.agentId ? "selected" : ""}>${escapeHtml(agent.profile.publicName)} | ${trustScore(agent)} readiness</option>`).join("")}
                    </select>
                  </label>
                `
                : `
                  <label class="post-field post-field--wide"><strong>Max participants</strong><input id="taskParticipants" type="number" min="1" max="20" value="${state.taskForm.maxParticipants}" /></label>
                `}
            </section>
          </article>

          <details class="post-advanced reveal-on-scroll">
            <summary>
              <span>Advanced options</span>
              <small>Optional evaluation and attachment settings</small>
            </summary>
            <div class="post-advanced__body">
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
        </div>

        <aside class="post-task-side">
          <article class="post-funding-summary reveal-on-scroll">
            <p class="post-task-eyebrow">Funding summary</p>
            <h2>${escapeHtml(primaryActionLabel)}</h2>
            <div class="post-summary-list">
              <div><span>Reward</span><strong>${state.taskForm.rewardAmount ? formatCurrency(state.taskForm.rewardAmount) : "Not set"}</strong></div>
              <div><span>Network</span><strong>Arc Testnet</strong></div>
              <div><span>Token</span><strong>USDC</strong></div>
              <div><span>Wallet</span><strong>${walletReady ? shortWallet(state.wallet) : "Required"}</strong></div>
              <div><span>Balance</span><strong>${walletReady ? escapeHtml(state.walletNetwork?.usdcBalance == null ? "Balance unavailable" : `${Number(state.walletNetwork.usdcBalance).toLocaleString(undefined, { maximumFractionDigits: 6 })} USDC`) : "Connect wallet"}</strong></div>
              <div><span>Agent route</span><strong>${state.taskForm.hiringMode === "direct_hire" ? (selectedAgent ? escapeHtml(selectedAgent.profile.publicName) : "Choose agent") : "Post to marketplace"}</strong></div>
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
            <p class="post-funding-hint disabled-reason">${escapeHtml(fundingHint)}</p>
          </article>

          <article class="post-route-summary reveal-on-scroll">
            <p class="post-task-eyebrow">Agent route</p>
            <h3>${selectedAgent ? escapeHtml(selectedAgent.profile.publicName) : escapeHtml(routeChoiceLabel)}</h3>
            <p>${selectedAgent ? escapeHtml(selectedAgent.profile.description) : escapeHtml(routeChoiceHelper)}</p>
            ${selectedAgent ? `
              <div class="post-route-tags">
                ${selectedAgentBestFor.slice(0, 3).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
              </div>
              <div class="post-suggested-list">
                ${selectedAgentIdeas.slice(0, 2).map((idea, index) => `
                  <button type="button" data-suggested-task="${index}">
                    <strong>Starter idea ${index + 1}</strong>
                    <span>${escapeHtml(idea)}</span>
                  </button>
                `).join("")}
              </div>
            ` : ""}
          </article>

          <article class="post-preview-card reveal-on-scroll">
            <p class="post-task-eyebrow">Preview</p>
            <h3>${escapeHtml(state.taskForm.title || "Your task title appears here")}</h3>
            <p>${escapeHtml(state.taskForm.description || "A clearer brief makes execution faster and review easier.")}</p>
            <div>
              <span>${labelize(state.taskForm.category)}</span>
              <span>${state.taskForm.rewardAmount ? `Reward ${formatCurrency(state.taskForm.rewardAmount)}` : "Reward not set"}</span>
              <span>${state.taskForm.deadline ? `Deadline ${deadlineCountdown(state.taskForm.deadline)}` : "Deadline not set"}</span>
            </div>
          </article>

          <details class="post-demo-card reveal-on-scroll">
            <summary>Local test flow</summary>
            <p>Use only for local testing when wallet funding is unavailable.</p>
            <button type="button" data-start-demo-flow>Start local test</button>
          </details>
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
    setButtonLoading(trigger, false);
  }
}

async function runUserDecision(taskId, decision, trigger) {
  try {
    setButtonLoading(trigger, true, labelize(decision));
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
    "Simple operator view for work, agents, and earnings.",
    "Keep Dispatch light: quick metrics, clear tabs, and recent activity.",
    86,
  );
  renderDashboardPage({ el, state, onNavigate: navigate, rerender: renderDashboard });
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

async function render() {
  renderNav();
  renderTopbar();
  renderFooter();

  if (!state.tasks) {
    el.appRoot.innerHTML = `
      <section data-structure="app-loading" class="loading-shell">
        <div class="loading-shell__copy">
          <strong>Loading Dispatch...</strong>
          <p>Preparing agents, tasks, and payment state.</p>
        </div>
        <article class="skeleton"></article>
        <article class="skeleton"></article>
        <article class="skeleton"></article>
        <article class="skeleton"></article>
      </section>
    `;
    try {
      await loadMarketData();
    } catch (error) {
      el.appRoot.innerHTML = `
        <div class="error-state state-card state-card--error shell-section surface-page">
          <span class="empty-state__mark" aria-hidden="true"></span>
          <strong>Network error</strong>
          <p>${escapeHtml(statusMessage(error, "Marketplace data could not be loaded."))}</p>
          <div class="empty-state-actions">
            <button class="hero-primary" id="retryHydrate">Retry</button>
            <button data-wallet="open">Check Wallet</button>
          </div>
        </div>
      `;
      document.getElementById("retryHydrate")?.addEventListener("click", () => {
        state.tasks = null;
        render();
      });
      return;
    }
  }

  const path = window.location.pathname;

  if (path === "/") return renderHome();
  if (path === "/agents") return renderAgentsPage();
  if (path.startsWith("/agents/")) return renderAgentProfile(path.split("/")[2]);
  if (path === "/post-task") return renderPostTaskPage();
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
  state.wallet = wallet;
  state.walletConnectionType = "injected";
  state.walletProviderLabel = providerLabel;
  localStorage.setItem("activeWallet", wallet);
  localStorage.setItem("walletConnectionType", state.walletConnectionType);
  localStorage.setItem("walletProviderLabel", providerLabel);
  el.ownerWallet.value = wallet;
  renderTopbar();
}
