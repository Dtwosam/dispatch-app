function readConfiguredApiBase() {
  const hostedDefaultApiBase = "";
  if (typeof window === "undefined") return "http://localhost:4020";
  const { hostname, origin } = window.location;
  const isLocalHost = ["localhost", "127.0.0.1"].includes(hostname);

  const queryApiBase = new URLSearchParams(window.location.search).get("apiBase")?.trim();
  if (queryApiBase) {
    localStorage.setItem("routerApiBase", queryApiBase);
    return queryApiBase;
  }

  const storedApiBase = localStorage.getItem("routerApiBase")?.trim();
  if (storedApiBase) {
    const normalizedStoredApiBase = storedApiBase.replace(/\/$/, "");
    const isInvalidHostedStoredApiBase = !isLocalHost && (
      normalizedStoredApiBase === origin.replace(/\/$/, "")
      || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(normalizedStoredApiBase)
    );
    if (!isInvalidHostedStoredApiBase) return storedApiBase;
    localStorage.removeItem("routerApiBase");
  }

  const metaApiBase = document.querySelector('meta[name="dispatch-api-base"]')?.getAttribute("content")?.trim();
  if (metaApiBase) return metaApiBase;

  const globalApiBase = window.__DISPATCH_CONFIG__?.apiBase?.trim();
  if (globalApiBase) return globalApiBase;
  return isLocalHost ? "http://localhost:4020" : hostedDefaultApiBase || origin;
}

function readJsonStorage(key, fallback) {
  if (typeof localStorage === "undefined") return fallback;
  try {
    const value = localStorage.getItem(key);
    if (!value) return fallback;
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export const API_BASE = readConfiguredApiBase();

function readConfiguredNanoSourcePayoutWallet() {
  if (typeof window === "undefined") return "";
  const queryWallet = new URLSearchParams(window.location.search).get("nanoSourcePayoutWallet")?.trim();
  if (queryWallet) {
    localStorage.setItem("dispatchNanoSourcePayoutWallet", queryWallet);
    return queryWallet;
  }
  const storedWallet = localStorage.getItem("dispatchNanoSourcePayoutWallet")?.trim();
  if (storedWallet) return storedWallet;
  return window.__DISPATCH_CONFIG__?.nanoSourcePayoutWallet?.trim() || "";
}

export const routes = [
  ["/", "Explore"],
  ["/agents", "Agents"],
  ["/post-task", "Post Task"],
  ["/nano", "Nano"],
  ["/dashboard", "Dashboard"],
  ["/connect-agent", "Connect Agent"],
  ["/create-agent", "Create Agent"],
];

export const categories = [
  "research",
  "writing",
  "summarization",
  "coding",
  "code_helper",
  "design",
  "analysis",
  "translation",
  "automation",
  "data_extraction",
  "document_qa",
  "marketing",
  "operations",
  "support",
];

export const wizardSteps = ["Identity", "Behavior", "Tools", "Knowledge", "Schema", "Test Run", "Publish"];

export const suggestedSkillsByCategory = {
  research: ["research synthesis", "market signals", "decision support"],
  writing: ["homepage copy", "launch copy", "email copy"],
  summarization: ["meeting summary", "executive brief", "signal extraction"],
  coding: ["schema design", "structured output", "json shaping"],
  code_helper: ["schema design", "structured output", "field mapping"],
  design: ["creative brief", "content structure", "campaign concepting"],
  analysis: ["research synthesis", "decision support", "evidence weighting"],
  translation: ["translation", "localization", "glossary handling"],
  automation: ["runbook design", "workflow planning", "handoff design"],
  data_extraction: ["field extraction", "table parsing", "conflict detection"],
  document_qa: ["contract qa", "source grounding", "insufficient evidence handling"],
  marketing: ["homepage copy", "campaign planning", "audience segmentation"],
  operations: ["runbook design", "incident workflows", "handoff design"],
  support: ["knowledge summarization", "source grounding", "structured responses"],
};

export function createInitialState() {
  return {
    wallet: localStorage.getItem("activeWallet") || "",
    walletConnectionType: localStorage.getItem("walletConnectionType") || "manual",
    walletProviderLabel: localStorage.getItem("walletProviderLabel") || "",
    theme: localStorage.getItem("theme") || "dark",
    agents: [],
    tasks: null,
    leaderboards: { buckets: [] },
    marketDataLoading: false,
    marketDataLoaded: false,
    marketDataError: "",
    marketDataUnavailable: {
      agents: false,
      tasks: false,
      leaderboards: false,
    },
    chainConfig: null,
    chainStatus: null,
    chainStatusError: "",
    chainTransaction: {
      state: "idle",
      message: "No transaction in progress.",
    },
    arcDemo: {
      step: 0,
      taskId: "dispatch_demo_research_001",
      agentId: "platform-agent",
      reward: 10,
      consensusScore: 86,
      validatorAgreement: 78,
      consensusConfidence: 82,
    },
    walletNetwork: {
      loading: false,
      error: "",
      chainId: null,
      expectedChainId: 5042002,
      isArcTestnet: false,
      usdcBalance: null,
      nativeGasBalance: null,
      tokenDecimals: 6,
      message: "",
    },
    task: null,
    history: { items: [] },
    revisionRequests: readJsonStorage("dispatchRevisionRequests", {}),
    disputeRecords: readJsonStorage("dispatchDisputeRecords", {}),
    mobileNavOpen: false,
    search: "",
    filters: { category: "all", skill: "all", speed: "all", approval: "all", sort: "best_overall" },
    dashboardTab: "tasks",
    nano: {
      health: null,
      healthLoading: false,
      healthError: "",
      budgets: [],
      budgetsLoaded: false,
      budgetsLoading: false,
      budgetsError: "",
      selectedBudgetId: "",
      activity: null,
      activityLoading: false,
      activityError: "",
      metrics: null,
      metricsLoading: false,
      metricsError: "",
      budgetGoal: "Create a short brief about stablecoin payments.",
      budgetAmount: "1",
      sourcePayoutWallet: readConfiguredNanoSourcePayoutWallet(),
      arcProofTxHash: "",
      arcProofIntentId: "",
      arcProofStatus: "",
      arcProofMessage: "",
      actionPending: "",
    },
    wizardStep: 1,
    agentDraftMeta: {
      draftId: null,
      syncState: "idle",
      syncMessage: "Not saved to the backend yet.",
      lastSyncedAt: null,
      lastTestRunAt: null,
    },
    externalAgentForm: {
      publicName: "OpenClaw Research Worker",
      slug: "openclaw-research-worker",
      category: "research",
      description: "External endpoint-backed agent for research, synthesis, and evidence-based task execution.",
      endpointUrl: "",
      webhookUrl: "",
      developerName: "",
      adapterType: "erc8183_adapter",
      outputSchema: "Structured JSON or markdown result suitable for evaluator review.",
      payoutWallet: "",
      skills: ["research synthesis", "evidence gathering", "structured output"],
      pricingHint: "Bring your own endpoint",
      minLatencyMs: 1500,
      maxLatencyMs: 9000,
      maxPayloadSize: 250000,
      versionHash: "",
    },
    externalAgentMeta: {
      ownerProofId: null,
      verificationMode: null,
      verificationState: "idle",
      verificationMessage: "Verify wallet ownership before connecting an external agent.",
      registryAgentId: null,
      compatibilityHeadline: "Checks have not run yet.",
      compatibilityNotes: [],
    },
    taskForm: {
      title: "",
      description: "",
      templateId: "custom_task",
      templateFields: {},
      templateMessage: "",
      selectedServicePackage: null,
      category: "research",
      rewardAmount: "",
      deadline: "",
      hiringMode: "direct_hire",
      selectedAgentId: "",
      attachments: [],
      evaluationPreference: "hybrid_review",
      structuredNotes: "",
      maxParticipants: 1,
    },
    agentDraft: {
      identity: {
        name: "Conversion Writer",
        slug: "conversion-writer",
        tagline: "Turns product context into high-conviction landing page copy.",
        category: "writing",
        tags: ["homepage copy", "email copy", "positioning"],
        avatar: "CW",
      },
      behavior: {
        systemPrompt: "You are a conversion-focused AI agent. Deliver clear, concise, commercially useful work.",
        prohibited: "No fabricated claims, no legal advice, no vague filler.",
        tone: "Confident, modern, practical.",
        structured: "Return concise sections with clear headings.",
        constraints: "Stay within SaaS and product marketing contexts.",
        quality: 70,
      },
      tools: ["structured_formatter", "summarizer_helper"],
      knowledge: [],
      schema: {
        inputFields: [
          { key: "brand", label: "Brand" },
          { key: "audience", label: "Audience" },
        ],
        outputFields: [
          { key: "headline", label: "Headline" },
          { key: "supporting_points", label: "Supporting Points" },
        ],
        outputExample: '{ "headline": "Move faster with trust", "supporting_points": ["Signal 1", "Signal 2"] }',
      },
      testRun: {
        sampleTask: "Rewrite our homepage hero for higher trial conversion.",
        result: null,
        latencyMs: null,
        valid: null,
        error: null,
      },
    },
  };
}
