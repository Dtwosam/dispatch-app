import { makeId } from "../lib/ids";
import { resolveRouterPublicBaseUrl } from "../lib/publicBaseUrl";
import type { InMemoryRegistryStore } from "../db/store";
import type { AgentBuilderService } from "../services/agentBuilderService";
import type { SettlementService } from "../services/settlementService";
import type { TaskMarketService } from "../services/taskMarketService";
import type { AgentProfile, EvaluationResult } from "@marketplace/shared";

type SeedDeps = {
  store: InMemoryRegistryStore;
  builderService: AgentBuilderService;
  taskMarketService: TaskMarketService;
  settlementService: SettlementService;
  adminWallets: Set<string>;
};

type SeedTaskInput = {
  title: string;
  description: string;
  category: string;
  rewardAmount: number;
  deadlineHours: number;
  hiringMode: "direct_hire" | "open_market";
  creatorWallet: string;
  selectedAgentId?: string | null;
  evaluationPreference?: "user_review_only" | "assisted_evaluation" | "hybrid_review";
  structuredNotes?: string | null;
  maxParticipants?: number;
  attachments?: Array<{ id: string; title: string; pointer: string }>;
};

const callbackBaseUrl = resolveRouterPublicBaseUrl();

export async function seedMarketplaceData({
  store,
  builderService,
  taskMarketService,
  settlementService,
  adminWallets,
}: SeedDeps) {
  if (store.agents.size > 0 || store.tasks.size > 0) return;
  const accounts = createDemoAccounts();
  accounts.adminWallets.forEach((wallet) => adminWallets.add(wallet));

  seedOwnerProofs(store, accounts);
  seedAgents(store);
  seedBuilderDraft(builderService, accounts);
  seedTasks(taskMarketService, settlementService, store, adminWallets, accounts);
}

function createDemoAccounts() {
  return {
    adminWallets: ["0xadmin001", "0xops002"],
    buyers: [
      "0xbuyer001",
      "0xbuyer002",
      "0xbuyer003",
      "0xbuyer004",
      "0xbuyer005",
      "0xbuyer006",
    ],
    agentOwners: [
      "0xagent001",
      "0xagent002",
      "0xagent003",
      "0xagent004",
      "0xagent005",
      "0xagent006",
      "0xagent007",
      "0xagent008",
      "0xagent009",
      "0xagent010",
      "0xagent011",
      "0xagent012",
    ],
    scenarioWallets: {
      platformCreator: "0xcreator001",
      externalOwner: "0xexternal001",
      directHireBuyer: "0xbuyer010",
      openMarketBuyer: "0xbuyer011",
    },
  };
}

function seedOwnerProofs(store: InMemoryRegistryStore, accounts: ReturnType<typeof createDemoAccounts>) {
  [...accounts.agentOwners, ...Object.values(accounts.scenarioWallets)].forEach((wallet, index) => {
    const challengeId = `seed_challenge_${index + 1}`;
    store.ownerProofChallenges.set(challengeId, {
      challengeId,
      walletAddress: wallet,
      message: `Seed proof for ${wallet}`,
      nonce: `seed_nonce_${index + 1}`,
      expiresAt: new Date(Date.now() + 86400000 * 7).toISOString(),
      createdAt: new Date().toISOString(),
      verifiedAt: new Date().toISOString(),
      proofId: `seed_proof_${index + 1}`,
      signature: "seed-signature",
      status: "verified",
    });
  });
}

function seedAgents(store: InMemoryRegistryStore) {
  const now = new Date().toISOString();
  const seededAgents = [
    agentRow("agent_signal_forge", "0xagent001", "Signal Forge", "signal-forge", "Turns research, customer signals, and market notes into clear strategy briefs.", "platform", "research", ["market-intelligence", "briefing", "analysis"], ["research_synthesis", "competitive_analysis", "strategy_briefing"], ["research", "strategy"], null, 6000, 38000, "Premium strategy research"),
    agentRow("agent_copysprint", "0xagent002", "CopySprint", "copysprint", "Writes sharper landing page, email, and launch copy.", "external", "writing", ["copywriting", "conversion", "email"], ["homepage_copy", "email_copy", "launch_copy"], ["writing", "marketing"], "http://localhost:4010", 4000, 22000, "Fast for conversion copy"),
    agentRow("agent_briefly", "0xagent003", "Briefly", "briefly", "Turns long notes, meetings, and documents into clear summaries.", "platform", "summarization", ["summaries", "executive-brief", "compression"], ["meeting_summary", "executive_briefing", "transcript_digest"], ["summarization"], null, 2500, 14000, "Sharp summary specialist"),
    agentRow("agent_patchpilot", "0xagent004", "PatchPilot", "patchpilot", "Code helper for bug triage, patch suggestions, and implementation notes.", "external", "code_helper", ["bugfix", "refactor", "typescript"], ["bug_triage", "patch_planning", "implementation_notes"], ["engineering"], "http://localhost:4011", 5000, 26000, "Helpful on scoped engineering tasks"),
    agentRow("agent_polylane", "0xagent005", "PolyLane", "polylane", "Translates and localizes product, support, and launch content.", "platform", "translation", ["translation", "localization", "tone-preservation"], ["translation", "localization", "terminology_preservation"], ["translation", "localization"], null, 3000, 16000, "Reliable multi-language delivery"),
    agentRow("agent_tableminer", "0xagent006", "TableMiner", "tableminer", "Pulls clean structured data from messy text, tables, invoices, and forms.", "external", "data_extraction", ["parsing", "csv", "entity-extraction"], ["field_extraction", "table_parsing", "data_normalization"], ["data_extraction"], "http://localhost:4012", 4500, 24000, "Good for messy source material"),
    agentRow("agent_clauselens", "0xagent007", "ClauseLens", "clauselens", "Reviews contracts and policy text and answers questions from the source.", "platform", "document_qa", ["policy-qa", "doc-review", "compliance"], ["contract_qa", "source_grounding", "clause_review"], ["document_qa", "legal"], null, 5000, 28000, "Built for document understanding"),
    agentRow("agent_meetingmint", "0xagent008", "MeetingMint", "meetingmint", "Turns transcripts into next steps, action items, and summaries.", "platform", "summarization", ["transcript", "action-items", "follow-up"], ["meeting_summary", "action_item_extraction", "followup_digest"], ["summarization"], null, 2800, 12000, "Great for meeting outputs"),
    agentRow("agent_queryharbor", "0xagent009", "QueryHarbor", "queryharbor", "Research agent for sourcing public facts and framing implications.", "external", "research", ["web-research", "fact-finding", "sourcing"], ["web_research", "fact_finding", "evidence_synthesis"], ["research"], "http://localhost:4013", 5000, 32000, "Wide-angle research coverage"),
    agentRow("agent_schemasmith", "0xagent010", "SchemaSmith", "schemasmith", "Turns messy input into clean JSON schemas and structured outputs.", "platform", "coding", ["json", "structured-output", "automation"], ["schema_design", "field_mapping", "structured_output"], ["automation", "structured_data"], null, 2600, 11000, "Excellent for machine-readable outputs"),
    agentRow("agent_dossierdive", "0xagent011", "DossierDive", "dossierdive", "Answers questions over dense reports and uploaded source packs.", "external", "document_qa", ["question-answering", "citations", "reports"], ["report_qa", "citation_answering", "source_grounding"], ["document_qa"], "http://localhost:4014", 5200, 30000, "Strong for source-grounded answers"),
    agentRow("agent_localeloop", "0xagent012", "LocaleLoop", "localeloop", "Translation and localization for product launches and support macros.", "external", "translation", ["launch-copy", "customer-support", "multilingual"], ["translation", "support_localization", "launch_localization"], ["translation", "localization"], "http://localhost:4015", 3500, 18000, "Fast localization partner"),
  ];

  seededAgents.forEach((agent) => {
    store.upsertAgent(agent);
    store.ensurePerformance(agent.profile.agentId);
  });

  for (const row of store.agents.values()) {
    row.profile.createdAt = now;
    row.profile.updatedAt = now;
  }
}

function seedBuilderDraft(builderService: AgentBuilderService, accounts: ReturnType<typeof createDemoAccounts>) {
  builderService.createDraft({
    ownerWallet: accounts.scenarioWallets.platformCreator,
    currentStep: 7,
    identity: {
      publicName: "Insight Loom",
      slug: "insight-loom",
      tagline: "Turns raw research and internal context into decisive recommendation memos.",
      category: "research",
      capabilityTags: ["strategy", "briefing", "synthesis"],
      avatarUrl: null,
    },
    behavior: {
      systemInstructions: "Operate like a sharp strategy associate. Structure findings clearly and show uncertainty honestly.",
      prohibitedBehaviors: ["No fabricated market claims", "No invented citations"],
      toneStyle: "Executive, concise, direct",
      structuredOutputRequired: true,
      domainConstraints: ["B2B software", "growth strategy"],
      qualityPreference: 82,
    },
    tools: {
      selectedTools: [
        { id: "web_retrieval_stub", enabled: true, config: {} },
        { id: "structured_formatter", enabled: true, config: {} },
      ],
      advancedOpen: false,
    },
    knowledge: {
      attachments: [
        { id: "knowledge_seed_1", kind: "note", title: "House strategy rubric", pointer: "note://house-strategy-rubric" },
      ],
      retrievalHooks: ["internal://strategy-rubric"],
      notes: ["Use this draft for the publish walkthrough."],
    },
    schemaDefinition: {
      inputFields: [
        { key: "company", label: "Company", type: "string", required: true, description: "Company name" },
      ],
      outputFields: [
        { key: "summary", label: "Summary", type: "string", description: "Topline summary" },
      ],
      outputExample: { summary: "Clear opportunity with one meaningful GTM risk." },
    },
  });
}

function seedTasks(
  taskMarketService: TaskMarketService,
  settlementService: SettlementService,
  store: InMemoryRegistryStore,
  adminWallets: Set<string>,
  accounts: ReturnType<typeof createDemoAccounts>,
) {
  const tasks = [
    taskSeed("Series A launch messaging teardown", "Review three competitor homepages and produce a differentiated messaging brief for our June launch. Include one positioning angle we can own.", "research", 320, 36, "open_market", accounts.buyers[0], null, "hybrid_review", "One-page output, crisp bullets, recommendation at the end."),
    taskSeed("Translate support macros into Spanish", "Translate our ten most-used support macros into natural LATAM Spanish while keeping a warm product voice and consistent product terminology.", "translation", 120, 18, "direct_hire", accounts.buyers[1], "agent_localeloop", "user_review_only", "Preserve short sentence rhythm and keep button labels in English."),
    taskSeed("Investor memo compression", "Summarize a 40-page investor memo into a 700-word executive brief with three priorities, one risk, and one recommended decision.", "summarization", 140, 20, "direct_hire", accounts.buyers[2], "agent_briefly", "assisted_evaluation", "Audience is internal leadership."),
    taskSeed("Onboarding bug triage plan", "Review the bug report bundle and produce a patch plan with likely root causes, user impact, risk, and recommended order of execution.", "code_helper", 260, 24, "direct_hire", accounts.buyers[3], "agent_patchpilot", "hybrid_review", "Include implementation sequence and rollback notes."),
    taskSeed("Extract vendor pricing tables", "Extract plan names, price points, contract length, renewal notes, and free-trial terms from six vendor PDFs.", "data_extraction", 210, 28, "open_market", accounts.buyers[4], null, "assisted_evaluation", "Return CSV-ready fields.", 3),
    taskSeed("Policy pack executive QA", "Answer seven executive questions over the uploaded policy pack and cite the relevant sections for each answer.", "document_qa", 240, 30, "direct_hire", accounts.buyers[5], "agent_clauselens", "hybrid_review", "Citations matter."),
    taskSeed("Homepage headline options", "Write eight homepage headline options for a workflow automation product targeting RevOps teams.", "writing", 95, 14, "open_market", accounts.buyers[0], null, "user_review_only", "Confident, modern, plain English.", 4),
    taskSeed("Board update summary", "Turn last week’s meeting transcript into a crisp board update with wins, risks, and asks.", "summarization", 110, 12, "direct_hire", accounts.buyers[1], "agent_meetingmint", "assisted_evaluation", "Keep under 500 words."),
    taskSeed("Support article localization", "Translate three help-center articles into French and German with product terms preserved.", "translation", 180, 26, "open_market", accounts.buyers[2], null, "hybrid_review", "Use our product nouns consistently.", 2),
    taskSeed("Source-grounded Q&A on annual report", "Answer eight questions over the annual report and return cited responses in JSON.", "document_qa", 280, 40, "direct_hire", accounts.buyers[3], "agent_dossierdive", "hybrid_review", "JSON only."),
    taskSeed("CRM export cleanup", "Extract valid company names, countries, and stage values from a noisy CSV export.", "data_extraction", 130, 16, "open_market", accounts.buyers[4], null, "assisted_evaluation", "Normalize obvious spelling mistakes.", 3),
    taskSeed("Three-product competitor scan", "Build a short competitor scan across three adjacent products and suggest one positioning move.", "research", 300, 30, "direct_hire", accounts.buyers[5], "agent_signal_forge", "hybrid_review", "Need recommendation at the end."),
    taskSeed("Landing page variant pack", "Produce hero, proof, and CTA copy variants for a new pricing page test.", "writing", 175, 22, "direct_hire", accounts.buyers[0], "agent_copysprint", "user_review_only", "Aim for clarity over hype."),
    taskSeed("Automation-ready schema mapping", "Map five webhook payload examples into a consistent structured schema.", "coding", 220, 18, "direct_hire", accounts.buyers[1], "agent_schemasmith", "assisted_evaluation", "Return keys and example values."),
    taskSeed("Weekly market brief", "Summarize the week’s notable category moves into a decision-ready internal brief.", "research", 160, 18, "open_market", accounts.buyers[2], null, "assisted_evaluation", "Show implications, not just facts.", 3),
    taskSeed("Customer call transcript digest", "Digest five sales calls into common objections, proof points, and next-step recommendations.", "summarization", 150, 20, "open_market", accounts.buyers[3], null, "hybrid_review", "Make it usable by GTM.", 3),
    taskSeed("Contract clause question set", "Answer clause-level questions over a vendor contract pack and flag unusual terms.", "document_qa", 260, 24, "open_market", accounts.buyers[4], null, "hybrid_review", "Flag anything non-standard.", 2),
    taskSeed("Checkout flow bug fix outline", "Read the failing checkout logs and propose a root-cause ranked remediation plan.", "code_helper", 240, 24, "direct_hire", accounts.buyers[5], "agent_patchpilot", "hybrid_review", "No code patch, just plan."),
    taskSeed("Lead list enrichment extract", "Extract LinkedIn URL, title, company, and region from the supplied lead list images.", "data_extraction", 190, 32, "open_market", accounts.buyers[0], null, "assisted_evaluation", "Prioritize correctness.", 3),
    taskSeed("Help article concise rewrite", "Rewrite a verbose support article into a shorter customer-friendly version.", "writing", 105, 14, "direct_hire", accounts.buyers[1], "agent_copysprint", "user_review_only", "Keep steps explicit."),
    taskSeed("Bilingual launch email", "Write and translate a launch email into English and Spanish in one deliverable.", "translation", 145, 20, "direct_hire", accounts.buyers[2], "agent_polylane", "hybrid_review", "Preserve a premium tone."),
    taskSeed("Research notes to brief", "Turn raw market notes and call snippets into an internal synthesis memo.", "research", 210, 26, "open_market", accounts.buyers[3], null, "assisted_evaluation", "Need a recommendation section.", 4),
  ];

  const created = tasks.map((input) => {
    const result = taskMarketService.createTask({
      title: input.title,
      description: input.description,
      category: input.category as any,
      rewardAmount: input.rewardAmount,
      deadline: new Date(Date.now() + input.deadlineHours * 3600000).toISOString(),
      hiringMode: input.hiringMode,
      selectedAgentId: input.selectedAgentId ?? null,
      attachments: input.attachments ?? [],
      evaluationPreference: input.evaluationPreference ?? "hybrid_review",
      structuredNotes: input.structuredNotes ?? null,
      creatorWallet: input.creatorWallet,
      maxParticipants: input.maxParticipants ?? 1,
    });
    const task = store.tasks.get(result.task.taskId)!;
    anchorTask(task);
    store.tasks.set(task.taskId, task);
    return task;
  });

  // Open tasks
  markOpen(created[0]);
  markOpen(created[4]);
  markOpen(created[6]);
  markOpen(created[14]);

  // Executing tasks
  markExecuting(taskMarketService, store, created[1].taskId, "0xagent012");
  markExecuting(taskMarketService, store, created[3].taskId, "0xagent004");
  markExecuting(taskMarketService, store, created[15].taskId, "0xagent003");

  // Approved/completed tasks
  markSubmittedApproved(taskMarketService, store, created[2].taskId, "agent_briefly", 92, "The memo was compressed into a crisp executive brief with clear priorities and a usable recommendation");
  markSubmittedApproved(taskMarketService, store, created[13].taskId, "agent_schemasmith", 90, "The payload mapping was consistent, easy to read, and ready for downstream automation");

  // Settled tasks
  settleSuccessful(taskMarketService, settlementService, store, created[5].taskId, "agent_clauselens", 94, "Each answer cited the right source section and gave leadership a response they could use immediately");
  settleSuccessful(taskMarketService, settlementService, store, created[11].taskId, "agent_signal_forge", 91, "The competitor scan ended with a sharp positioning move that felt specific enough to act on");
  settleSuccessful(taskMarketService, settlementService, store, created[12].taskId, "agent_copysprint", 88, "The page variants were clearer, more differentiated, and materially stronger than the original copy");
  settleSuccessful(taskMarketService, settlementService, store, created[19].taskId, "agent_copysprint", 86, "The rewrite cut the noise, kept the steps intact, and felt more customer-friendly right away");
  settleSuccessful(taskMarketService, settlementService, store, created[20].taskId, "agent_polylane", 89, "The bilingual launch email kept the premium tone intact while staying natural in both languages");

  // Rejected tasks
  rejectTask(taskMarketService, store, created[7].taskId, "agent_meetingmint", 61, "The board update missed two important asks and flattened the main decision point");
  rejectTask(taskMarketService, store, created[8].taskId, "agent_localeloop", 58, "The localization read fluently, but several product terms drifted away from the approved glossary");
  rejectTask(taskMarketService, store, created[17].taskId, "agent_patchpilot", 55, "The remediation outline was too generic and did not rank likely causes with enough confidence");

  // Refunded tasks
  refundRejectedTask(taskMarketService, settlementService, store, created[9].taskId, "agent_dossierdive", 57, "The cited answers were directionally useful, but the JSON structure was inconsistent across questions");
  refundRejectedTask(taskMarketService, settlementService, store, created[10].taskId, "agent_tableminer", 52, "The extraction missed enough rows and field normalizations that the buyer could not trust the output");
  refundRejectedTask(taskMarketService, settlementService, store, created[18].taskId, "agent_tableminer", 49, "Too many company and title fields were missing for the lead list to be usable without manual cleanup");

  // Disputed and admin resolution
  openDispute(taskMarketService, settlementService, store, created[16].taskId, "agent_clauselens", 70, "Most clause answers were helpful, but one cited section did not fully support the flagged risk");
  resolveDisputeRefund(taskMarketService, settlementService, store, adminWallets, created[21].taskId, "agent_queryharbor", 68, "The memo had useful signal, but the recommendation leaned too far beyond the available evidence");
}

function agentRow(
  agentId: string,
  ownerWallet: string,
  publicName: string,
  slug: string,
  description: string,
  originType: "platform" | "external",
  category: AgentProfile["category"],
  capabilityTags: string[],
  skills: string[],
  skillCategories: string[],
  endpointUrl: string | null,
  minMs: number,
  maxMs: number,
  pricingHint: string,
) {
  return {
    profile: {
      agentId,
      ownerWallet,
      publicName,
      slug,
      description,
      avatarUrl: null,
      originType,
      category,
      capabilityTags,
      skills,
      skillCategories,
      endpointUrl,
      expectedLatencyMsRange: { minMs, maxMs },
      pricingHint,
      activeVersionHash: `ver_${slug}`,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    registrationState: "active" as const,
    healthStatus: "healthy" as const,
    compatibilityStatus: "compatible" as const,
    latestVersionHash: `ver_${slug}`,
    suspensionReason: null,
    compatibilityDeclaration: endpointUrl
      ? {
          supportedCategories: [category],
          declaredLatencyEstimateMs: Math.round((minMs + maxMs) / 2),
          declaredMaxPayloadSize: 262144,
          versionHashOrFingerprint: `ver_${slug}`,
        }
      : null,
  };
}

function taskSeed(
  title: string,
  description: string,
  category: string,
  rewardAmount: number,
  deadlineHours: number,
  hiringMode: "direct_hire" | "open_market",
  creatorWallet: string,
  selectedAgentId: string | null,
  evaluationPreference: "user_review_only" | "assisted_evaluation" | "hybrid_review",
  structuredNotes: string,
  maxParticipants = 1,
): SeedTaskInput {
  return { title, description, category, rewardAmount, deadlineHours, hiringMode, creatorWallet, selectedAgentId, evaluationPreference, structuredNotes, maxParticipants };
}

function anchorTask(task: any) {
  task.transactionState = "accepted";
  task.onchainTaskRef = `onchain:${task.taskId}`;
  task.status = task.hiringMode === "direct_hire" ? "ASSIGNED" : "OPEN";
  task.updatedAt = new Date().toISOString();
  task.timeline.push({
    id: makeId("evt"),
    kind: "escrow_funded",
    title: "Escrow funded",
    description: "Reward funding is now anchored and the task is live.",
    createdAt: new Date().toISOString(),
  });
  if (task.hiringMode === "direct_hire" && task.selectedAgentId) {
    task.timeline.push({
      id: makeId("evt"),
      kind: "agent_invited",
      title: "Agent invited",
      description: "The selected agent has been invited and assigned.",
      createdAt: new Date().toISOString(),
    });
  }
  task.reviewActions = ["cancel"];
}

function markOpen(task: any) {
  task.status = "OPEN";
  task.resultStatus = "not_started";
}

function markExecuting(taskMarketService: TaskMarketService, store: InMemoryRegistryStore, taskId: string, ownerWallet: string) {
  const agent = [...store.agents.values()].find((row) => row.profile.ownerWallet === ownerWallet)?.profile;
  if (!agent) {
    throw new Error(`Seed agent owner ${ownerWallet} not found for task ${taskId}`);
  }
  beginSeedExecution(taskMarketService, store, taskId, agent.agentId);
}

function markSubmittedApproved(taskMarketService: TaskMarketService, store: InMemoryRegistryStore, taskId: string, agentId: string, score: number, summary: string) {
  beginSeedExecution(taskMarketService, store, taskId, agentId);
  const task = store.tasks.get(taskId)!;
  taskMarketService.markSubmissionReceived(taskId, agentId, `seed://results/${taskId}`, `seed_hash_${taskId}`);
  task.latestEvaluation = evaluation(taskId, agentId, score, "approve", summary, "assisted_evaluation");
  task.status = "APPROVED";
  task.resultStatus = "approved";
  task.settlementState = "pending_settlement";
  task.reviewActions = ["settle"];
  store.tasks.set(taskId, task);
  attachRun(store, taskId, agentId, "completed", 4800 + score * 5, `seed_hash_${taskId}`);
}

function settleSuccessful(taskMarketService: TaskMarketService, settlementService: SettlementService, store: InMemoryRegistryStore, taskId: string, agentId: string, score: number, summary: string) {
  markSubmittedApproved(taskMarketService, store, taskId, agentId, score, summary);
  const task = store.tasks.get(taskId)!;
  settlementService.settleApprovedTask(taskId, task.creatorWallet);
}

function rejectTask(taskMarketService: TaskMarketService, store: InMemoryRegistryStore, taskId: string, agentId: string, score: number, summary: string) {
  beginSeedExecution(taskMarketService, store, taskId, agentId);
  taskMarketService.markSubmissionReceived(taskId, agentId, `seed://results/${taskId}`, `seed_hash_${taskId}`);
  const task = store.tasks.get(taskId)!;
  task.latestEvaluation = evaluation(taskId, agentId, score, "reject", summary, "user_review");
  task.userReview = {
    taskId,
    submissionId: `${taskId}_submission`,
    decision: "reject",
    starRating: 2,
    feedback: summary,
    rejectionReason: summary,
    reviewerWallet: task.creatorWallet,
  };
  task.status = "REJECTED";
  task.resultStatus = "rejected";
  task.settlementState = "pending_settlement";
  task.reviewActions = ["refund", "dispute"];
  store.tasks.set(taskId, task);
  attachRun(store, taskId, agentId, "completed", 7200 + score * 8, `seed_hash_${taskId}`);
}

function refundRejectedTask(taskMarketService: TaskMarketService, settlementService: SettlementService, store: InMemoryRegistryStore, taskId: string, agentId: string, score: number, summary: string) {
  rejectTask(taskMarketService, store, taskId, agentId, score, summary);
  const task = store.tasks.get(taskId)!;
  settlementService.refundTask(taskId, task.creatorWallet);
}

function openDispute(taskMarketService: TaskMarketService, settlementService: SettlementService, store: InMemoryRegistryStore, taskId: string, agentId: string, score: number, summary: string) {
  beginSeedExecution(taskMarketService, store, taskId, agentId);
  taskMarketService.markSubmissionReceived(taskId, agentId, `seed://results/${taskId}`, `seed_hash_${taskId}`);
  const task = store.tasks.get(taskId)!;
  task.latestEvaluation = evaluation(taskId, agentId, score, "needs_human_review", summary, "hybrid_review");
  store.tasks.set(taskId, task);
  settlementService.pauseOnDispute(taskId, task.creatorWallet, "Buyer challenged result quality and wants admin review.");
  attachRun(store, taskId, agentId, "completed", 8600 + score * 6, `seed_hash_${taskId}`);
}

function resolveDisputeRefund(taskMarketService: TaskMarketService, settlementService: SettlementService, store: InMemoryRegistryStore, adminWallets: Set<string>, taskId: string, agentId: string, score: number, summary: string) {
  openDispute(taskMarketService, settlementService, store, taskId, agentId, score, summary);
  settlementService.resolveDispute(
    taskId,
    {
      adminWallet: [...adminWallets][0],
      outcome: "refund_buyer",
      resolution: "Admin reviewed the evidence and ruled that the recommendation relied on too much inference for payout.",
    },
    adminWallets,
  );
}

function evaluation(taskId: string, agentId: string, score: number, decision: "approve" | "reject" | "needs_human_review", summary: string, path: "user_review" | "assisted_evaluation" | "hybrid_review"): EvaluationResult {
  const normalizedScore = Math.max(0, Math.min(1, score / 100));
  const createdAt = new Date().toISOString();
  return {
    evaluationId: `eval_${taskId}`,
    taskId,
    winningSubmissionId: `${taskId}_submission`,
    scores: [
      {
        submissionId: `${taskId}_submission`,
        agentId,
        score,
        normalizedScore,
        notes: summary,
      },
    ],
    summary,
    reasoning: `${summary}. The seeded review explains why the task moved toward payout, refund, or dispute so the marketplace feels credible in a live demo.`,
    normalizedScore,
    overallScore: score,
    finalDecision: decision,
    finalOutcome: decision === "approve" ? "accepted" : decision === "reject" ? "rejected" : "unresolved",
    consensusScore: score,
    validatorAgreement: decision === "needs_human_review" ? 0.5 : 0.67,
    consensusConfidence: decision === "needs_human_review" ? 0.58 : 0.78,
    equivalenceSummary: decision === "approve"
      ? "Seed validators judged the seeded output equivalent to a successful task completion."
      : decision === "reject"
        ? "Seed validators judged the seeded output not equivalent to the requested outcome."
        : "Seed validators kept the result unresolved because agreement remained weak.",
    path,
    findings: [
      {
        reviewerId: "seed_reviewer",
        reviewerType: path === "user_review" ? "buyer" : "machine_assisted",
        decision,
        acceptanceSignal: decision === "approve" ? "accept" : decision === "reject" ? "reject" : "uncertain",
        overallScore: score,
        confidence: decision === "needs_human_review" ? 0.58 : 0.78,
        summary,
        reasoning: `${summary}.`,
        criteriaScores: {
          completionScore: Math.max(score - 3, 0),
          relevanceScore: Math.max(score - 1, 0),
          correctnessProxyScore: Math.max(score - 4, 0),
          formatComplianceScore: Math.max(score - 2, 0),
          usefulnessScore: score,
          latencyAwarenessScore: Math.max(score - 8, 0),
        },
        createdAt,
      },
    ],
    reviewerType: path === "user_review" ? "buyer" : "machine_assisted",
    createdAt,
  };
}

function beginSeedExecution(taskMarketService: TaskMarketService, store: InMemoryRegistryStore, taskId: string, agentId: string) {
  const task = store.tasks.get(taskId)!;
  if (task.status === "EXECUTING" || task.status === "SUBMITTED" || task.status === "UNDER_REVIEW" || task.status === "APPROVED" || task.status === "REJECTED" || task.status === "DISPUTED" || task.status === "SETTLED" || task.status === "REFUNDED") {
    return;
  }

  if (task.status === "OPEN") {
    const agent = store.agents.get(agentId);
    if (!agent) {
      throw new Error(`Seed agent ${agentId} not found for task ${taskId}`);
    }
    if (!task.participatingAgentIds.includes(agentId)) {
      task.participatingAgentIds.push(agentId);
    }
    task.selectedAgents = dedupeSeedAgents([
      ...task.selectedAgents,
      {
        agentId,
        displayName: agent.profile.publicName,
        originType: agent.profile.originType,
      },
    ]);
    task.status = "ASSIGNED";
    task.resultStatus = "not_started";
    task.updatedAt = new Date().toISOString();
    task.timeline.push({
      id: makeId("evt"),
      kind: "agent_accepted",
      title: "Agent accepted task",
      description: `${agent.profile.publicName} accepted the seeded assignment and is queued to execute.`,
      createdAt: new Date().toISOString(),
    });
    task.reviewActions = ["cancel"];
    store.tasks.set(taskId, task);
  }

  taskMarketService.markExecutionStarted(taskId, agentId);
}

function dedupeSeedAgents(
  items: Array<{ agentId: string; displayName: string; originType: "platform" | "external" }>,
) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.agentId)) return false;
    seen.add(item.agentId);
    return true;
  });
}

function attachRun(store: InMemoryRegistryStore, taskId: string, agentId: string, state: "completed" | "failed" | "timed_out", latencyMs: number, resultHash: string | null) {
  const startedAt = new Date(Date.now() - latencyMs).toISOString();
  const completedAt = new Date().toISOString();
  store.executionRuns.set(`seed_run_${taskId}`, {
    runId: `seed_run_${taskId}`,
    requestId: `seed_req_${taskId}`,
    taskId,
    agentId,
    ownerWallet: store.agents.get(agentId)?.profile.ownerWallet ?? "0xseedowner",
    endpointUrl: store.agents.get(agentId)?.profile.endpointUrl ?? "seed://platform",
    callbackUrl: `${callbackBaseUrl}/api/execution/callback`,
    state,
    attempt: 1,
    maxRetries: 3,
    nextRetryAt: null,
    timeoutAt: new Date(Date.now() + 60000).toISOString(),
    executionMode: "sync",
    remoteRunId: `remote_${taskId}`,
    resultPointer: resultHash ? `seed://results/${taskId}` : null,
    resultHash,
    rawPayload: null,
    normalizedPayload: null,
    errorCode: null,
    failureCategory: null,
    lastErrorMessage: null,
    createdAt: startedAt,
    updatedAt: completedAt,
    startedAt,
    completedAt,
  });
}
