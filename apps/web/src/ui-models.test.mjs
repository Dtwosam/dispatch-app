import test from "node:test";
import assert from "node:assert/strict";
import {
  buildAgentIdentityBadges,
  buildAgentDisplayModel,
  buildArcTransactionLink,
  buildRecentAgentWork,
  buildReviewPanelModel,
  buildSuggestedTaskTemplatesForAgent,
  buildAgentServicePackages,
  buildAgentBuilderDashboardModel,
  buildAgentBuilderSummaryModel,
  buildAgentAttentionItems,
  buildAgentEarningsDashboardModel,
  buildAgentEarningsBreakdown,
  buildEarningsActivityRows,
  buildAgentTrustReadinessModel,
  buildAgentVerificationChecklist,
  buildAgentVerificationModel,
  buildServicePackageDisplayModel,
  buildTaskDraftFromServicePackage,
  buildTaskLifecycleModel,
  buildTaskDisputeDisplayModel,
  buildTaskPaymentDisplayModel,
  buildTaskRevisionDisplayModel,
  buildTaskResultModel,
  buildTaskStatusDisplayModel,
  buildTaskTemplateBrief,
  buildWalletScopedDashboardModel,
  buildNanoAgentDecisionPresentation,
  buildNanoAgentEvaluationPanelModel,
  buildNanoAgentSelectorModel,
  buildNanoBudgetGuardrailModel,
  buildNanoBudgetStatusModel,
  buildNanoCurrentStepModel,
  buildNanoJudgeCommandCenterModel,
  buildNanoMetricsModel,
  buildNanoEconomyStatsModel,
  buildNanoMultiSpendPlanRows,
  buildNanoPaymentActionModel,
  buildNanoRecipientProfile,
  buildNanoRecipientRegistry,
  buildNanoReceiptStatusModel,
  buildNanoRecipientWalletModel,
  buildNanoReceiptDetailModel,
  buildNanoDispatchTaskHandoffModel,
  buildNanoReceiptProofViewModel,
  buildNanoReceiptShareUrl,
  buildNanoResultContributionModel,
  buildNanoResetDraftState,
  buildNanoRunConsoleModel,
  buildNanoRunHistoryModel,
  buildNanoSelectedRunModel,
  buildNanoResultPreviewPresentation,
  buildNanoRunProgressPresentation,
  buildNanoSourceUnlockPresentation,
  buildNanoSpendPlanPresentation,
  buildNanoSpendIntentStatusModel,
  getTaskBriefTemplate,
  nanoBudgetPresets,
  nanoApiUnavailableMessage,
  nanoAgentSelectionFaq,
  nanoDispatchAgentOptions,
  nanoRecipientRegistryProfiles,
  nanoSourcePaymentSpendPlanRows,
  taskBriefTemplates,
  validateNanoBudgetAmount,
  walletNetworkSnapshotsEqual,
} from "./ui-models.js";

test("platform agents expose the Platform Agent badge for marketplace rendering", () => {
  const badges = buildAgentIdentityBadges({
    profile: {
      originType: "platform",
      skillCategories: ["research"],
    },
    performanceSummary: {
      status: "active",
      rankPosition: 2,
      tasksAttempted: 2,
    },
  });

  assert.ok(badges.includes("Platform Agent"));
  assert.ok(badges.includes("Research"));
});

test("external agents expose marketplace and interoperability badges", () => {
  const badges = buildAgentIdentityBadges({
    profile: {
      originType: "external",
      skillCategories: ["writing"],
    },
    performanceSummary: {
      status: "active",
      rankPosition: null,
      tasksAttempted: 1,
    },
  });

  assert.ok(badges.includes("External Agent"));
  assert.ok(badges.includes("ERC-8183 compatible"));
});

test("top and new badges are added from marketplace reputation state", () => {
  const topBadges = buildAgentIdentityBadges({
    profile: {
      originType: "external",
      skillCategories: [],
    },
    performanceSummary: {
      status: "active",
      rankPosition: 1,
      tasksAttempted: 4,
    },
  });

  const newBadges = buildAgentIdentityBadges({
    profile: {
      originType: "external",
      skillCategories: [],
    },
    performanceSummary: {
      status: "new",
      rankPosition: null,
      tasksAttempted: 0,
    },
  });

  assert.ok(topBadges.includes("Top Agent"));
  assert.ok(newBadges.includes("New"));
});

test("agent display model exposes real metrics when available", () => {
  const model = buildAgentDisplayModel({
    profile: {
      agentId: "agent_thread",
      publicName: "Thread Writer",
      slug: "thread-writer",
      category: "writing",
      description: "Turns rough ideas into sharp X threads.",
      originType: "platform",
      skills: ["thread writing", "launch copy"],
      capabilityTags: [],
      expectedLatencyMsRange: { maxMs: 9000 },
    },
    performanceSummary: {
      paidTasksCompleted: 7,
      tasksAttempted: 9,
      paidEarnings: 42,
      approvalRate: 0.88,
      averageScore: 84,
      averageResponseTimeMs: 12000,
      rankPosition: 2,
      status: "active",
      totalReviews: 3,
    },
  });

  assert.equal(model.name, "Thread Writer");
  assert.equal(model.typeLabel, "Platform Agent");
  assert.equal(model.completedTasksDisplay, "7");
  assert.equal(model.approvalRateDisplay, "88%");
  assert.equal(model.totalEarnedDisplay, "42 USDC");
  assert.equal(model.averageScoreDisplay, "84");
  assert.equal(model.reviewsDisplay, "3");
  assert.ok(model.badges.includes("Platform Agent"));
  assert.deepEqual(model.suggestedTemplates.map((template) => template.id), ["write_x_thread", "rewrite_content"]);
});

test("agent display model uses honest fallbacks when metrics are missing", () => {
  const model = buildAgentDisplayModel({
    profile: {
      agentId: "agent_external",
      publicName: "New External Worker",
      slug: "new-external-worker",
      category: "research",
      description: "",
      originType: "external",
      skills: [],
      capabilityTags: [],
      connectionStatus: "pending",
      expectedLatencyMsRange: { maxMs: 0 },
    },
    performanceSummary: {
      status: "new",
    },
  });

  assert.equal(model.typeLabel, "External Agent");
  assert.equal(model.completedTasksDisplay, "0");
  assert.equal(model.approvalRateDisplay, "Not enough data yet");
  assert.equal(model.averageDeliveryDisplay, "Not enough data yet");
  assert.equal(model.totalEarnedDisplay, "0 USDC");
  assert.equal(model.reviewsDisplay, "No reviews yet");
  assert.equal(model.verificationLabel, "Needs review");
  assert.equal(model.verificationNextAction, "Add payout wallet");
  assert.match(model.trustNote, /Not enough completed work yet/);
});

test("platform agent readiness is honest when setup exists but paid history is thin", () => {
  const model = buildAgentVerificationModel({
    profile: {
      agentId: "thread_writer",
      publicName: "Thread Writer",
      description: "Turns rough ideas into X threads.",
      originType: "platform",
      skills: ["thread writing"],
    },
    performanceSummary: { status: "active" },
  }, {});

  assert.equal(model.stateLabel, "Limited data");
  assert.equal(model.nextAction, "Wait for first completed task");
  assert.equal(model.checklist.find((item) => item.id === "packages").state, "passed");
  assert.equal(model.checklist.find((item) => item.id === "paid_history").stateLabel, "Not enough data yet");
});

test("external agent with missing connection data asks for connection check", () => {
  const model = buildAgentTrustReadinessModel({
    profile: {
      agentId: "external_missing",
      publicName: "Endpoint Worker",
      description: "External task runner.",
      originType: "external",
      skills: ["research"],
      payoutWallet: "0x85DCC174dE5e785Cda3069154D097172F1B39aAA",
    },
    performanceSummary: {},
  }, {});

  assert.equal(model.label, "Connection check needed");
  assert.equal(model.nextAction, "Check endpoint health");
  assert.match(model.note, /Connection state is missing/);
});

test("verification checklist does not fake wallets or performance history", () => {
  const checklist = buildAgentVerificationChecklist({
    profile: {
      agentId: "external_new",
      publicName: "External New",
      description: "New external worker.",
      originType: "external",
      connectionStatus: "active",
      skills: ["research"],
    },
    performanceSummary: {},
  }, {});

  assert.equal(checklist.find((item) => item.id === "wallet").state, "missing");
  assert.equal(checklist.find((item) => item.id === "paid_history").state, "not_enough_data");
  assert.equal(checklist.find((item) => item.id === "review_history").state, "not_enough_data");
});

test("completed paid task history only passes from real paid task data", () => {
  const agent = {
    profile: {
      agentId: "agent_paid",
      publicName: "Paid Agent",
      description: "Completes funded work.",
      originType: "platform",
      skills: ["writing"],
    },
    performanceSummary: {},
  };

  const withoutTasks = buildAgentVerificationChecklist(agent, {});
  const withTasks = buildAgentVerificationChecklist(agent, {
    completedTasks: [
      { taskId: "paid", selectedAgentId: "agent_paid", status: "SETTLED", settlementState: "settled", rewardAmount: 10 },
    ],
  });

  assert.equal(withoutTasks.find((item) => item.id === "paid_history").state, "not_enough_data");
  assert.equal(withTasks.find((item) => item.id === "paid_history").state, "passed");
});

test("dispute history reflects only real disputed task data", () => {
  const agent = {
    profile: {
      agentId: "agent_dispute",
      publicName: "Dispute Agent",
      description: "Handles work.",
      originType: "platform",
      skills: ["writing"],
    },
    performanceSummary: {},
  };

  const clean = buildAgentVerificationChecklist(agent, {});
  const disputed = buildAgentVerificationChecklist(agent, {
    disputedTasks: [
      { taskId: "dispute", selectedAgentId: "agent_dispute", status: "DISPUTED", disputeRecords: [{ reason: "Quality" }] },
    ],
  });

  assert.equal(clean.find((item) => item.id === "disputes").description, "No dispute history found in available task data.");
  assert.match(disputed.find((item) => item.id === "disputes").description, /1 disputed task/);
});

test("service packages build for known agent specialties without fake traction", () => {
  const packages = buildAgentServicePackages({
    profile: {
      agentId: "thread_writer",
      publicName: "Thread Writer",
      slug: "thread-writer",
      category: "writing",
      skills: ["thread writing"],
      capabilityTags: [],
    },
    performanceSummary: {
      paidEarnings: 0,
      paidTasksCompleted: 0,
      totalReviews: 0,
    },
  });

  assert.equal(packages.length, 3);
  assert.deepEqual(packages.map((item) => item.tier), ["Basic", "Standard", "Pro"]);
  assert.deepEqual(packages.map((item) => item.priceUsdc), [10, 20, 35]);
  assert.equal(packages[0].templateId, "write_x_thread");
  assert.ok(!("sales" in packages[0]));
  assert.ok(!("reviews" in packages[0]));
  assert.ok(!("earnings" in packages[0]));
});

test("service package display exposes honest price delivery and output labels", () => {
  const servicePackage = buildAgentServicePackages({
    profile: {
      agentId: "summarizer",
      publicName: "Summarizer",
      slug: "summarizer",
      category: "summarization",
      skills: ["summarization"],
      capabilityTags: [],
    },
    performanceSummary: {},
  })[1];
  const model = buildServicePackageDisplayModel(servicePackage, {
    profile: { publicName: "Summarizer" },
  });

  assert.equal(model.tier, "Standard");
  assert.equal(model.priceDisplay, "18 USDC");
  assert.equal(model.agentName, "Summarizer");
  assert.equal(model.templateName, "Summarize Article");
  assert.match(model.expectedOutput, /summary/i);
});

test("service package task draft preselects agent and editable funded task fields", () => {
  const agent = {
    profile: {
      agentId: "research_brief",
      publicName: "Research Brief",
      slug: "research-brief",
      category: "research",
      skills: ["research"],
      capabilityTags: [],
    },
    performanceSummary: {},
  };
  const servicePackage = buildAgentServicePackages(agent)[2];
  const draft = buildTaskDraftFromServicePackage(servicePackage, agent);

  assert.equal(draft.hiringMode, "direct_hire");
  assert.equal(draft.selectedAgentId, "research_brief");
  assert.equal(draft.rewardAmount, "50");
  assert.equal(draft.templateId, "research_project");
  assert.match(draft.description, /Service Package: Pro - Research \+ comparison \+ risks/);
  assert.match(draft.description, /You still fund/i);
  assert.equal(draft.servicePackage.priceUsdc, 50);
});

test("unknown agents do not get fake service packages", () => {
  const packages = buildAgentServicePackages({
    profile: {
      agentId: "generic",
      publicName: "General Worker",
      slug: "general-worker",
      category: "operations",
      skills: [],
      capabilityTags: [],
    },
    performanceSummary: {},
  });

  assert.deepEqual(packages, []);
});

test("builder dashboard summary uses real agent performance data only", () => {
  const agents = [
    {
      profile: { agentId: "thread", publicName: "Thread Writer", slug: "thread-writer", originType: "platform", skills: ["thread writing"] },
      performanceSummary: { status: "active", paidTasksCompleted: 2, paidEarnings: 30, approvalRate: 0.8 },
    },
    {
      profile: { agentId: "external", publicName: "External Worker", slug: "external-worker", originType: "external", connectionStatus: "pending", skills: [] },
      performanceSummary: { status: "new" },
    },
  ];
  const summary = buildAgentBuilderSummaryModel(agents, {});

  assert.equal(summary.agentsListed, 2);
  assert.equal(summary.activeAgents, 1);
  assert.equal(summary.paidTasksCompleted, 2);
  assert.equal(summary.paidEarningsDisplay, "30 USDC");
  assert.equal(summary.ownershipNote, "Use wallet-linked tasks and agents for builder dashboard totals.");
});

test("Nano budget draft status does not imply funding or payment", () => {
  const model = buildNanoBudgetStatusModel({ status: "draft" });

  assert.equal(model.label, "Budget draft");
  assert.match(model.helper, /Record funding proof/);
});

test("Nano approved spend intent is labeled as not paid without a receipt", () => {
  const model = buildNanoSpendIntentStatusModel({ status: "approved" }, null);

  assert.equal(model.label, "Approved, not paid yet");
  assert.match(model.helper, /no payment proof/i);
});

test("Nano budget presets and custom amount validation stay inside guided limits", () => {
  assert.deepEqual(nanoBudgetPresets, ["0.10", "0.25", "0.50", "1.00"]);
  ["0.10", "0.25", "0.50", "1.00", "5.00", "1"].forEach((value) => {
    assert.equal(validateNanoBudgetAmount(value).valid, true, `${value} should pass`);
  });
  [
    ["", "Enter a budget amount."],
    ["0", "Minimum Nano budget is 0.10 USDC."],
    ["-1", "Use a valid USDC amount."],
    ["abc", "Use a valid USDC amount."],
    ["5.01", "Maximum Nano budget is 5.00 USDC for this flow."],
    ["1.999", "Use up to 2 decimal places."],
  ].forEach(([value, message]) => {
    const result = validateNanoBudgetAmount(value);
    assert.equal(result.valid, false, `${value} should reject`);
    assert.equal(result.message, message);
  });
});

test("Nano recipient wallet model requires a valid EVM address", () => {
  const missing = buildNanoRecipientWalletModel("");
  const invalid = buildNanoRecipientWalletModel("0x1234");
  const valid = buildNanoRecipientWalletModel("0x1111111111111111111111111111111111111111");

  assert.equal(missing.valid, false);
  assert.match(missing.helper, /Add a recipient wallet/);
  assert.equal(invalid.valid, false);
  assert.match(invalid.helper, /valid 0x recipient wallet/);
  assert.equal(valid.valid, true);
  assert.equal(valid.helper, "Recipient wallet ready.");
  assert.equal(valid.label, "0x1111...1111");
});

test("Nano current step changes across wallet budget spend and proof states", () => {
  assert.equal(buildNanoCurrentStepModel({ walletConnected: false }).currentStep, "Choose budget");
  assert.equal(buildNanoCurrentStepModel({ walletConnected: true, budgetAmountValid: true }).currentStep, "Create budget");
  assert.equal(buildNanoCurrentStepModel({ walletConnected: true, hasBudget: true }).currentStep, "Review spend plan");
  assert.equal(buildNanoCurrentStepModel({ walletConnected: true, hasBudget: true, hasSpendPlan: true }).currentStep, "Approve spend");
  assert.equal(buildNanoCurrentStepModel({ walletConnected: true, hasBudget: true, hasSpendPlan: true, hasApprovedSpend: true }).currentStep, "Pay on Arc");
  assert.equal(buildNanoCurrentStepModel({ walletConnected: true, hasProofPending: true }).currentStep, "Verify proof");
  assert.equal(buildNanoCurrentStepModel({ walletConnected: true, hasVerifiedReceipt: true }).currentStep, "View receipts");
});

test("Nano start new budget resets draft state without disconnecting wallet", () => {
  const current = {
    budgets: [{ budgetId: "budget_1" }],
    budgetsLoaded: true,
    selectedBudgetId: "budget_1",
    activity: { receipts: [] },
    runActivities: { budget_1: { receipts: [] } },
    budgetGoal: "Keep this goal",
    budgetAmount: "1.00",
    budgetPreset: "1.00",
    customBudgetAmount: "3",
    sourcePayoutWallet: "0x1111111111111111111111111111111111111111",
    selectedNanoAgentId: "platform_research_brief",
    arcProofTxHash: `0x${"a".repeat(64)}`,
    actionPending: "arcProof",
  };
  const reset = buildNanoResetDraftState(current);

  assert.equal(reset.selectedBudgetId, "");
  assert.equal(reset.activity, null);
  assert.equal(reset.newBudgetDraft, true);
  assert.equal(reset.budgetAmount, "0.10");
  assert.equal(reset.budgetPreset, "0.10");
  assert.equal(reset.customBudgetAmount, "");
  assert.equal(reset.arcProofTxHash, "");
  assert.equal(reset.actionPending, "");
  assert.equal(reset.sourcePayoutWallet, "0x1111111111111111111111111111111111111111");
  assert.equal(reset.budgetGoal, "Keep this goal");
  assert.equal(reset.selectedNanoAgentId, "platform_research_brief");

  const preserved = buildNanoResetDraftState(current, { preserveHistory: true });
  assert.deepEqual(preserved.budgets, current.budgets);
  assert.equal(preserved.budgetsLoaded, true);
  assert.deepEqual(preserved.runActivities, current.runActivities);
  assert.equal(preserved.selectedBudgetId, "");
  assert.equal(preserved.activity, null);
  assert.equal(preserved.newBudgetDraft, true);

  const consoleAfterReset = buildNanoRunConsoleModel({
    walletConnected: true,
    budget: preserved.selectedBudgetId ? preserved.budgets[0] : null,
  });
  assert.equal(consoleAfterReset.activeStepKey, "goal");
  assert.equal(consoleAfterReset.activePanel.primaryActionLabel, "Create Nano budget");
  assert.doesNotMatch(JSON.stringify(consoleAfterReset), /Paid with proof|Result unlocked|Source unlocked/);
});

test("Nano Dispatch agent selector exposes only real built-in agents without fake metrics", () => {
  const selector = buildNanoAgentSelectorModel();

  assert.equal(nanoDispatchAgentOptions.length, 5);
  assert.deepEqual(nanoDispatchAgentOptions.map((agent) => agent.name), [
    "Thread Writer",
    "Summarizer",
    "Rewriter",
    "Research Brief",
    "Content Repurposer",
  ]);
  assert.deepEqual(selector.agents.map((agent) => agent.id), [
    "platform_thread_writer",
    "platform_summarizer",
    "platform_rewriter",
    "platform_research_brief",
    "platform_content_repurposer",
  ]);
  assert.equal(selector.selectedAgent, null);
  assert.equal(selector.required, true);
  assert.equal(selector.title, "Choose source agent");
  assert.equal(selector.helper, "Pick the Dispatch agent that will decide which source is worth unlocking for this run.");
  assert.equal(selector.emptyStateCopy, "Choose a source agent before creating a Nano budget.");
  assert.equal(selector.noFakeMetrics, true);
  selector.agents.forEach((agent) => {
    assert.equal(agent.statusLabel, "Dispatch agent");
    assert.equal(agent.isSelected, false);
    assert.equal(agent.ariaLabel, `Select ${agent.name} for this Nano run`);
    assert.equal(Object.hasOwn(agent, "rating"), false);
    assert.equal(Object.hasOwn(agent, "earnings"), false);
    assert.equal(Object.hasOwn(agent, "completedJobs"), false);
    assert.equal(Object.hasOwn(agent, "availability"), false);
  });
});

test("Nano selected built-in agent stays in Goal state before budget and names source/result copy safely", () => {
  const selector = buildNanoAgentSelectorModel({ selectedAgentId: "platform_research_brief" });
  const consoleModel = buildNanoRunConsoleModel({ walletConnected: true, budget: null });
  const decision = buildNanoAgentDecisionPresentation({
    hasBudget: true,
    selectedAgentName: selector.selectedAgentName,
    intent: { status: "proposed" },
  });
  const lockedResult = buildNanoResultContributionModel({
    goal: "Brief",
    budget: { amount: 0.1 },
    sourceIntent: { status: "approved" },
    sourceReceipt: null,
  });

  assert.equal(selector.selectedAgent?.name, "Research Brief");
  assert.equal(selector.selectedAgent?.statusLabel, "Selected source agent");
  assert.equal(selector.selectedStateCopy, "Research Brief will request source unlocks when this run needs paid context.");
  assert.equal(consoleModel.activeStepKey, "goal");
  assert.equal(consoleModel.activePanel.primaryActionLabel, "Create Nano budget");
  assert.match(decision.copy, /Research Brief requested a starter source unlock/);
  assert.match(decision.helper, /Research Brief requested this source spend/);
  assert.equal(lockedResult.unlocked, false);
  assert.equal(lockedResult.proofStatusLabel, "Approved, not paid yet");
  assert.doesNotMatch(`${decision.copy} ${decision.helper} ${lockedResult.finalOutput}`, /Paid with proof|Result unlocked|Source unlocked/);
});

test("Nano agent selection FAQ avoids payout and fake proof claims", () => {
  assert.equal(nanoAgentSelectionFaq.question, "What does the selected agent do?");
  assert.match(nanoAgentSelectionFaq.answer, /decides whether a source is worth unlocking/);
  assert.match(nanoAgentSelectionFaq.answer, /You still approve the spend, pay on Arc/);
  assert.match(nanoAgentSelectionFaq.answer, /Nano unlocks the result only after proof verifies/);
  assert.doesNotMatch(nanoAgentSelectionFaq.answer, /payout|earnings|paid agent|Gateway|x402|Circle Wallets|nanopayments/i);
});

test("Nano spend plan labels distinguish starter from active state", () => {
  const starter = buildNanoSpendPlanPresentation({ hasBudget: false });
  const active = buildNanoSpendPlanPresentation({ hasBudget: true });

  assert.equal(starter.label, "Starter spend plan");
  assert.match(starter.helper, /Create a budget to activate/);
  assert.match(starter.recipientHelper, /needed later/);
  assert.equal(active.label, "Active spend plan");
  assert.match(active.helper, /Review and approve/);
  assert.match(active.recipientHelper, /approved source\/tool payout/);
});

test("Nano source payment plan keeps source unlock primary with safe 2-decimal amounts", () => {
  const [source, ...helpers] = nanoSourcePaymentSpendPlanRows;

  assert.equal(source.payeeId, "source_unlock");
  assert.equal(source.primary, true);
  assert.equal(source.amount, 0.01);
  assert.equal(nanoSourcePaymentSpendPlanRows.length, 3);
  assert.equal(validateNanoBudgetAmount("0.005").valid, false);
  assert.equal(validateNanoBudgetAmount("0.005").message, "Use up to 2 decimal places.");
  helpers.forEach((helper) => {
    assert.equal(helper.starterOnly, true);
    assert.equal(helper.type, "tool");
    assert.ok(["0.01", "0.02"].includes(helper.amount.toFixed(2)));
  });
});

test("Nano recipient registry returns expected source and tool profiles", () => {
  const registry = buildNanoRecipientRegistry({ sourceWallet: "0x2222222222222222222222222222222222222222" });
  const source = buildNanoRecipientProfile("source_unlock", { registry });
  const formatter = buildNanoRecipientProfile("summary_formatter", { registry });
  const checker = buildNanoRecipientProfile("claim_check_tool", { registry });

  assert.equal(nanoRecipientRegistryProfiles.length, 3);
  assert.equal(source.label, "Dispatch Source Unlock");
  assert.equal(source.type, "source");
  assert.equal(source.paymentStatus, "payable_now");
  assert.equal(source.walletAddress, "0x2222222222222222222222222222222222222222");
  assert.match(source.proofRequirement, /Requires verified proof/);
  assert.equal(formatter.type, "tool");
  assert.equal(formatter.paymentStatus, "planned_next");
  assert.equal(formatter.walletAddress, "");
  assert.match(formatter.proofRequirement, /future spend path/);
  assert.equal(checker.defaultPrice, 0.02);
  assert.doesNotMatch(`${source.description} ${formatter.description} ${checker.description}`, /earned|paid recipient|judge/i);
});

test("Nano planned tool profiles do not expose live pay actions", () => {
  const registry = buildNanoRecipientRegistry();
  const rows = buildNanoMultiSpendPlanRows({
    recipientRegistry: registry,
    intents: [
      {
        intentId: "intent_tool",
        status: "approved",
        amount: 0.02,
        reason: "Checks the strongest claims.",
        payee: {
          payeeId: "claim_check_tool",
          type: "tool",
          label: "Claim-check Tool",
          walletAddress: "0x3333333333333333333333333333333333333333",
        },
      },
    ],
    receiptsByIntent: new Map(),
  });
  const tool = rows.rows.find((row) => row.payeeId === "claim_check_tool");

  assert.equal(tool.recipientPaymentStatus, "planned_next");
  assert.equal(tool.canPayOnArc, false);
  assert.equal(tool.payActionLabel, "Planned next");
  assert.match(tool.proofRequirement, /not paid in the current live flow/);
});

test("Nano multi-spend plan returns multiple rows with only source payable on Arc", () => {
  const rows = buildNanoMultiSpendPlanRows({
    recipientRegistry: buildNanoRecipientRegistry({ sourceWallet: "0x2222222222222222222222222222222222222222" }),
    intents: [
      {
        intentId: "intent_source",
        status: "approved",
        amount: 0.01,
        reason: "Adds source-backed context.",
        payee: {
          payeeId: "source_unlock",
          type: "source",
          label: "Source unlock",
          walletAddress: "0x2222222222222222222222222222222222222222",
        },
      },
      {
        intentId: "intent_tool",
        status: "approved",
        amount: 0.02,
        reason: "Checks the strongest claims.",
        payee: {
          payeeId: "claim_check_tool",
          type: "tool",
          label: "Claim-check tool",
          walletAddress: "0x3333333333333333333333333333333333333333",
        },
      },
    ],
    receiptsByIntent: new Map(),
  });

  assert.equal(rows.rows.length, 3);
  assert.equal(rows.rows[0].label, "Source unlock");
  assert.equal(rows.rows[0].canPayOnArc, true);
  assert.equal(rows.rows[0].payActionLabel, "Pay source on Arc");
  assert.equal(rows.rows[0].recipientAvailability, "Payable on Arc");
  assert.match(rows.rows[0].proofRequirement, /source-backed result unlocks/);
  assert.equal(rows.rows[1].canPayOnArc, false);
  assert.equal(rows.rows[1].payActionLabel, "Planned next");
  assert.equal(rows.rows[1].proofLabel, "Not paid yet");
  assert.match(rows.rows[1].recipientDescription, /summary/);
  assert.equal(rows.payableRows.length, 1);
  assert.match(rows.helper, /Only the source unlock can be paid/);
});

test("Nano multi-spend planned rows do not show paid without verified proof", () => {
  const localReceipt = {
    receiptId: "receipt_local",
    intentId: "intent_tool",
    paymentState: "recorded",
    proof: { proofType: "local", paymentState: "recorded", txHash: null },
  };
  const rejectedReceipt = {
    receiptId: "receipt_rejected",
    intentId: "intent_rejected",
    paymentState: "failed",
    proof: { proofType: "arc_tx", paymentState: "failed", txHash: `0x${"b".repeat(64)}` },
  };
  const rows = buildNanoMultiSpendPlanRows({
    intents: [
      {
        intentId: "intent_tool",
        status: "payment_recorded",
        amount: 0.02,
        reason: "Checks the strongest claims.",
        payee: { payeeId: "claim_check_tool", type: "tool", label: "Claim-check tool", walletAddress: null },
      },
      {
        intentId: "intent_rejected",
        status: "failed",
        amount: 0.01,
        reason: "Formats the summary.",
        payee: { payeeId: "summary_formatter", type: "tool", label: "Summary formatter", walletAddress: null },
      },
    ],
    receiptsByIntent: new Map([
      ["intent_tool", localReceipt],
      ["intent_rejected", rejectedReceipt],
    ]),
  });

  assert.equal(rows.rows.find((row) => row.payeeId === "claim_check_tool").proofLabel, "Local receipt");
  assert.equal(rows.rows.find((row) => row.payeeId === "claim_check_tool").verified, false);
  assert.equal(rows.rows.find((row) => row.payeeId === "summary_formatter").proofLabel, "Proof rejected");
  assert.equal(rows.rows.find((row) => row.payeeId === "summary_formatter").verified, false);
  assert.equal(rows.verifiedRows.length, 0);
});

test("Nano multi-spend rows show paid with proof and tx links only for verified Arc receipts", () => {
  const txHash = `0x${"c".repeat(64)}`;
  const rows = buildNanoMultiSpendPlanRows({
    intents: [
      {
        intentId: "intent_source",
        status: "payment_recorded",
        amount: 0.01,
        reason: "Adds source-backed context.",
        payee: { payeeId: "source_unlock", type: "source", label: "Source unlock", walletAddress: "0x2222222222222222222222222222222222222222" },
      },
      {
        intentId: "intent_tool",
        status: "payment_recorded",
        amount: 0.02,
        reason: "Checks claims.",
        payee: { payeeId: "claim_check_tool", type: "tool", label: "Claim-check tool", walletAddress: null },
      },
    ],
    receiptsByIntent: new Map([
      ["intent_source", {
        receiptId: "receipt_source",
        intentId: "intent_source",
        paymentState: "recorded",
        contributionSummary: "Unlocked source context for the final brief.",
        proof: { proofType: "arc_tx", paymentState: "recorded", txHash },
      }],
      ["intent_tool", {
        receiptId: "receipt_tool",
        intentId: "intent_tool",
        paymentState: "recorded",
        contributionSummary: "Invalid hash should not unlock.",
        proof: { proofType: "arc_tx", paymentState: "recorded", txHash: "0x123" },
      }],
    ]),
  });

  const source = rows.rows.find((row) => row.payeeId === "source_unlock");
  const tool = rows.rows.find((row) => row.payeeId === "claim_check_tool");
  assert.equal(source.proofLabel, "Paid with proof");
  assert.equal(source.verified, true);
  assert.match(source.txLink, /testnet\.arcscan\.app/);
  assert.equal(tool.proofLabel, "Proof pending");
  assert.equal(tool.verified, false);
  assert.equal(tool.txLink, null);
  assert.equal(rows.verifiedRows.length, 1);
});

test("Nano result preview references only verified unlocked contributions", () => {
  const preview = buildNanoResultPreviewPresentation({
    goal: "Brief",
    hasVerifiedSourceProof: true,
    sourceUnlock: { canShowInResult: true, starterOrLiveLabel: "Live source insight", unlockedInsight: "Verified source insight." },
    verifiedContributions: [
      { verified: true, contributionSummary: "Source contribution included." },
      { verified: true, contributionSummary: "Claim-check contribution included." },
      { verified: false, contributionSummary: "Unverified contribution must not appear." },
    ],
  });

  assert.match(preview.body, /Source contribution included/);
  assert.match(preview.body, /Claim-check contribution included/);
  assert.doesNotMatch(preview.body, /Unverified contribution/);

  const locked = buildNanoResultPreviewPresentation({
    goal: "Brief",
    hasVerifiedSourceProof: false,
    sourceUnlock: { canShowInResult: false },
    verifiedContributions: [{ verified: true, contributionSummary: "Should stay hidden without source proof." }],
  });
  assert.equal(locked.body, "The result preview is waiting for source proof.");
});

test("Nano result contribution stays locked before budget and before proof", () => {
  const notStarted = buildNanoResultContributionModel({
    goal: "Brief",
    budget: null,
  });
  assert.equal(notStarted.locked, true);
  assert.equal(notStarted.proofStatus, "not_started");
  assert.equal(notStarted.proofStatusLabel, "Run not started");
  assert.equal(notStarted.sourceContributionSummary, "Locked until verified Arc proof.");
  assert.match(notStarted.helper, /Create a Nano budget/);

  const starter = buildNanoResultContributionModel({
    goal: "Brief",
    budget: { amount: 0.1 },
    sourceRow: { label: "Dispatch Source Unlock", typeLabel: "Source", contributionSummary: "Starter contribution.", verified: false },
  });
  assert.equal(starter.locked, true);
  assert.equal(starter.proofStatus, "starter");
  assert.equal(starter.proofStatusLabel, "Not paid yet");
  assert.match(starter.finalOutput, /starter brief preview/i);
});

test("Nano result contribution approved local rejected and pending proof do not unlock", () => {
  const approved = buildNanoResultContributionModel({
    budget: { amount: 0.1 },
    sourceIntent: { status: "approved" },
  });
  assert.equal(approved.locked, true);
  assert.equal(approved.proofStatusLabel, "Approved, not paid yet");
  assert.match(approved.warning, /Approval is not payment/);

  const local = buildNanoResultContributionModel({
    budget: { amount: 0.1 },
    sourceReceipt: { proof: { proofType: "local", paymentState: "recorded" }, paymentState: "recorded" },
  });
  assert.equal(local.locked, true);
  assert.equal(local.proofStatusLabel, "Local receipt");
  assert.match(local.warning, /not a verified payment/);

  const rejected = buildNanoResultContributionModel({
    budget: { amount: 0.1 },
    sourceReceipt: { proof: { proofType: "arc_tx", paymentState: "failed", txHash: `0x${"a".repeat(64)}` }, paymentState: "failed" },
  });
  assert.equal(rejected.locked, true);
  assert.equal(rejected.proofStatusLabel, "Proof rejected");

  const pending = buildNanoResultContributionModel({
    budget: { amount: 0.1 },
    sourceReceipt: { proof: { proofType: "arc_tx", paymentState: "recorded", txHash: "0x123" }, paymentState: "recorded" },
  });
  assert.equal(pending.locked, true);
  assert.equal(pending.proofStatusLabel, "Proof pending");
  assert.equal(pending.txLink, null);
});

test("Nano result contribution unlocks only with verified Arc proof and valid tx link", () => {
  const txHash = `0x${"f".repeat(64)}`;
  const sourceReceipt = {
    receiptId: "receipt_source_verified",
    contributionSummary: "Verified source showed why tiny USDC source payments matter.",
    paymentState: "recorded",
    proof: { proofType: "arc_tx", paymentState: "recorded", txHash },
  };
  const sourceRow = {
    label: "Dispatch Source Unlock",
    typeLabel: "Source",
    verified: true,
    contributionSummary: sourceReceipt.contributionSummary,
    txLink: `https://testnet.arcscan.app/tx/${txHash}`,
  };
  const model = buildNanoResultContributionModel({
    goal: "Create a brief",
    budget: { amount: 0.1 },
    sourceRow,
    sourceReceipt,
    verifiedContributions: [sourceRow],
  });

  assert.equal(model.unlocked, true);
  assert.equal(model.locked, false);
  assert.equal(model.proofStatusLabel, "Paid with proof");
  assert.equal(model.sourceUsedLabel, "Dispatch Source Unlock");
  assert.equal(model.sourceType, "Source");
  assert.match(model.sourceContributionSummary, /tiny USDC source payments/);
  assert.match(model.finalOutput, /verified contribution/);
  assert.match(model.receiptReference, /Receipt/);
  assert.match(model.txLink, /testnet\.arcscan\.app/);
});

test("Nano result contribution does not claim real external source access or planned tool unlocks", () => {
  const gateway = buildNanoReceiptStatusModel({
    proof: { proofType: "circle_gateway", paymentState: "recorded" },
  });
  const x402 = buildNanoReceiptStatusModel({
    proof: { proofType: "x402", paymentState: "recorded" },
  });
  const plannedTool = buildNanoResultContributionModel({
    budget: { amount: 0.1 },
    sourceRow: {
      label: "Claim-check Tool",
      typeLabel: "Tool",
      verified: false,
      plannedOnly: true,
      contributionSummary: "Planned tool contribution.",
    },
  });

  assert.equal(plannedTool.locked, true);
  assert.doesNotMatch(`${plannedTool.helper} ${plannedTool.finalOutput} ${plannedTool.sourceContributionSummary}`, /external source accessed|tool executed|paid source result/i);
  assert.doesNotMatch(`${plannedTool.helper} ${plannedTool.warning}`, /judge/i);
  assert.match(gateway.helper, /planned next/);
  assert.match(x402.helper, /planned next/);
});

test("Nano Dispatch task handoff empty state does not invent task context", () => {
  const model = buildNanoDispatchTaskHandoffModel();

  assert.equal(model.available, false);
  assert.equal(model.handoffMode, "unavailable");
  assert.equal(model.backendAttached, false);
  assert.equal(model.fakeTaskCreated, false);
  assert.equal(model.copyText, "");
  assert.doesNotMatch(`${model.helper} ${model.sourceContributionSummary}`, /funded task|review|release|earnings|attached to backend/i);
});

test("Nano Dispatch task handoff keeps unverified context as local draft preview", () => {
  const approved = buildNanoResultContributionModel({
    goal: "Create a source-backed stablecoin brief",
    budget: { budgetId: "nano_budget_1", amount: 0.1 },
    sourceIntent: { status: "approved" },
  });
  const model = buildNanoDispatchTaskHandoffModel({
    goal: "Create a source-backed stablecoin brief",
    budget: { budgetId: "nano_budget_1", amount: 0.1 },
    nanoRunId: "nano_budget_1",
    receiptUrl: "https://dispatch.example/nano?receipt=nano_budget_1",
    resultContribution: approved,
  });

  assert.equal(model.available, true);
  assert.equal(model.handoffMode, "local_preview");
  assert.equal(model.taskContextStatus, "Draft task context");
  assert.equal(model.sourceContributionState, "starter_or_draft");
  assert.equal(model.proofStatusLabel, "Approved, not paid yet");
  assert.equal(model.txLink, null);
  assert.match(model.nanoGoal, /stablecoin brief/);
  assert.match(model.taskBrief, /Proof status: Approved, not paid yet/);
  assert.match(model.taskBrief, /Receipt: https:\/\/dispatch\.example\/nano\?receipt=nano_budget_1/);
  assert.match(model.warnings.join(" "), /Local preview only/);
  assert.match(model.warnings.join(" "), /verified Arc proof/);
  assert.doesNotMatch(`${model.helper} ${model.copyText}`, /backend|task funded|payment released|agent earnings/i);
});

test("Nano Dispatch task handoff rejects local pending and failed proof as verified context", () => {
  const cases = [
    buildNanoResultContributionModel({
      budget: { amount: 0.1 },
      sourceReceipt: { proof: { proofType: "local", paymentState: "recorded" }, paymentState: "recorded" },
    }),
    buildNanoResultContributionModel({
      budget: { amount: 0.1 },
      sourceReceipt: { proof: { proofType: "arc_tx", paymentState: "recorded", txHash: "0x123" }, paymentState: "recorded" },
    }),
    buildNanoResultContributionModel({
      budget: { amount: 0.1 },
      sourceReceipt: { proof: { proofType: "arc_tx", paymentState: "failed", txHash: `0x${"b".repeat(64)}` }, paymentState: "failed" },
    }),
  ];

  for (const resultContribution of cases) {
    const model = buildNanoDispatchTaskHandoffModel({
      budget: { budgetId: "nano_budget_case", amount: 0.1 },
      resultContribution,
    });
    assert.equal(model.taskContextStatus, "Draft task context");
    assert.equal(model.sourceContributionState, "starter_or_draft");
    assert.equal(model.txLink, null);
    assert.doesNotMatch(model.helper, /verified source-payment receipt/);
  }
});

test("Nano Dispatch task handoff marks verified Arc proof as source-backed context", () => {
  const txHash = `0x${"d".repeat(64)}`;
  const resultContribution = buildNanoResultContributionModel({
    goal: "Create a brief about source payments",
    budget: { budgetId: "nano_budget_verified", amount: 0.1 },
    sourceRow: {
      label: "Dispatch Source Unlock",
      typeLabel: "Source",
      verified: true,
      contributionSummary: "Verified source contribution improved the final brief.",
      txLink: `https://testnet.arcscan.app/tx/${txHash}`,
    },
    sourceReceipt: {
      receiptId: "receipt_verified",
      contributionSummary: "Verified source contribution improved the final brief.",
      paymentState: "recorded",
      proof: { proofType: "arc_tx", paymentState: "recorded", txHash },
    },
  });
  const model = buildNanoDispatchTaskHandoffModel({
    goal: "Create a brief about source payments",
    budget: { budgetId: "nano_budget_verified", amount: 0.1 },
    nanoRunId: "nano_budget_verified",
    receiptUrl: "https://dispatch.example/nano?receipt=nano_budget_verified",
    resultContribution,
  });

  assert.equal(model.taskContextStatus, "Verified source-backed context");
  assert.equal(model.sourceContributionState, "verified_source_backed");
  assert.equal(model.proofStatusLabel, "Paid with proof");
  assert.match(model.txLink, /testnet\.arcscan\.app/);
  assert.match(model.helper, /verified source-payment receipt/);
  assert.match(model.taskBrief, /Verified source contribution improved the final brief/);
  assert.match(model.copyText, /Verified Arc transaction/);
  assert.equal(model.backendAttached, false);
  assert.equal(model.fakeTaskCreated, false);
});

test("Nano Dispatch task handoff brief is deterministic and avoids public judge wording", () => {
  const input = {
    goal: "Create a stablecoin payment brief",
    budget: { budgetId: "nano_budget_same", amount: 0.1 },
    nanoRunId: "nano_budget_same",
    receiptUrl: "https://dispatch.example/nano?receipt=nano_budget_same",
    resultContribution: buildNanoResultContributionModel({
      goal: "Create a stablecoin payment brief",
      budget: { amount: 0.1 },
      sourceRow: { label: "Dispatch Source Unlock", typeLabel: "Source", verified: false },
    }),
  };
  const first = buildNanoDispatchTaskHandoffModel(input);
  const second = buildNanoDispatchTaskHandoffModel(input);

  assert.equal(first.taskTitle, "Source-backed stablecoin brief");
  assert.equal(first.taskBrief, second.taskBrief);
  assert.equal(first.copyText, second.copyText);
  assert.doesNotMatch(`${first.taskBrief} ${first.copyText} ${first.helper}`, /judge/i);
  assert.doesNotMatch(`${first.taskBrief} ${first.copyText}`, /fake|funded task created|backend-attached|backend/i);
});

test("Nano receipt proof view handles wallet required and unavailable states without inventing data", () => {
  const walletRequired = buildNanoReceiptProofViewModel({
    budgetId: "nano_budget_1",
    walletConnected: false,
  });
  assert.equal(walletRequired.available, false);
  assert.equal(walletRequired.state, "wallet_required");
  assert.deepEqual(walletRequired.rows, []);
  assert.match(walletRequired.helper, /wallet-scoped/);

  const unavailable = buildNanoReceiptProofViewModel({
    budgetId: "nano_budget_missing",
    walletConnected: true,
  });
  assert.equal(unavailable.available, false);
  assert.equal(unavailable.state, "unavailable");
  assert.match(unavailable.title, /unavailable/i);
  assert.deepEqual(unavailable.rows, []);
});

test("Nano receipt proof view builds safe share URL and exposes only selected run data", () => {
  const url = buildNanoReceiptShareUrl({
    budgetId: "nano_budget_abc 123",
    origin: "https://dispatch.example",
    apiBase: "https://dispatch-router.onrender.com",
  });
  assert.equal(url, "https://dispatch.example/nano?receipt=nano_budget_abc+123&apiBase=https%3A%2F%2Fdispatch-router.onrender.com");

  const model = buildNanoReceiptProofViewModel({
    walletConnected: true,
    shareUrl: url,
    activity: {
      budget: {
        budgetId: "nano_budget_abcdefghijklmnopqrstuvwxyz",
        ownerWallet: "0x1111111111111111111111111111111111111111",
        goal: "Create a stablecoin brief",
        amount: 0.1,
      },
      spendIntents: [],
      receipts: [],
    },
  });
  assert.equal(model.available, true);
  assert.equal(model.shortBudgetId, "nano_b...wxyz");
  assert.equal(model.ownerWallet, "0x1111...1111");
  assert.equal(model.goal, "Create a stablecoin brief");
  assert.equal(model.budgetAmount, "0.10 USDC");
  assert.equal(model.noUnrelatedHistory, true);
  assert.equal(model.shareUrl, url);
});

test("Nano receipt proof view separates approved from paid and blocks unverified proof", () => {
  const local = buildNanoReceiptProofViewModel({
    walletConnected: true,
    activity: {
      budget: { budgetId: "nano_budget_local", goal: "Brief", amount: 0.1 },
      spendIntents: [
        {
          intentId: "intent_source",
          status: "approved",
          amount: 0.01,
          reason: "Adds context.",
          payee: { payeeId: "source_unlock", type: "source", label: "Source unlock", walletAddress: "0x2222222222222222222222222222222222222222" },
        },
      ],
      receipts: [
        {
          receiptId: "receipt_local",
          intentId: "intent_source",
          amount: 0.01,
          paymentState: "recorded",
          proof: { proofType: "local", paymentState: "recorded", txHash: null },
        },
      ],
    },
  });
  assert.equal(local.approvedAmount, "0.01 USDC");
  assert.equal(local.verifiedPaidAmount, "0 USDC");
  assert.equal(local.rows[0].status, "Local receipt");
  assert.equal(local.rows[0].txLink, null);
  assert.equal(local.result.locked, true);
  assert.match(local.result.warning, /not a verified payment/);

  const rejected = buildNanoReceiptProofViewModel({
    walletConnected: true,
    activity: {
      budget: { budgetId: "nano_budget_rejected", goal: "Brief", amount: 0.1 },
      spendIntents: [
        { intentId: "intent_source", status: "payment_recorded", amount: 0.01, reason: "Adds context.", payee: { payeeId: "source_unlock", type: "source", label: "Source unlock" } },
      ],
      receipts: [
        { receiptId: "receipt_rejected", intentId: "intent_source", amount: 0.01, paymentState: "failed", proof: { proofType: "arc_tx", paymentState: "failed", txHash: `0x${"b".repeat(64)}` } },
      ],
    },
  });
  assert.equal(rejected.verifiedPaidAmount, "0 USDC");
  assert.equal(rejected.rows[0].status, "Proof rejected");
  assert.equal(rejected.result.locked, true);
});

test("Nano receipt proof view unlocks with verified Arc proof and valid tx only", () => {
  const txHash = `0x${"c".repeat(64)}`;
  const model = buildNanoReceiptProofViewModel({
    walletConnected: true,
    activity: {
      budget: { budgetId: "nano_budget_verified", goal: "Brief", amount: 0.1 },
      runContext: { goal: "Brief" },
      spendIntents: [
        {
          intentId: "intent_source",
          status: "payment_recorded",
          amount: 0.01,
          reason: "Adds source-backed context.",
          payee: { payeeId: "source_unlock", type: "source", label: "Source unlock", walletAddress: "0x2222222222222222222222222222222222222222" },
        },
        {
          intentId: "intent_tool",
          status: "approved",
          amount: 0.02,
          reason: "Checks claims.",
          payee: { payeeId: "claim_check_tool", type: "tool", label: "Claim-check Tool", walletAddress: null },
        },
      ],
      receipts: [
        {
          receiptId: "receipt_verified",
          intentId: "intent_source",
          amount: 0.01,
          contributionSummary: "Verified source contribution improved the final output.",
          paymentState: "recorded",
          proof: { proofType: "arc_tx", paymentState: "recorded", txHash },
        },
      ],
    },
  });

  assert.equal(model.verifiedPaidAmount, "0.01 USDC");
  assert.equal(model.rows[0].status, "Paid with proof");
  assert.match(model.rows[0].txLink, /testnet\.arcscan\.app/);
  assert.equal(model.rows[1].plannedOnly, true);
  assert.equal(model.rows[1].txLink, null);
  assert.equal(model.result.unlocked, true);
  assert.match(model.result.finalOutput, /verified contribution/);
  assert.match(model.helper, /Nano verified the Arc payment/);
});

test("Nano budget guardrails calculate active budget totals without implying escrow", () => {
  const rows = buildNanoMultiSpendPlanRows({
    intents: [
      {
        intentId: "intent_source",
        status: "approved",
        amount: 0.01,
        reason: "Adds source-backed context.",
        payee: { payeeId: "source_unlock", type: "source", label: "Source unlock", walletAddress: "0x2222222222222222222222222222222222222222" },
      },
    ],
    receiptsByIntent: new Map(),
  });
  const guardrails = buildNanoBudgetGuardrailModel({
    budget: { amount: 0.1 },
    spendRows: rows.rows,
  });

  assert.equal(guardrails.totalBudgetUsdc, 0.1);
  assert.equal(guardrails.payableNowUsdc, 0.01);
  assert.equal(guardrails.plannedSpendUsdc, 0.03);
  assert.equal(guardrails.approvedUsdc, 0.01);
  assert.equal(guardrails.verifiedPaidUsdc, 0);
  assert.equal(guardrails.remainingBudgetUsdc, 0.1);
  assert.equal(guardrails.remainingAfterPayableUsdc, 0.09);
  assert.equal(guardrails.canPayPayableNow, true);
  assert.match(guardrails.warnings.join(" "), /Approved, not paid yet/);
  assert.doesNotMatch(guardrails.helper, /refund/i);
  assert.match(guardrails.helper, /not escrow/i);
});

test("Nano budget guardrails count planned starter rows as planned, not paid", () => {
  const rows = buildNanoMultiSpendPlanRows({
    intents: [],
    receiptsByIntent: new Map(),
  });
  const guardrails = buildNanoBudgetGuardrailModel({
    budget: { amount: 0.1 },
    spendRows: rows.rows,
  });

  assert.equal(guardrails.payableNowUsdc, 0);
  assert.equal(guardrails.plannedSpendUsdc, 0.03);
  assert.equal(guardrails.verifiedPaidUsdc, 0);
  assert.equal(guardrails.remainingBudgetUsdc, 0.1);
  assert.match(guardrails.warnings.join(" "), /Planned rows are not live paid flows yet/);
});

test("Nano budget guardrails do not count local or rejected receipts as verified paid", () => {
  const rows = buildNanoMultiSpendPlanRows({
    intents: [
      {
        intentId: "intent_source",
        status: "payment_recorded",
        amount: 0.01,
        reason: "Adds source-backed context.",
        payee: { payeeId: "source_unlock", type: "source", label: "Source unlock", walletAddress: "0x2222222222222222222222222222222222222222" },
      },
      {
        intentId: "intent_tool",
        status: "payment_recorded",
        amount: 0.02,
        reason: "Checks claims.",
        payee: { payeeId: "claim_check_tool", type: "tool", label: "Claim-check tool", walletAddress: null },
      },
    ],
    receiptsByIntent: new Map([
      ["intent_source", {
        receiptId: "receipt_local",
        intentId: "intent_source",
        paymentState: "recorded",
        proof: { proofType: "local", paymentState: "recorded", txHash: null },
      }],
      ["intent_tool", {
        receiptId: "receipt_rejected",
        intentId: "intent_tool",
        paymentState: "failed",
        proof: { proofType: "arc_tx", paymentState: "failed", txHash: `0x${"d".repeat(64)}` },
      }],
    ]),
  });
  const guardrails = buildNanoBudgetGuardrailModel({
    budget: { amount: 0.1 },
    spendRows: rows.rows,
  });

  assert.equal(guardrails.verifiedPaidUsdc, 0);
  assert.equal(guardrails.remainingBudgetUsdc, 0.1);
  assert.match(guardrails.warnings.join(" "), /Verified paid only counts Arc proof receipts/);
});

test("Nano budget guardrails count only verified Arc proof as paid", () => {
  const txHash = `0x${"e".repeat(64)}`;
  const rows = buildNanoMultiSpendPlanRows({
    intents: [
      {
        intentId: "intent_source",
        status: "payment_recorded",
        amount: 0.01,
        reason: "Adds source-backed context.",
        payee: { payeeId: "source_unlock", type: "source", label: "Source unlock", walletAddress: "0x2222222222222222222222222222222222222222" },
      },
    ],
    receiptsByIntent: new Map([
      ["intent_source", {
        receiptId: "receipt_source",
        intentId: "intent_source",
        paymentState: "recorded",
        proof: { proofType: "arc_tx", paymentState: "recorded", txHash },
      }],
    ]),
  });
  const guardrails = buildNanoBudgetGuardrailModel({
    budget: { amount: 0.1 },
    spendRows: rows.rows,
  });

  assert.equal(guardrails.verifiedPaidUsdc, 0.01);
  assert.equal(guardrails.remainingBudgetUsdc, 0.09);
  assert.equal(guardrails.payableNowUsdc, 0);
  assert.equal(guardrails.canPayPayableNow, false);
});

test("Nano budget guardrails floor remaining budget and block oversized payable spend", () => {
  const rows = buildNanoMultiSpendPlanRows({
    intents: [
      {
        intentId: "intent_source",
        status: "approved",
        amount: 0.12,
        reason: "Adds source-backed context.",
        payee: { payeeId: "source_unlock", type: "source", label: "Source unlock", walletAddress: "0x2222222222222222222222222222222222222222" },
      },
    ],
    receiptsByIntent: new Map(),
  });
  const guardrails = buildNanoBudgetGuardrailModel({
    budget: { amount: 0.1 },
    spendRows: rows.rows,
  });

  assert.equal(guardrails.remainingBudgetUsdc, 0.1);
  assert.equal(guardrails.remainingAfterPayableUsdc, 0);
  assert.equal(guardrails.canPayPayableNow, false);
  assert.equal(guardrails.budgetStatus, "Payment blocked");
  assert.match(guardrails.warnings.join(" "), /This spend exceeds the remaining budget/);
});

test("Nano budget guardrails preserve planned-only Gateway and x402 honesty", () => {
  const gateway = buildNanoReceiptStatusModel({
    proof: { proofType: "circle_gateway", paymentState: "recorded" },
  });
  const x402 = buildNanoReceiptStatusModel({
    proof: { proofType: "x402", paymentState: "recorded" },
  });
  const rows = buildNanoMultiSpendPlanRows({
    intents: [],
    receiptsByIntent: new Map(),
  });
  const guardrails = buildNanoBudgetGuardrailModel({ budget: { amount: 0.1 }, spendRows: rows.rows });

  assert.match(gateway.helper, /planned next/);
  assert.match(x402.helper, /planned next/);
  assert.match(guardrails.warnings.join(" "), /Planned rows are not live paid flows yet/);
  assert.doesNotMatch(`${guardrails.helper} ${guardrails.warnings.join(" ")}`, /judge/i);
});

test("Nano agent decision presentation separates starter and active decision states", () => {
  const starter = buildNanoAgentDecisionPresentation({ hasBudget: false });
  const active = buildNanoAgentDecisionPresentation({ hasBudget: true });

  assert.equal(starter.label, "Starter decision");
  assert.equal(starter.status, "Starter decision");
  assert.match(starter.helper, /Starter decision only/);
  assert.equal(active.label, "Active decision");
  assert.equal(active.status, "Waiting for approval");
  assert.match(active.helper, /requested this source spend/);
});

test("Nano agent evaluation panel chooses only Source Unlock for live payment", () => {
  const panel = buildNanoAgentEvaluationPanelModel({
    budget: { amount: 0.1 },
    spendRows: buildNanoMultiSpendPlanRows({
      recipientRegistry: buildNanoRecipientRegistry({
        sourceWallet: "0x2222222222222222222222222222222222222222",
      }),
      intents: [
        {
          intentId: "intent_source",
          status: "approved",
          amount: 0.01,
          reason: "Adds source-backed context.",
          payee: {
            payeeId: "source_unlock",
            type: "source",
            label: "Source unlock",
            walletAddress: "0x2222222222222222222222222222222222222222",
          },
        },
      ],
      receiptsByIntent: new Map(),
    }).rows,
  });
  const source = panel.options.find((option) => option.id === "source_unlock");
  const formatter = panel.options.find((option) => option.id === "summary_formatter");
  const checker = panel.options.find((option) => option.id === "claim_check_tool");

  assert.equal(panel.modeLabel, "Controlled starter evaluation");
  assert.equal(panel.noFakeAutonomy, true);
  assert.equal(panel.chosenOptionId, "source_unlock");
  assert.equal(source.state, "chosen");
  assert.equal(source.payable, true);
  assert.match(source.payActionLabel, /Pay source on Arc|Payable after approval/);
  assert.match(source.costValueReason, /Highest value/);
  assert.match(source.decisionReason, /Worth paying/);
  assert.match(source.budgetImpact, /0.01 USDC/);
  assert.equal(formatter.payable, false);
  assert.equal(formatter.state, "skipped");
  assert.equal(formatter.payActionLabel, "No pay action");
  assert.equal(checker.payable, false);
  assert.equal(checker.state, "planned_starter");
  assert.equal(checker.payActionLabel, "No pay action");
});

test("Nano agent evaluation panel stays honest before budget and proof", () => {
  const panel = buildNanoAgentEvaluationPanelModel();
  const text = [
    panel.subtitle,
    panel.helper,
    panel.whySourceWorthPaying,
    ...panel.options.flatMap((option) => [
      option.stateLabel,
      option.costValueReason,
      option.budgetImpact,
      option.decisionReason,
      option.payActionLabel,
    ]),
  ].join(" ");

  assert.match(panel.helper, /not dynamic source discovery yet/);
  assert.equal(panel.skippedOptionsPayable, false);
  assert.doesNotMatch(text, /Paid with proof|verified Arc transaction|Gateway|x402|Circle Wallets|nanopayments/i);
  assert.doesNotMatch(text, /autonomous dynamic source discovery|source executed|tool executed/i);
});

test("Nano approved source spend is not paid", () => {
  const decision = buildNanoAgentDecisionPresentation({
    hasBudget: true,
    intent: { status: "approved" },
  });
  const source = buildNanoSourceUnlockPresentation({
    intent: { status: "approved", amount: 0.01, payee: { walletAddress: null } },
    receipt: null,
  });

  assert.equal(decision.status, "Approved");
  assert.equal(source.unlocked, false);
  assert.equal(source.isUnlocked, false);
  assert.equal(source.canShowInResult, false);
  assert.equal(source.unlockStatus, "locked");
  assert.equal(source.proofStatus, "Approved, not paid yet");
  assert.equal(source.status, "Approved, not paid yet");
});

test("Nano source insight remains locked before verified proof", () => {
  const missing = buildNanoSourceUnlockPresentation({
    intent: { status: "proposed", amount: 0.01, payee: { walletAddress: null } },
    receipt: null,
  });

  assert.equal(missing.title, "Source insight locked");
  assert.equal(missing.unlocked, false);
  assert.equal(missing.isUnlocked, false);
  assert.equal(missing.canShowInResult, false);
  assert.equal(missing.unlockStatus, "locked");
  assert.equal(missing.capsuleLabel, "Dispatch-hosted starter source capsule");
  assert.equal(missing.capsuleTitle, "Starter source locked");
  assert.equal(missing.capsuleStateLabel, "Locked before proof");
  assert.match(missing.capsuleSummary, /locked until Arc proof/);
  assert.match(missing.capsuleContribution, /hidden from the result/);
  assert.equal(missing.externalAccessClaim, false);
  assert.equal(missing.txLink, null);
  assert.equal(missing.proofStatus, "Not paid yet");
  assert.equal(missing.status, "Planned");
  assert.equal(missing.priceUsdc, 0.01);
  assert.equal(missing.priceLabel, "0.01 USDC");
});

test("Nano source insight unlocks only after verified Arc proof", () => {
  const receipt = {
    paymentState: "recorded",
    proof: {
      proofType: "arc_tx",
      paymentState: "recorded",
      txHash: `0x${"a".repeat(64)}`,
    },
  };
  const source = buildNanoSourceUnlockPresentation({
    intent: { status: "approved", amount: 0.01, payee: { walletAddress: "0x1111111111111111111111111111111111111111" } },
    receipt,
  });

  assert.equal(source.title, "Source insight unlocked");
  assert.equal(source.unlocked, true);
  assert.equal(source.isUnlocked, true);
  assert.equal(source.canShowInResult, true);
  assert.equal(source.unlockStatus, "unlocked");
  assert.equal(source.capsuleTitle, "Starter source unlocked");
  assert.equal(source.capsuleStateLabel, "Unlocked after proof");
  assert.match(source.capsuleHelper, /verified Arc proof/i);
  assert.match(source.capsuleSummary, /Stablecoins became/);
  assert.match(source.capsuleContribution, /Unlocked source context/);
  assert.match(source.txLink, /testnet\.arcscan\.app/);
  assert.equal(source.externalAccessClaim, false);
  assert.equal(source.proofStatus, "Paid with proof");
  assert.equal(source.status, "Paid with proof");
  assert.equal(source.recipientWallet, "0x1111111111111111111111111111111111111111");
  assert.equal(source.starterOrLiveLabel, "Live source insight");
  assert.match(source.contributionSummary, /Unlocked source context/);
  assert.match(source.insight, /Stablecoins became/);
});

test("Nano local receipt does not unlock source insight as Paid with proof", () => {
  const source = buildNanoSourceUnlockPresentation({
    intent: { status: "approved", amount: 0.01, payee: { walletAddress: null } },
    receipt: {
      paymentState: "recorded",
      proof: { proofType: "local", paymentState: "recorded" },
    },
  });

  assert.equal(source.unlocked, false);
  assert.equal(source.isUnlocked, false);
  assert.equal(source.canShowInResult, false);
  assert.equal(source.proofStatus, "Local receipt");
  assert.equal(source.status, "Local receipt");
  assert.equal(source.capsuleTitle, "Starter source locked");
  assert.equal(source.txLink, null);
});

test("Nano rejected proof keeps source insight locked", () => {
  const source = buildNanoSourceUnlockPresentation({
    intent: { status: "approved", amount: 0.01, payee: { walletAddress: "0x1111111111111111111111111111111111111111" } },
    receipt: {
      paymentState: "failed",
      proof: {
        proofType: "arc_tx",
        paymentState: "failed",
        txHash: `0x${"f".repeat(64)}`,
      },
    },
  });

  assert.equal(source.isUnlocked, false);
  assert.equal(source.canShowInResult, false);
  assert.equal(source.unlockStatus, "locked");
  assert.equal(source.proofStatus, "Proof rejected");
  assert.equal(source.status, "Proof rejected");
  assert.equal(source.capsuleStateLabel, "Locked before proof");
  assert.equal(source.txLink, null);
});

test("Nano source insight stays locked when proof is missing", () => {
  const source = buildNanoSourceUnlockPresentation({
    hasBudget: true,
    intent: null,
    receipt: null,
  });

  assert.equal(source.label, "Active source insight");
  assert.equal(source.starterOrLiveLabel, "Active source insight");
  assert.equal(source.isUnlocked, false);
  assert.equal(source.canShowInResult, false);
  assert.equal(source.proofStatus, "Not paid yet");
  assert.match(source.lockedSummary, /Verify Arc proof/);
  assert.match(source.capsuleHelper, /Arc proof verifies payment/);
});

test("Nano result preview waits for source proof before verified payment", () => {
  const preview = buildNanoResultPreviewPresentation({
    goal: "Create a short brief about stablecoin payments.",
    hasVerifiedSourceProof: false,
  });

  assert.equal(preview.status, "Waiting for source proof");
  assert.equal(preview.proofStatus, "Not paid yet");
  assert.match(preview.body, /waiting for source proof/i);
});

test("Nano result preview references unlocked source after verified proof", () => {
  const sourceUnlock = buildNanoSourceUnlockPresentation({
    intent: { status: "approved", amount: 0.01, payee: { walletAddress: "0x1111111111111111111111111111111111111111" } },
    receipt: {
      paymentState: "recorded",
      proof: {
        proofType: "arc_tx",
        paymentState: "recorded",
        txHash: `0x${"b".repeat(64)}`,
      },
    },
  });
  const preview = buildNanoResultPreviewPresentation({
    goal: "Create a short brief about stablecoin payments.",
    hasVerifiedSourceProof: true,
    sourceUnlock,
  });

  assert.equal(preview.status, "Source-backed preview");
  assert.equal(preview.paidSourceUsed, "Live source insight");
  assert.equal(preview.proofStatus, "Paid with proof");
  assert.match(preview.body, /Stablecoins became the default settlement layer/);
  assert.match(preview.body, /tiny payments/);
});

test("Nano result preview does not reference source contribution before verified proof", () => {
  const sourceUnlock = buildNanoSourceUnlockPresentation({
    intent: { status: "approved", amount: 0.01, payee: { walletAddress: "0x1111111111111111111111111111111111111111" } },
    receipt: {
      paymentState: "recorded",
      proof: { proofType: "local", paymentState: "recorded" },
    },
  });
  const preview = buildNanoResultPreviewPresentation({
    goal: "Create a short brief about stablecoin payments.",
    hasVerifiedSourceProof: true,
    sourceUnlock,
  });

  assert.equal(sourceUnlock.canShowInResult, false);
  assert.equal(preview.status, "Waiting for source proof");
  assert.equal(preview.paidSourceUsed, "Waiting for verified source proof");
  assert.doesNotMatch(preview.body, /Stablecoins became the default settlement layer/);
});

test("Nano run progress follows budget approval proof and result states", () => {
  assert.equal(buildNanoRunProgressPresentation({}).currentStep, "Budget not created");
  assert.equal(buildNanoRunProgressPresentation({ hasBudget: true }).currentStep, "Source decision ready");
  assert.equal(buildNanoRunProgressPresentation({ hasBudget: true, hasSpendPlan: true }).currentStep, "Waiting for approval");
  assert.equal(buildNanoRunProgressPresentation({ hasApprovedSpend: true }).currentStep, "Payment proof pending");
  assert.equal(buildNanoRunProgressPresentation({ hasProofPending: true }).currentCopy, "Waiting for Arc proof to confirm the payment.");
  assert.equal(buildNanoRunProgressPresentation({ hasVerifiedSourceProof: true }).currentStep, "Result ready");
});

test("Nano run console has exactly the four proof-console steps", () => {
  const model = buildNanoRunConsoleModel({ walletConnected: true });

  assert.equal(model.title, "Nano run");
  assert.equal(model.intro, "Follow one proof-gated source payment from goal to receipt.");
  assert.deepEqual(model.steps.map((step) => step.title), ["Goal", "Source", "Pay + proof", "Result"]);
  assert.deepEqual(model.steps.map((step) => step.number), ["01", "02", "03", "04"]);
  assert.equal(model.activeStepKey, "goal");
  assert.equal(model.activePanel.primaryActionLabel, "Create Nano budget");
  assert.doesNotMatch(JSON.stringify(model), /Gateway|x402|Circle Wallets|Paid with proof/i);
});

test("Nano run console advances from budget to approved but unpaid without paid labels", () => {
  const budgetReady = buildNanoRunConsoleModel({
    walletConnected: true,
    budget: { amount: 1 },
  });
  const approved = buildNanoRunConsoleModel({
    walletConnected: true,
    budget: { amount: 1 },
    hasSpendPlan: true,
    hasApprovedSpend: true,
  });

  assert.equal(budgetReady.activeStepKey, "source");
  assert.equal(budgetReady.steps.find((step) => step.key === "goal").stateLabel, "Budget created");
  assert.equal(budgetReady.steps.find((step) => step.key === "source").stateLabel, "Starter path");
  assert.equal(approved.activeStepKey, "pay_proof");
  assert.equal(approved.steps.find((step) => step.key === "pay_proof").stateLabel, "Approved, not paid yet");
  assert.equal(approved.activePanel.title, "Approved, not paid yet");
  assert.doesNotMatch(JSON.stringify(approved), /Result unlocked|Source unlocked|Paid with proof/);
});

test("Nano run console keeps local pending and rejected proof locked", () => {
  const local = buildNanoRunConsoleModel({
    walletConnected: true,
    budget: { amount: 1 },
    hasSpendPlan: true,
    hasApprovedSpend: true,
    resultContribution: buildNanoResultContributionModel({
      budget: { amount: 1 },
      sourceReceipt: { proof: { proofType: "local", paymentState: "recorded" }, paymentState: "recorded" },
    }),
  });
  const pending = buildNanoRunConsoleModel({
    walletConnected: true,
    budget: { amount: 1 },
    hasSpendPlan: true,
    hasProofPending: true,
  });
  const rejected = buildNanoRunConsoleModel({
    walletConnected: true,
    budget: { amount: 1 },
    hasSpendPlan: true,
    hasApprovedSpend: true,
    resultContribution: buildNanoResultContributionModel({
      budget: { amount: 1 },
      sourceReceipt: {
        proof: { proofType: "arc_tx", paymentState: "failed", txHash: `0x${"a".repeat(64)}` },
        paymentState: "failed",
      },
    }),
  });

  assert.equal(local.activeStepKey, "pay_proof");
  assert.equal(local.activePanel.secondaryText, "Pending or local proof is not paid.");
  assert.equal(pending.steps.find((step) => step.key === "pay_proof").stateLabel, "Proof pending");
  assert.equal(rejected.steps.find((step) => step.key === "pay_proof").stateLabel, "Proof rejected");
  assert.doesNotMatch(JSON.stringify([local, pending, rejected]), /Result unlocked|Source unlocked|Paid with proof/);
});

test("Nano run console keeps unavailable proof unpaid and locked", () => {
  const unavailable = buildNanoRunConsoleModel({
    walletConnected: true,
    budget: { amount: 1 },
    hasSpendPlan: true,
    hasApprovedSpend: true,
    proofStatusOverride: "unavailable",
  });

  assert.equal(unavailable.activeStepKey, "pay_proof");
  assert.equal(unavailable.steps.find((step) => step.key === "pay_proof").stateLabel, "Proof unavailable");
  assert.equal(unavailable.activePanel.title, "Proof unavailable");
  assert.equal(unavailable.activePanel.secondaryText, "Unavailable proof is not paid.");
  assert.doesNotMatch(JSON.stringify(unavailable), /Result unlocked|Source unlocked|Paid with proof/);
});

test("Nano run console unlocks result only with verified Arc proof", () => {
  const txHash = `0x${"b".repeat(64)}`;
  const source = buildNanoSourceUnlockPresentation({
    intent: { status: "approved", amount: 0.05, payee: { walletAddress: "0x1111111111111111111111111111111111111111" } },
    receipt: {
      paymentState: "recorded",
      proof: { proofType: "arc_tx", paymentState: "recorded", txHash },
    },
  });
  const result = buildNanoResultContributionModel({
    budget: { amount: 1 },
    sourceUnlock: source,
    sourceReceipt: {
      paymentState: "recorded",
      proof: { proofType: "arc_tx", paymentState: "recorded", txHash },
    },
  });
  const model = buildNanoRunConsoleModel({
    walletConnected: true,
    budget: { amount: 1 },
    hasSpendPlan: true,
    hasApprovedSpend: true,
    sourceUnlock: source,
    resultContribution: result,
  });

  assert.equal(model.activeStepKey, "result");
  assert.equal(model.steps.find((step) => step.key === "pay_proof").stateLabel, "Paid with proof");
  assert.equal(model.steps.find((step) => step.key === "result").stateLabel, "Result unlocked");
  assert.equal(model.activePanel.primaryActionLabel, "View shareable receipt");
});

test("Nano test path labels live starter and planned claims honestly", () => {
  const starter = buildNanoJudgeCommandCenterModel({});
  const verified = buildNanoJudgeCommandCenterModel({
    hasBudget: true,
    hasSpendPlan: true,
    hasApprovedSpend: true,
    hasVerifiedSourceProof: true,
    hasReceipt: true,
  });

  assert.equal(starter.eyebrow, "How to test Nano");
  assert.match(starter.body, /Arc proof verifies payment/);
  assert.ok(starter.clickPath.includes("Create Nano budget"));
  assert.ok(verified.clickPath.includes("Open receipt"));
  assert.ok(starter.claimGroups.find((group) => group.label === "Live").items.includes("Arc Testnet USDC proof"));
  assert.ok(starter.claimGroups.find((group) => group.label === "Starter").items.includes("Dispatch-hosted source capsule"));
  assert.ok(starter.claimGroups.find((group) => group.label === "Planned").items.includes("Gateway/x402 settlement"));
  assert.ok(starter.proofRules.includes("Approved is not paid."));
  assert.ok(starter.proofRules.includes("Paid with proof appears only after verified Arc proof."));
  assert.doesNotMatch(JSON.stringify(starter), /fake demo data|paid users|production launch/i);
  assert.match(verified.currentState, /unlock/);
});

test("Nano API unavailable copy explains router dependency", () => {
  assert.equal(
    nanoApiUnavailableMessage(),
    "Nano router is unavailable. Budget creation and proof checks need the Dispatch router API.",
  );
});

test("wallet network snapshots compare stable connected wallet state", () => {
  const snapshot = {
    walletAddress: "0x1111111111111111111111111111111111111111",
    chainId: 5042002,
    expectedChainId: 5042002,
    isArcTestnet: true,
    usdcBalance: "1.000000",
    nativeGasBalance: "0.5",
    tokenDecimals: 6,
    message: "Arc Testnet wallet is ready for testnet USDC funding.",
    error: "",
  };

  assert.equal(walletNetworkSnapshotsEqual(snapshot, { ...snapshot, walletAddress: snapshot.walletAddress.toUpperCase() }), true);
  assert.equal(walletNetworkSnapshotsEqual(snapshot, { ...snapshot, usdcBalance: "0.5" }), false);
  assert.equal(walletNetworkSnapshotsEqual(snapshot, { ...snapshot, chainId: 1, isArcTestnet: false }), false);
});

test("Nano pay action is enabled only for approved spends with a valid recipient wallet", () => {
  const baseIntent = {
    status: "approved",
    payee: {
      walletAddress: null,
    },
  };
  const missing = buildNanoPaymentActionModel(baseIntent, null);
  const invalid = buildNanoPaymentActionModel({ ...baseIntent, payee: { walletAddress: "0x1234" } }, null);
  const proposed = buildNanoPaymentActionModel({
    status: "proposed",
    payee: { walletAddress: "0x1111111111111111111111111111111111111111" },
  }, null);
  const paid = buildNanoPaymentActionModel({
    status: "approved",
    payee: { walletAddress: "0x1111111111111111111111111111111111111111" },
  }, {
    paymentState: "recorded",
    receiptId: "receipt",
    proof: {
      proofType: "arc_tx",
      paymentState: "recorded",
      txHash: `0x${"a".repeat(64)}`,
    },
  });
  const localProof = buildNanoPaymentActionModel({
    status: "approved",
    payee: { walletAddress: "0x1111111111111111111111111111111111111111" },
  }, {
    receiptId: "local_receipt",
    proof: {
      proofType: "local",
    },
  });
  const ready = buildNanoPaymentActionModel({
    status: "approved",
    payee: { walletAddress: "0x1111111111111111111111111111111111111111" },
  }, null);

  assert.equal(missing.enabled, false);
  assert.match(missing.reason, /Add a recipient wallet/);
  assert.equal(invalid.enabled, false);
  assert.match(invalid.reason, /valid 0x recipient wallet/);
  assert.equal(proposed.enabled, false);
  assert.match(proposed.reason, /Approve the planned spend/);
  assert.equal(paid.enabled, false);
  assert.equal(paid.label, "Paid with proof");
  assert.match(paid.reason, /verified proof/);
  assert.equal(localProof.enabled, false);
  assert.equal(localProof.label, "Local receipt");
  assert.doesNotMatch(localProof.reason, /verified proof/);
  assert.equal(ready.enabled, true);
  assert.match(ready.reason, /only marks this spend paid after/);
});

test("Nano local receipts are not labeled as paid with proof", () => {
  const model = buildNanoReceiptStatusModel({
    paymentState: "recorded",
    proof: {
      proofType: "local",
      paymentState: "recorded",
      txHash: null,
    },
  });

  assert.equal(model.label, "Local receipt");
  assert.match(model.helper, /not settlement/i);
  assert.notEqual(model.label, "Paid with proof");
});

test("Nano Arc receipts are labeled paid only when verified proof exists", () => {
  const txHash = `0x${"d".repeat(64)}`;
  const model = buildNanoReceiptStatusModel({
    paymentState: "recorded",
    proof: {
      proofType: "arc_tx",
      paymentState: "recorded",
      txHash,
    },
  });

  assert.equal(model.label, "Paid with proof");
  assert.match(model.helper, /Verified Arc Testnet USDC proof/);
});

test("Nano Arc receipt without a valid tx hash is not Paid with proof", () => {
  const model = buildNanoReceiptStatusModel({
    paymentState: "recorded",
    proof: {
      proofType: "arc_tx",
      paymentState: "recorded",
      txHash: null,
    },
  });

  assert.equal(model.label, "Proof pending");
  assert.notEqual(model.label, "Paid with proof");
  assert.match(model.helper, /recorded payment and valid transaction hash/);
});

test("Nano Arc receipt without recorded payment state is not Paid with proof", () => {
  const model = buildNanoReceiptStatusModel({
    proof: {
      proofType: "arc_tx",
      txHash: `0x${"c".repeat(64)}`,
    },
  });

  assert.equal(model.label, "Proof pending");
  assert.notEqual(model.label, "Paid with proof");
});

test("Nano rejected proof does not show Paid with proof", () => {
  const model = buildNanoReceiptStatusModel({
    paymentState: "failed",
    proof: {
      proofType: "arc_tx",
      paymentState: "failed",
      txHash: `0x${"e".repeat(64)}`,
    },
  });

  assert.equal(model.label, "Proof rejected");
  assert.notEqual(model.label, "Paid with proof");
});

test("Gateway and x402 proof labels remain planned-only", () => {
  const gateway = buildNanoReceiptStatusModel({
    paymentState: "recorded",
    proof: { proofType: "circle_gateway", paymentState: "recorded", txHash: null },
  });
  const x402 = buildNanoReceiptStatusModel({
    paymentState: "recorded",
    proof: { proofType: "x402", paymentState: "recorded", txHash: null },
  });

  assert.equal(gateway.label, "Gateway proof metadata");
  assert.equal(gateway.tone, "pending");
  assert.match(gateway.helper, /planned next/);
  assert.equal(x402.label, "x402 proof metadata");
  assert.equal(x402.tone, "pending");
  assert.match(x402.helper, /planned next/);
});

test("Gateway and x402 proof metadata do not unlock Nano source insight", () => {
  for (const proofType of ["circle_gateway", "x402"]) {
    const source = buildNanoSourceUnlockPresentation({
      intent: { status: "approved", amount: 0.01, payee: { walletAddress: "0x1111111111111111111111111111111111111111" } },
      receipt: {
        paymentState: "recorded",
        proof: { proofType, paymentState: "recorded", txHash: null },
      },
    });

    assert.equal(source.isUnlocked, false);
    assert.equal(source.canShowInResult, false);
    assert.equal(source.unlockStatus, "locked");
    assert.notEqual(source.proofStatus, "Paid with proof");
  }
});

test("agent display fallbacks do not fake paid history or reviews", () => {
  const display = buildAgentDisplayModel({
    profile: { agentId: "new", publicName: "New Agent", slug: "new-agent", originType: "platform", category: "research" },
    performanceSummary: {},
  }, {});

  assert.equal(display.completedTasksDisplay, "0");
  assert.equal(display.totalEarnedDisplay, "0 USDC");
  assert.equal(display.approvalRateDisplay, "Not enough data yet");
  assert.equal(display.reviewsDisplay, "No reviews yet");
});

test("Nano metrics use zero fallbacks without inventing payment data", () => {
  const model = buildNanoMetricsModel(null);

  assert.equal(model.sourceLabel, "Session activity");
  assert.equal(model.budgetCount, "0");
  assert.equal(model.totalAuthorizedBudget, "0 USDC");
  assert.equal(model.totalRecordedPaymentValue, "0 USDC");
  assert.equal(model.verifiedArcPaymentCount, "0");
  assert.equal(model.totalVerifiedUsdcVolume, "0 USDC");
  assert.equal(model.averageVerifiedPaymentSize, "0 USDC");
  assert.equal(model.latestProofStatus, "No proof yet");
  assert.equal(model.latestVerifiedReceipt, "None yet");
  assert.equal(model.emptyTitle, "No verified Nano payments yet.");
  assert.match(model.emptyBody, /verify proof/);
  assert.doesNotMatch(Object.values(model).join(" "), /revenue|earnings|traction|paid users/i);
});

test("Nano economy stats use honest fallback values without fake payment data", () => {
  const model = buildNanoEconomyStatsModel(null);
  const stats = Object.fromEntries(model.stats.map((stat) => [stat.label, stat]));

  assert.equal(model.title, "Nano economy");
  assert.equal(stats["USDC earned"].value, "0.00 verified");
  assert.equal(stats["Agents paid"].value, "Verified proof only");
  assert.equal(stats["Sources unlocked"].value, "1 starter path");
  assert.equal(stats["Receipts created"].value, "Real runs only");
  assert.equal(stats["Proof checks"].value, "Arc verified");
  assert.doesNotMatch(JSON.stringify(model), /paid users|traction|growth/i);
});

test("Nano economy stats count only verified Arc proof for paid values", () => {
  const verifiedSourceTx = `0x${"a".repeat(64)}`;
  const verifiedAgentTx = `0x${"b".repeat(64)}`;
  const rejectedTx = `0x${"c".repeat(64)}`;
  const model = buildNanoEconomyStatsModel({ receiptCount: 5 }, {
    activity: {
      receipts: [
        {
          amount: 0.05,
          paymentState: "recorded",
          payee: { payeeId: "source_unlock", type: "source" },
          proof: { proofType: "arc_tx", paymentState: "recorded", txHash: verifiedSourceTx },
        },
        {
          amount: 0.03,
          paymentState: "recorded",
          payee: { payeeId: "summary_agent", type: "agent" },
          proof: { proofType: "arc_tx", paymentState: "recorded", txHash: verifiedAgentTx },
        },
        {
          amount: 0.04,
          paymentState: "recorded",
          payee: { payeeId: "local_tool", type: "tool" },
          proof: { proofType: "local", paymentState: "recorded", txHash: null },
        },
        {
          amount: 0.02,
          paymentState: "failed",
          payee: { payeeId: "failed_source", type: "source" },
          proof: { proofType: "arc_tx", paymentState: "failed", txHash: rejectedTx },
        },
        {
          amount: 0.01,
          paymentState: "recorded",
          payee: { payeeId: "gateway_source", type: "source" },
          proof: { proofType: "circle_gateway", paymentState: "recorded", txHash: verifiedSourceTx },
        },
      ],
    },
  });
  const stats = Object.fromEntries(model.stats.map((stat) => [stat.label, stat]));

  assert.equal(stats["USDC earned"].value, "0.08 verified");
  assert.equal(stats["Agents paid"].value, "1 verified");
  assert.equal(stats["Sources unlocked"].value, "1 verified");
  assert.equal(stats["Receipts created"].value, "5 real runs");
  assert.equal(stats["Proof checks"].value, "2 verified");
  assert.doesNotMatch(JSON.stringify(model), /Paid with proof/);
});

test("Nano metrics count only verified Arc proof as paid usage", () => {
  const verifiedTx = `0x${"a".repeat(64)}`;
  const gatewayTx = `0x${"b".repeat(64)}`;
  const model = buildNanoMetricsModel({
    budgetCount: 1,
    spendIntentCount: 4,
    approvedSpendIntentCount: 3,
    receiptCount: 4,
    totalAuthorizedBudget: 1,
    totalApprovedIntentValue: 0.14,
    totalRecordedPaymentValue: 0.05,
    availableBudget: 0.95,
  }, {
    activity: {
      budget: { ownerWallet: "0x1111111111111111111111111111111111111111" },
      spendIntents: [
        { ownerWallet: "0x1111111111111111111111111111111111111111", payee: { walletAddress: "0x2222222222222222222222222222222222222222" } },
        { ownerWallet: "0x1111111111111111111111111111111111111111", payee: { walletAddress: "0x3333333333333333333333333333333333333333" } },
      ],
      receipts: [
        {
          amount: 0.05,
          paymentState: "recorded",
          recordedAt: "2026-06-01T12:00:00.000Z",
          proof: {
            proofType: "arc_tx",
            paymentState: "recorded",
            txHash: verifiedTx,
            sender: "0x1111111111111111111111111111111111111111",
            recipient: "0x2222222222222222222222222222222222222222",
          },
        },
        {
          amount: 0.03,
          paymentState: "recorded",
          recordedAt: "2026-06-01T12:01:00.000Z",
          proof: { proofType: "local", paymentState: "recorded", txHash: null },
        },
        {
          amount: 0.04,
          paymentState: "recorded",
          recordedAt: "2026-06-01T12:02:00.000Z",
          proof: { proofType: "circle_gateway", paymentState: "recorded", txHash: gatewayTx },
        },
        {
          amount: 0.02,
          paymentState: "failed",
          recordedAt: "2026-06-01T12:03:00.000Z",
          proof: { proofType: "arc_tx", paymentState: "failed", txHash: verifiedTx },
        },
      ],
    },
  });

  assert.equal(model.sourceLabel, "Router-backed activity");
  assert.equal(model.budgetCount, "1");
  assert.equal(model.receiptCount, "4");
  assert.equal(model.verifiedArcPaymentCount, "1");
  assert.equal(model.totalVerifiedUsdcVolume, "0.05 USDC");
  assert.equal(model.averageVerifiedPaymentSize, "0.05 USDC");
  assert.equal(model.uniqueWalletCount, "3");
  assert.equal(model.latestProofStatus, "Proof rejected");
  assert.equal(model.latestVerifiedReceipt, "0xaaaa...aaaa");
  assert.equal(model.hasVerifiedPayments, true);
});

test("Nano run history asks for wallet before exposing runs", () => {
  const model = buildNanoRunHistoryModel({ wallet: "", budgets: [] });

  assert.equal(model.walletConnected, false);
  assert.deepEqual(model.runCards, []);
  assert.equal(model.emptyTitle, "Connect a wallet to see Nano runs for that wallet.");
  assert.doesNotMatch(`${model.title} ${model.subtitle} ${model.emptyTitle} ${model.emptyBody}`, /judge/i);
});

test("Nano run history returns honest empty state for connected wallet with no runs", () => {
  const model = buildNanoRunHistoryModel({ wallet: "0x1111111111111111111111111111111111111111", budgets: [] });

  assert.equal(model.walletConnected, true);
  assert.deepEqual(model.runCards, []);
  assert.equal(model.emptyTitle, "No Nano runs yet.");
  assert.equal(model.emptyBody, "Create a budget to start a source-payment run.");
});

test("Nano run history cards use router-backed budget and activity fields", () => {
  const txHash = `0x${"c".repeat(64)}`;
  const budget = {
    budgetId: "nano_budget_1",
    runId: "nano_run_1",
    goal: "Create a stablecoin brief",
    amount: 1,
    status: "spending",
    createdAt: "2026-06-01T12:00:00.000Z",
    updatedAt: "2026-06-01T12:01:00.000Z",
  };
  const activity = {
    budget,
    runContext: { goal: budget.goal, updatedAt: "2026-06-01T12:02:00.000Z" },
    spendIntents: [
      {
        intentId: "intent_source",
        payee: { payeeId: "source_unlock", label: "Source unlock", walletAddress: "0x2222222222222222222222222222222222222222" },
        amount: 0.05,
        reason: "Adds source-backed context.",
        status: "payment_recorded",
        updatedAt: "2026-06-01T12:03:00.000Z",
      },
      {
        intentId: "intent_local",
        payee: { payeeId: "summarizer", label: "Summarizer agent", walletAddress: null },
        amount: 0.03,
        reason: "Turns notes into a short summary.",
        status: "payment_recorded",
      },
    ],
    receipts: [
      {
        receiptId: "receipt_verified",
        intentId: "intent_source",
        amount: 0.05,
        paymentState: "recorded",
        contributionSummary: "Verified source unlock improved the brief.",
        createdAt: "2026-06-01T12:04:00.000Z",
        proof: { proofType: "arc_tx", paymentState: "recorded", txHash },
      },
      {
        receiptId: "receipt_local",
        intentId: "intent_local",
        amount: 0.03,
        paymentState: "recorded",
        createdAt: "2026-06-01T12:05:00.000Z",
        proof: { proofType: "local", paymentState: "recorded", txHash: null },
      },
    ],
  };
  const model = buildNanoRunHistoryModel({
    wallet: "0x1111111111111111111111111111111111111111",
    budgets: [budget],
    activities: { [budget.budgetId]: activity },
    selectedBudgetId: budget.budgetId,
  });

  assert.equal(model.runCards.length, 1);
  assert.equal(model.runCards[0].goal, "Create a stablecoin brief");
  assert.equal(model.runCards[0].budget, "1 USDC");
  assert.equal(model.runCards[0].sourceStatus, "Paid with proof");
  assert.equal(model.runCards[0].proofStatus, "Local receipt");
  assert.equal(model.runCards[0].verifiedReceiptCount, "1");
  assert.equal(model.runCards[0].selected, true);
});

test("Nano run history does not count rejected local pending or Gateway receipts as verified", () => {
  const validTx = `0x${"d".repeat(64)}`;
  const budget = {
    budgetId: "nano_budget_2",
    runId: "nano_run_2",
    goal: "Check claims",
    amount: 1,
    status: "spending",
    createdAt: "2026-06-01T12:00:00.000Z",
    updatedAt: "2026-06-01T12:00:00.000Z",
  };
  const activity = {
    budget,
    spendIntents: [
      { intentId: "rejected", payee: { payeeId: "source_unlock", label: "Source unlock" }, amount: 0.05, reason: "Context", status: "failed" },
      { intentId: "gateway", payee: { payeeId: "gateway", label: "Gateway metadata" }, amount: 0.03, reason: "Metadata", status: "payment_recorded" },
      { intentId: "pending", payee: { payeeId: "pending", label: "Pending Arc" }, amount: 0.04, reason: "Pending", status: "payment_recorded" },
      { intentId: "local", payee: { payeeId: "local", label: "Local receipt" }, amount: 0.02, reason: "Local", status: "payment_recorded" },
    ],
    receipts: [
      { intentId: "rejected", paymentState: "failed", proof: { proofType: "arc_tx", paymentState: "failed", txHash: validTx } },
      { intentId: "gateway", paymentState: "recorded", proof: { proofType: "circle_gateway", paymentState: "recorded", txHash: validTx } },
      { intentId: "pending", paymentState: "recorded", proof: { proofType: "arc_tx", paymentState: "recorded", txHash: "not-a-hash" } },
      { intentId: "local", paymentState: "recorded", proof: { proofType: "local", paymentState: "recorded", txHash: null } },
    ],
  };
  const model = buildNanoRunHistoryModel({
    wallet: "0x1111111111111111111111111111111111111111",
    budgets: [budget],
    activities: { [budget.budgetId]: activity },
  });

  assert.equal(model.runCards[0].verifiedReceiptCount, "0");
  assert.notEqual(model.runCards[0].sourceStatus, "Paid with proof");
});

test("Nano receipt detail only links valid transaction hashes and preserves missing detail fallback", () => {
  const validTx = `0x${"e".repeat(64)}`;
  const missing = buildNanoReceiptDetailModel(null, "nano_budget_missing");
  assert.equal(missing.available, false);
  assert.equal(missing.body, "Receipt detail unavailable from the current router response.");

  const detail = buildNanoReceiptDetailModel({
    budget: { budgetId: "nano_budget_detail" },
    spendIntents: [
      {
        intentId: "intent_verified",
        payee: { label: "Source unlock", walletAddress: "0x2222222222222222222222222222222222222222" },
        amount: 0.05,
        reason: "Adds source-backed context.",
        status: "payment_recorded",
      },
      {
        intentId: "intent_fake_hash",
        payee: { label: "Hook agent", walletAddress: null },
        amount: 0.02,
        reason: "Makes the brief easier to read.",
        status: "payment_recorded",
      },
    ],
    receipts: [
      {
        receiptId: "receipt_verified",
        intentId: "intent_verified",
        paymentState: "recorded",
        contributionSummary: "Verified source unlock improved the brief.",
        proof: { proofType: "arc_tx", paymentState: "recorded", txHash: validTx },
      },
      {
        receiptId: "receipt_invalid",
        intentId: "intent_fake_hash",
        paymentState: "recorded",
        proof: { proofType: "arc_tx", paymentState: "recorded", txHash: "0x123" },
      },
    ],
  }, "nano_budget_detail");

  assert.equal(detail.available, true);
  assert.equal(detail.rows.length, 2);
  assert.equal(detail.rows[0].proofState, "Paid with proof");
  assert.match(detail.rows[0].txLink, /testnet\.arcscan\.app/);
  assert.equal(detail.rows[0].contributionSummary, "Verified source unlock improved the brief.");
  assert.equal(detail.rows[1].proofState, "Proof pending");
  assert.equal(detail.rows[1].txLink, null);
});

test("Nano receipt detail does not invent source or result details", () => {
  const detail = buildNanoReceiptDetailModel({
    budget: { budgetId: "nano_budget_detail" },
    spendIntents: [
      {
        intentId: "intent_without_receipt",
        payee: { label: "Source unlock", walletAddress: null },
        amount: 0.05,
        reason: "",
        status: "approved",
      },
    ],
    receipts: [],
  }, "nano_budget_detail");

  assert.equal(detail.rows[0].reason, "No reason recorded.");
  assert.equal(detail.rows[0].contributionSummary, "");
  assert.equal(detail.rows[0].txLink, null);
  assert.equal(detail.rows[0].proofState, "Approved, not paid yet");
});

test("Nano selected run label uses a real budget id safely", () => {
  const empty = buildNanoSelectedRunModel({});
  assert.equal(empty.active, false);
  assert.equal(empty.label, "New Nano run");

  const selected = buildNanoSelectedRunModel({
    selectedBudgetId: "nano_budget_abcdefghijklmnopqrstuvwxyz",
    budget: { budgetId: "nano_budget_abcdefghijklmnopqrstuvwxyz" },
    activity: { receipts: [] },
  });

  assert.equal(selected.active, true);
  assert.equal(selected.label, "Viewing Nano run: nano_b...wxyz");
  assert.equal(selected.helper, "Continuing from router-backed run state.");
  assert.equal(selected.detailAvailable, true);
  assert.doesNotMatch(`${selected.label} ${selected.helper}`, /judge/i);
});

test("Nano selected run reports unavailable detail without inventing state", () => {
  const selected = buildNanoSelectedRunModel({
    selectedBudgetId: "nano_budget_missing",
    budget: { budgetId: "nano_budget_missing" },
    activity: null,
  });

  assert.equal(selected.active, true);
  assert.equal(selected.helper, "Run detail unavailable from the current router response.");
  assert.equal(selected.detailAvailable, false);
});

test("Nano run card exposes Continue run only for real budget cards", () => {
  const disconnected = buildNanoRunHistoryModel({ wallet: "", budgets: [{ budgetId: "budget_1" }] });
  assert.deepEqual(disconnected.runCards, []);

  const connected = buildNanoRunHistoryModel({
    wallet: "0x1111111111111111111111111111111111111111",
    budgets: [{ budgetId: "budget_1", runId: "run_1", goal: "Run", amount: 1, status: "draft" }],
  });
  assert.equal(connected.runCards.length, 1);
  assert.equal(connected.runCards[0].buttonLabel, "Continue run");
});

test("continued run with approved but unpaid source spend stays locked", () => {
  const intent = {
    intentId: "intent_source",
    status: "approved",
    amount: 0.05,
    reason: "Adds source-backed context.",
    payee: { payeeId: "source_unlock", label: "Source unlock", walletAddress: "0x2222222222222222222222222222222222222222" },
  };
  const source = buildNanoSourceUnlockPresentation({ hasBudget: true, intent, receipt: null });
  const result = buildNanoResultPreviewPresentation({ hasVerifiedSourceProof: false, sourceUnlock: source });

  assert.equal(source.canShowInResult, false);
  assert.equal(source.proofStatus, "Approved, not paid yet");
  assert.equal(result.paidSourceUsed, "Waiting for verified source proof");
});

test("continued run with rejected or local proof keeps source locked", () => {
  const intent = {
    intentId: "intent_source",
    status: "payment_recorded",
    amount: 0.05,
    reason: "Adds source-backed context.",
    payee: { payeeId: "source_unlock", label: "Source unlock", walletAddress: "0x2222222222222222222222222222222222222222" },
  };
  const rejected = buildNanoSourceUnlockPresentation({
    hasBudget: true,
    intent,
    receipt: {
      paymentState: "failed",
      proof: { proofType: "arc_tx", paymentState: "failed", txHash: `0x${"f".repeat(64)}` },
    },
  });
  const local = buildNanoSourceUnlockPresentation({
    hasBudget: true,
    intent,
    receipt: {
      paymentState: "recorded",
      proof: { proofType: "local", paymentState: "recorded", txHash: null },
    },
  });

  assert.equal(rejected.canShowInResult, false);
  assert.equal(rejected.proofStatus, "Proof rejected");
  assert.equal(local.canShowInResult, false);
  assert.equal(local.proofStatus, "Local receipt");
});

test("continued run with verified Arc proof unlocks source and result preview", () => {
  const intent = {
    intentId: "intent_source",
    status: "payment_recorded",
    amount: 0.05,
    reason: "Adds source-backed context.",
    payee: { payeeId: "source_unlock", label: "Source unlock", walletAddress: "0x2222222222222222222222222222222222222222" },
  };
  const source = buildNanoSourceUnlockPresentation({
    hasBudget: true,
    intent,
    receipt: {
      paymentState: "recorded",
      proof: { proofType: "arc_tx", paymentState: "recorded", txHash: `0x${"1".repeat(64)}` },
    },
  });
  const result = buildNanoResultPreviewPresentation({ goal: "Brief", hasVerifiedSourceProof: true, sourceUnlock: source });

  assert.equal(source.canShowInResult, true);
  assert.equal(source.proofStatus, "Paid with proof");
  assert.equal(result.status, "Source-backed preview");
  assert.equal(result.proofStatus, "Paid with proof");
  assert.match(result.body, /tiny payments/);
});

test("wallet-scoped dashboard separates buyer tasks owned agents and owned-agent earnings", () => {
  const scope = buildWalletScopedDashboardModel([
    { profile: { agentId: "mine", ownerWallet: "0xBuilder", publicName: "Mine" } },
    { profile: { agentId: "other", ownerWallet: "0xOther", publicName: "Other" } },
  ], {
    allOpenTasks: [
      { taskId: "buyer-task", creatorWallet: "0xbuilder", selectedAgentId: "other", participatingAgentIds: [] },
      { taskId: "agent-task", creatorWallet: "0xbuyer", selectedAgentId: "mine", participatingAgentIds: ["mine"] },
      { taskId: "other-task", creatorWallet: "0xother", selectedAgentId: "other", participatingAgentIds: ["other"] },
    ],
  }, "0xBuilder");

  assert.equal(scope.walletConnected, true);
  assert.deepEqual(scope.ownedAgents.map((agent) => agent.profile.agentId), ["mine"]);
  assert.deepEqual(scope.walletTaskCollections.allOpenTasks.map((task) => task.taskId), ["buyer-task"]);
  assert.deepEqual(scope.earningsTaskCollections.allOpenTasks.map((task) => task.taskId), ["agent-task"]);
  assert.deepEqual(scope.attentionTasks.map((task) => task.taskId), ["buyer-task", "agent-task"]);
  assert.equal(scope.tasksOwnershipAvailable, true);
  assert.equal(scope.agentsOwnershipAvailable, true);
  assert.equal(scope.earningsOwnershipAvailable, true);
});

test("wallet-scoped dashboard fails closed when ownership fields are incomplete", () => {
  const scope = buildWalletScopedDashboardModel([
    { profile: { agentId: "mine", ownerWallet: "0xbuilder" } },
    { profile: { agentId: "unknown-owner" } },
  ], {
    activeTasks: [
      { taskId: "mine", creatorWallet: "0xbuilder", selectedAgentId: "mine", participatingAgentIds: ["mine"] },
      { taskId: "unknown-creator", selectedAgentId: "unknown-owner", participatingAgentIds: ["unknown-owner"] },
    ],
  }, "0xbuilder");

  assert.deepEqual(scope.ownedAgents.map((agent) => agent.profile.agentId), ["mine"]);
  assert.deepEqual(scope.walletTaskCollections.activeTasks.map((task) => task.taskId), ["mine"]);
  assert.deepEqual(scope.earningsTaskCollections.activeTasks.map((task) => task.taskId), ["mine"]);
  assert.equal(scope.tasksOwnershipAvailable, false);
  assert.equal(scope.agentsOwnershipAvailable, false);
  assert.equal(scope.earningsOwnershipAvailable, false);
});

test("wallet-scoped dashboard exposes no private rows without a connected wallet", () => {
  const scope = buildWalletScopedDashboardModel([
    { profile: { agentId: "mine", ownerWallet: "0xbuilder" } },
  ], {
    myPostedTasks: [
      { taskId: "mine", creatorWallet: "0xbuilder", selectedAgentId: "mine", participatingAgentIds: ["mine"] },
    ],
  });

  assert.equal(scope.walletConnected, false);
  assert.deepEqual(scope.ownedAgents, []);
  assert.deepEqual(scope.walletTaskCollections.myPostedTasks, []);
  assert.deepEqual(scope.earningsTaskCollections.myPostedTasks, []);
  assert.deepEqual(scope.attentionTasks, []);
});

test("builder agent rows expose packages and honest missing metric fallbacks", () => {
  const model = buildAgentBuilderDashboardModel([
    {
      profile: { agentId: "thread", publicName: "Thread Writer", slug: "thread-writer", originType: "platform", skills: ["thread writing"] },
      performanceSummary: { status: "active" },
    },
  ], {});
  const row = model.agentRows[0];

  assert.equal(row.name, "Thread Writer");
  assert.equal(row.packageSummary, "Packages from 10 USDC");
  assert.equal(row.completedTasksDisplay, "0");
  assert.equal(row.totalEarnedDisplay, "0 USDC");
  assert.equal(row.approvalRateDisplay, "Not enough data yet");
  assert.equal(row.readinessLabel, "Limited data");
  assert.equal(row.verificationNextAction, "Wait for first completed task");
});

test("builder attention items include submitted revision and disputed tasks", () => {
  const agent = {
    profile: { agentId: "agent_1", publicName: "Research Brief", slug: "research-brief", originType: "platform", skills: ["research"] },
    performanceSummary: {},
  };
  const items = buildAgentAttentionItems(agent, {
    activeTasks: [
      { taskId: "assigned", title: "Assigned work", status: "ASSIGNED", selectedAgentId: "agent_1", transactionState: "accepted", settlementState: "reward_funded", onchainTaskRef: "0xescrow:assigned", reviewActions: [] },
      { taskId: "submitted", title: "Submitted work", status: "SUBMITTED", resultStatus: "submitted", selectedAgentId: "agent_1", transactionState: "accepted", settlementState: "reward_funded", onchainTaskRef: "0xescrow:submitted", reviewActions: ["approve"] },
      { taskId: "revision", title: "Revision work", status: "SUBMITTED", resultStatus: "submitted", selectedAgentId: "agent_1", transactionState: "accepted", settlementState: "reward_funded", onchainTaskRef: "0xescrow:revision", revisionRequests: [{ changeRequest: "Fix structure" }], reviewActions: [] },
      { taskId: "disputed", title: "Disputed work", status: "SUBMITTED", resultStatus: "submitted", selectedAgentId: "agent_1", transactionState: "accepted", settlementState: "reward_funded", onchainTaskRef: "0xescrow:disputed", disputeRecords: [{ reason: "Quality", details: "Low quality" }], reviewActions: [] },
    ],
  });

  assert.equal(items.length, 4);
  assert.deepEqual(items.map((item) => item.statusLabel), ["Agent Assigned", "Submitted", "Revision Requested", "Disputed"]);
});

test("builder attention items return empty state safely", () => {
  const items = buildAgentAttentionItems({
    profile: { agentId: "agent_empty", publicName: "Empty Agent", slug: "empty-agent" },
    performanceSummary: {},
  }, {
    completedTasks: [
      { taskId: "done", title: "Done", status: "SETTLED", selectedAgentId: "agent_empty" },
    ],
  });

  assert.deepEqual(items, []);
});

test("agent earnings summary separates settled pending and disputed values", () => {
  const agents = [
    {
      profile: { agentId: "agent_1", publicName: "Thread Writer", slug: "thread-writer", originType: "platform", skills: ["thread"] },
      performanceSummary: { paidEarnings: 30, paidTasksCompleted: 2, approvalRate: 0.8, tasksAttempted: 3 },
    },
  ];
  const model = buildAgentEarningsDashboardModel(agents, {
    activeTasks: [
      { taskId: "pending", title: "Pending", status: "SUBMITTED", selectedAgentId: "agent_1", rewardAmount: 12, transactionState: "accepted", settlementState: "reward_funded", onchainTaskRef: "0xescrow:pending", reviewActions: [] },
      { taskId: "dispute", title: "Dispute", status: "SUBMITTED", selectedAgentId: "agent_1", rewardAmount: 7, transactionState: "accepted", settlementState: "reward_funded", onchainTaskRef: "0xescrow:dispute", disputeRecords: [{ reason: "Quality", details: "Weak" }], reviewActions: [] },
    ],
  });

  assert.equal(model.summary.settledEarningsDisplay, "30 USDC");
  assert.equal(model.summary.pendingLockedDisplay, "12 USDC");
  assert.equal(model.summary.disputedLockedDisplay, "7 USDC");
  assert.equal(model.summary.averagePaidTaskValueDisplay, "15 USDC");
});

test("agent earnings breakdown uses honest fallbacks with no paid work", () => {
  const breakdown = buildAgentEarningsBreakdown({
    profile: { agentId: "agent_empty", publicName: "New Agent", slug: "new-agent", originType: "external", skills: [] },
    performanceSummary: {},
  }, {});

  assert.equal(breakdown.settledEarningsDisplay, "No settled earnings yet");
  assert.equal(breakdown.paidTasksDisplay, "No paid tasks completed yet");
  assert.equal(breakdown.pendingLockedDisplay, "Pending value appears after funded assigned tasks exist.");
  assert.equal(breakdown.averagePaidTaskValueDisplay, "Waiting for first approved task");
});

test("earnings activity rows use strict transaction links and clean date fallbacks", () => {
  const validTx = `0x${"d".repeat(64)}`;
  const rows = buildEarningsActivityRows(
    [{ profile: { agentId: "agent_1", publicName: "Thread Writer" }, performanceSummary: {} }],
    {
      activeTasks: [
        { taskId: "funded", title: "Funded task", status: "SUBMITTED", selectedAgentId: "agent_1", rewardAmount: 10, transactionState: "accepted", settlementState: "reward_funded", onchainTaskRef: "0xescrow:funded", latestFundTxHash: "0x1234", reviewActions: [] },
        { taskId: "settled", title: "Settled task", status: "SETTLED", selectedAgentId: "agent_1", rewardAmount: 20, transactionState: "accepted", settlementState: "settled", onchainTaskRef: "0xescrow:settled", latestSettlement: { outcome: "paid", txReference: validTx, settlementTimestamp: "2026-04-03T10:00:00.000Z" }, reviewActions: [] },
      ],
    },
  );

  assert.equal(rows.length, 2);
  assert.equal(rows.find((item) => item.taskId === "funded").txLink, null);
  assert.equal(rows.find((item) => item.taskId === "funded").dateLabel, "Waiting for update");
  assert.equal(rows.find((item) => item.taskId === "settled").txLink, `https://testnet.arcscan.app/tx/${validTx}`);
});

test("empty tasks create no fake earnings activity rows", () => {
  const rows = buildEarningsActivityRows([
    { profile: { agentId: "agent_1", publicName: "Thread Writer" }, performanceSummary: { paidEarnings: 100 } },
  ], {});

  assert.deepEqual(rows, []);
});

test("suggested template mapping follows agent specialty without inventing agents", () => {
  const summarizer = buildSuggestedTaskTemplatesForAgent({
    profile: {
      publicName: "Summarizer",
      slug: "summarizer",
      category: "summarization",
      skills: ["summarization"],
      capabilityTags: [],
    },
  });
  const research = buildSuggestedTaskTemplatesForAgent({
    profile: {
      publicName: "Research Brief",
      slug: "research-brief",
      category: "research",
      skills: ["research"],
      capabilityTags: [],
    },
  });

  assert.deepEqual(summarizer.map((template) => template.id), ["summarize_article", "rewrite_content"]);
  assert.deepEqual(research.map((template) => template.id), ["research_project", "summarize_article"]);
});

test("recent work uses task summaries and safe titles instead of full private content", () => {
  const items = buildRecentAgentWork(
    {
      profile: { agentId: "agent_1" },
    },
    {
      completedTasks: [
        {
          taskId: "task_1",
          title: "Very long private customer migration analysis title that should be safely shortened before rendering on profile",
          category: "research",
          status: "SETTLED",
          resultStatus: "settled",
          rewardAmount: 12,
          settlementSummary: {
            settlementReadinessLabel: "Payment released.",
          },
          latestEvaluation: {
            overallScore: 86,
          },
          participatingAgentIds: ["agent_1"],
          createdAt: "2026-04-01T10:00:00.000Z",
          updatedAt: "2026-04-03T10:00:00.000Z",
        },
      ],
      rejectedTasks: [],
      disputedTasks: [],
    },
  );

  assert.equal(items.length, 1);
  assert.equal(items[0].approvalIndicator, "Paid");
  assert.ok(items[0].title.endsWith("..."));
  assert.equal(items[0].category, "Research");
  assert.equal(items[0].rewardAmount, 12);
  assert.equal(items[0].evaluationScore, 86);
  assert.equal(items[0].settlementStatus, "Payment released.");
});

test("task lifecycle marks approved funded work as settlement ready before payout", () => {
  const model = buildTaskLifecycleModel({
    taskId: "task_1",
    status: "APPROVED",
    resultStatus: "approved",
    transactionState: "accepted",
    settlementState: "pending_settlement",
    onchainTaskRef: "0xescrow:task_1",
    rewardAmount: 5,
    createdAt: "2026-04-01T10:00:00.000Z",
    updatedAt: "2026-04-03T10:00:00.000Z",
    selectedAgents: [{ agentId: "agent_1", displayName: "Thread Writer", originType: "platform" }],
    participatingAgentIds: ["agent_1"],
    reviewActions: ["settle"],
    timeline: [],
  });

  assert.equal(model.fundingLabel, "Funded");
  assert.equal(model.evaluationLabel, "Approved");
  assert.equal(model.settlementLabel, "Ready for settlement");
  assert.equal(model.settlementMessage, "Approval is complete. You can release payment.");
  assert.equal(model.paymentStateLabel, "Ready to release");
  assert.equal(model.primaryAction.label, "Release payment");
  assert.equal(model.nextActor, "Task owner");
});

test("task lifecycle marks refunded work as closed with reward refunded", () => {
  const model = buildTaskLifecycleModel({
    taskId: "task_2",
    status: "REFUNDED",
    resultStatus: "rejected",
    transactionState: "accepted",
    settlementState: "refunded",
    onchainTaskRef: "0xescrow:task_2",
    rewardAmount: 3,
    createdAt: "2026-04-01T10:00:00.000Z",
    updatedAt: "2026-04-03T10:00:00.000Z",
    selectedAgents: [],
    participatingAgentIds: [],
    reviewActions: [],
    latestSettlement: {
      settlementId: "set_1",
      grossReward: 3,
      platformFee: 0,
      agentPayout: 0,
      refundAmount: 3,
      settlementTimestamp: "2026-04-03T10:00:00.000Z",
      txReference: null,
      outcome: "refunded",
    },
    timeline: [],
  });

  assert.equal(model.settlementLabel, "Reward refunded");
  assert.equal(model.settlementMessage, "Reward refunded.");
  assert.equal(model.paymentStateLabel, "Reward refunded");
  assert.equal(model.primaryAction.label, "View Task");
  assert.equal(model.steps.at(-1).label, "Completed");
});

test("task status display maps raw lifecycle states into user-facing labels", () => {
  const cases = [
    [
      "draft",
      { taskId: "draft", status: "DRAFT", transactionState: "", settlementState: "", reviewActions: [], timeline: [] },
      { label: "Draft", cta: "Fund Task", actor: "Task owner", step: "posted" },
    ],
    [
      "waiting funding",
      { taskId: "funding", status: "DRAFT", transactionState: "pending_chain", reviewActions: [], timeline: [] },
      { label: "Waiting for Funding", cta: "Waiting for Funding", actor: "Task owner", step: "funding" },
    ],
    [
      "funded",
      { taskId: "funded", status: "OPEN", transactionState: "accepted", settlementState: "reward_funded", onchainTaskRef: "0xescrow:funded", reviewActions: [], timeline: [] },
      { label: "Funded", cta: "Assign Agent", actor: "Marketplace", step: "funding" },
    ],
    [
      "assigned",
      { taskId: "assigned", status: "ASSIGNED", transactionState: "accepted", settlementState: "reward_funded", onchainTaskRef: "0xescrow:assigned", selectedAgents: [{ displayName: "Thread Writer", originType: "platform" }], reviewActions: [], timeline: [] },
      { label: "Agent Assigned", cta: "Waiting for Agent", actor: "Assigned agent", step: "assigned" },
    ],
    [
      "in progress",
      { taskId: "running", status: "EXECUTING", resultStatus: "in_progress", transactionState: "accepted", settlementState: "reward_funded", onchainTaskRef: "0xescrow:running", selectedAgents: [{ displayName: "Thread Writer", originType: "platform" }], reviewActions: [], timeline: [] },
      { label: "In Progress", cta: "Waiting for Agent", actor: "Assigned agent", step: "in_progress" },
    ],
    [
      "submitted",
      { taskId: "submitted", status: "SUBMITTED", resultStatus: "submitted", transactionState: "accepted", settlementState: "reward_funded", onchainTaskRef: "0xescrow:submitted", reviewActions: ["approve", "reject"], timeline: [] },
      { label: "Submitted", cta: "Review Submission", actor: "Task owner", step: "submitted" },
    ],
    [
      "in review",
      { taskId: "review", status: "UNDER_REVIEW", resultStatus: "submitted", transactionState: "accepted", settlementState: "reward_funded", onchainTaskRef: "0xescrow:review", latestEvaluation: { overallScore: 80 }, reviewActions: ["approve", "reject"], timeline: [] },
      { label: "In Review", cta: "Review Submission", actor: "Task owner", step: "review" },
    ],
    [
      "approved",
      { taskId: "approved", status: "APPROVED", resultStatus: "approved", transactionState: "accepted", settlementState: "pending_settlement", onchainTaskRef: "0xescrow:approved", reviewActions: ["settle"], timeline: [] },
      { label: "Approved", cta: "Release payment", actor: "Task owner", step: "approved" },
    ],
    [
      "released",
      { taskId: "paid", status: "SETTLED", resultStatus: "settled", transactionState: "accepted", settlementState: "settled", onchainTaskRef: "0xescrow:paid", latestSettlement: { outcome: "paid", txReference: null }, reviewActions: [], timeline: [] },
      { label: "Payment released", cta: "View Completed Work", actor: "No action needed", step: "payment" },
    ],
    [
      "disputed",
      { taskId: "dispute", status: "DISPUTED", transactionState: "accepted", settlementState: "disputed", onchainTaskRef: "0xescrow:dispute", reviewActions: ["appeal"], timeline: [] },
      { label: "Disputed", cta: "View Dispute", actor: "Task owner", step: "review" },
    ],
    [
      "cancelled",
      { taskId: "cancelled", status: "CANCELLED", transactionState: "accepted", settlementState: "cancelled", reviewActions: [], timeline: [] },
      { label: "Cancelled", cta: "View Task", actor: "No action needed", step: "completed" },
    ],
    [
      "unknown",
      { taskId: "unknown", status: "", transactionState: "", settlementState: "", reviewActions: [], timeline: [] },
      { label: "Unknown", cta: "Fund Task", actor: "Task owner", step: "posted" },
    ],
  ];

  for (const [name, task, expected] of cases) {
    const model = buildTaskStatusDisplayModel(task);
    assert.equal(model.label, expected.label, name);
    assert.equal(model.primaryCtaText, expected.cta, name);
    assert.equal(model.whoActsNext, expected.actor, name);
    assert.equal(model.lifecycleStepAlignment, expected.step, name);
  }
});

test("task status display prefers terminal payment evidence over incomplete raw status", () => {
  const model = buildTaskStatusDisplayModel({
    taskId: "conflict",
    status: "SUBMITTED",
    resultStatus: "submitted",
    transactionState: "accepted",
    settlementState: "reward_funded",
    onchainTaskRef: "0xescrow:conflict",
    latestSettlement: {
      outcome: "paid",
      txReference: `0x${"c".repeat(64)}`,
      settlementTimestamp: "2026-04-03T10:00:00.000Z",
    },
    reviewActions: ["approve", "reject"],
    timeline: [],
  });

  assert.equal(model.label, "Payment released");
  assert.equal(model.primaryCtaText, "View Completed Work");
  assert.equal(model.actionableBy, "none");
});

test("task brief template list includes the supported first-pass templates", () => {
  assert.deepEqual(
    taskBriefTemplates.map((template) => template.id),
    [
      "write_x_thread",
      "summarize_article",
      "debug_code",
      "research_project",
      "rewrite_content",
      "custom_task",
    ],
  );
  assert.equal(getTaskBriefTemplate("missing").id, "custom_task");
});

test("task brief generation is deterministic for each structured template", () => {
  const examples = {
    write_x_thread: {
      topic: "Arc stablecoin payments",
      audience: "crypto founders",
      tone: "clear and energetic",
      keyPoints: "Fast settlement\nUSDC-native gas\nAgent marketplace",
      referenceLinks: "https://example.com",
      tweetCount: "8",
      cta: "Try Dispatch",
    },
    summarize_article: {
      article: "https://example.com/article",
      summaryStyle: "executive",
      length: "short",
      mainPoints: "market, risk, adoption",
      audience: "operators",
    },
    debug_code: {
      techStack: "Node + Vite",
      errorMessage: "Cannot resolve module",
      expectedBehavior: "Build should pass",
      actualBehavior: "Build fails",
      codeSnippet: "import x from 'y'",
      alreadyTried: "Reinstalled packages",
    },
    research_project: {
      projectName: "Dispatch",
      links: "https://dispatch.example",
      researchGoal: "Assess agent marketplace positioning",
      whatToCompare: "competitors",
      outputFormat: "brief",
      risksToCover: "payment, adoption",
    },
    rewrite_content: {
      originalText: "rough words",
      targetTone: "premium",
      audience: "web3 users",
      length: "short",
      whatToImprove: "clarity and flow",
    },
  };

  for (const template of taskBriefTemplates.filter((item) => item.id !== "custom_task")) {
    const result = buildTaskTemplateBrief(template.id, examples[template.id]);
    assert.equal(result.missingFields.length, 0, template.id);
    assert.match(result.brief, new RegExp(`Task Type: ${template.name}`));
    assert.match(result.brief, /Expected output:/);
    assert.equal(result.brief, buildTaskTemplateBrief(template.id, examples[template.id]).brief);
  }
});

test("custom task template preserves blank composer behavior", () => {
  const result = buildTaskTemplateBrief("custom_task", { topic: "Ignored" });
  assert.equal(result.isCustom, true);
  assert.equal(result.brief, "");
  assert.equal(result.missingFields.length, 0);
});

test("task brief generation reports missing required fields with safe fallbacks", () => {
  const result = buildTaskTemplateBrief("write_x_thread", {
    topic: "Arc payments",
    audience: "",
    tone: "direct",
    keyPoints: "",
    tweetCount: "6",
  });

  assert.deepEqual(result.missingFields, ["Audience", "Key points"]);
  assert.match(result.brief, /Audience:\nNot provided yet/);
  assert.match(result.brief, /Key points:\nNot provided yet/);
});

test("task lifecycle exposes clear owner review action for submitted work", () => {
  const model = buildTaskLifecycleModel({
    taskId: "task_submitted",
    status: "SUBMITTED",
    resultStatus: "submitted",
    transactionState: "accepted",
    settlementState: "reward_funded",
    onchainTaskRef: "0xescrow:task_submitted",
    rewardAmount: 10,
    createdAt: "2026-04-01T10:00:00.000Z",
    updatedAt: "2026-04-03T10:00:00.000Z",
    selectedAgents: [{ agentId: "agent_thread", displayName: "Thread Writer", originType: "platform" }],
    participatingAgentIds: ["agent_thread"],
    reviewActions: ["approve", "reject"],
    timeline: [],
  });

  assert.equal(model.reviewStateLabel, "Needs owner review");
  assert.equal(model.paymentStateLabel, "Payment locked");
  assert.equal(model.primaryAction.label, "Review Submission");
  assert.equal(model.nextActor, "Task owner");
});

test("review panel offers approve and request revision for submitted work", () => {
  const model = buildReviewPanelModel({
    taskId: "task_review_actions",
    status: "SUBMITTED",
    resultStatus: "submitted",
    reviewActions: ["approve", "reject"],
    latestEvaluation: {
      overallScore: 72,
    },
  });

  assert.deepEqual(model.primaryActions, ["approve", "request_revision"]);
  assert.ok(!model.primaryActions.includes("reject"));
  assert.match(model.headline, /approve or request changes/);
});

test("revision requested keeps payment locked and shifts action back to the agent", () => {
  const revision = {
    id: "revision_1",
    changeRequest: "Tighten the CTA and make the hook less generic.",
    missingDetails: "Suggested visuals were missing.",
    extraInstruction: "Keep the thread crypto-native.",
    requestedAt: "2026-04-03T10:00:00.000Z",
    requestedBy: "0xowner",
  };
  const task = {
    taskId: "task_revision",
    status: "SUBMITTED",
    resultStatus: "submitted",
    transactionState: "accepted",
    settlementState: "reward_funded",
    onchainTaskRef: "0xescrow:task_revision",
    rewardAmount: 10,
    revisionRequests: [revision],
    selectedAgents: [{ agentId: "agent_thread", displayName: "Thread Writer", originType: "platform" }],
    participatingAgentIds: ["agent_thread"],
    reviewActions: ["approve", "reject"],
    timeline: [],
  };
  const lifecycle = buildTaskLifecycleModel(task);
  const payment = buildTaskPaymentDisplayModel(task);
  const revisionModel = buildTaskRevisionDisplayModel(task);
  const reviewModel = buildReviewPanelModel(task);

  assert.equal(lifecycle.statusDisplay.label, "Revision Requested");
  assert.equal(lifecycle.reviewStateLabel, "Revision requested");
  assert.equal(lifecycle.primaryAction.label, "Waiting for Revision");
  assert.equal(lifecycle.nextActor, "Assigned agent");
  assert.equal(payment.label, "Waiting for changes");
  assert.equal(payment.description, "Payment remains locked until the work is approved.");
  assert.equal(payment.settlementTxLink, null);
  assert.equal(revisionModel.hasRevisionRequested, true);
  assert.equal(revisionModel.items[0].changeRequest, revision.changeRequest);
  assert.deepEqual(reviewModel.primaryActions, []);
});

test("revision display uses safe fallbacks when details are thin", () => {
  const model = buildTaskRevisionDisplayModel({
    taskId: "task_revision_fallback",
    revisionRequests: [{ id: "revision_empty" }],
  });

  assert.equal(model.hasRevisionRequested, true);
  assert.equal(model.items[0].changeRequest, "Revision details were not provided.");
  assert.equal(model.items[0].missingDetails, "Not specified.");
  assert.equal(model.items[0].requestedBy, "Task owner");
});

test("local dispute maps task status and payment into locked under-review state", () => {
  const dispute = {
    id: "dispute_1",
    reason: "Agent did not follow revision request",
    details: "The revised output still ignored the required CTA.",
    requestedResolution: "Request platform review",
    status: "under_review",
    openedAt: "2026-04-04T10:00:00.000Z",
    openedBy: "0xowner",
  };
  const task = {
    taskId: "task_dispute_local",
    status: "SUBMITTED",
    resultStatus: "submitted",
    transactionState: "accepted",
    settlementState: "reward_funded",
    onchainTaskRef: "0xescrow:task_dispute_local",
    rewardAmount: 10,
    disputeRecords: [dispute],
    reviewActions: ["approve", "reject", "settle"],
    timeline: [],
  };
  const lifecycle = buildTaskLifecycleModel(task);
  const payment = buildTaskPaymentDisplayModel(task);
  const disputeModel = buildTaskDisputeDisplayModel(task);
  const reviewModel = buildReviewPanelModel(task);

  assert.equal(lifecycle.statusDisplay.label, "Disputed");
  assert.equal(lifecycle.paymentStateLabel, "Payment locked during dispute");
  assert.equal(lifecycle.primaryAction.label, "View Dispute");
  assert.equal(payment.label, "Disputed");
  assert.equal(payment.description, "Payment remains locked during dispute.");
  assert.equal(payment.fundingTxLink, null);
  assert.equal(payment.settlementTxLink, null);
  assert.equal(disputeModel.hasOpenDispute, true);
  assert.equal(disputeModel.items[0].reason, dispute.reason);
  assert.deepEqual(reviewModel.primaryActions, []);
  assert.ok(!reviewModel.advancedActions.includes("dispute"));
});

test("dispute display uses clean fallback values when details are missing", () => {
  const model = buildTaskDisputeDisplayModel({
    taskId: "task_dispute_fallback",
    disputeRecords: [{ id: "dispute_empty" }],
  });

  assert.equal(model.hasOpenDispute, true);
  assert.equal(model.items[0].reason, "Dispute reason not provided.");
  assert.equal(model.items[0].details, "No evidence details provided yet.");
  assert.equal(model.items[0].requestedResolution, "Request platform review");
  assert.equal(model.items[0].statusLabel, "Under Review");
});

test("task lifecycle keeps waiting stages explicit while agent works", () => {
  const model = buildTaskLifecycleModel({
    taskId: "task_executing",
    status: "EXECUTING",
    resultStatus: "in_progress",
    transactionState: "accepted",
    settlementState: "reward_funded",
    onchainTaskRef: "0xescrow:task_executing",
    rewardAmount: 10,
    createdAt: "2026-04-01T10:00:00.000Z",
    updatedAt: "2026-04-03T10:00:00.000Z",
    selectedAgents: [{ agentId: "agent_thread", displayName: "Thread Writer", originType: "platform" }],
    participatingAgentIds: ["agent_thread"],
    reviewActions: [],
    timeline: [],
  });

  assert.equal(model.reviewStateLabel, "No submission yet");
  assert.equal(model.primaryAction.label, "Waiting for Agent");
  assert.equal(model.primaryAction.disabled, true);
  assert.equal(model.nextActor, "Assigned agent");
});

test("payment display marks an unfunded task without inventing transaction links", () => {
  const model = buildTaskPaymentDisplayModel({
    taskId: "task_unfunded",
    status: "DRAFT",
    transactionState: "pending_wallet",
    rewardAmount: 10,
    reviewActions: [],
    timeline: [],
  });

  assert.equal(model.label, "Waiting for payment update");
  assert.equal(model.amountDisplay, "10 USDC");
  assert.equal(model.networkDisplay, "Arc Testnet");
  assert.equal(model.fundingTxLink, null);
  assert.equal(model.settlementTxLink, null);
});

test("payment display shows funded work locked until output approval", () => {
  const model = buildTaskPaymentDisplayModel({
    taskId: "task_funded",
    status: "EXECUTING",
    resultStatus: "in_progress",
    transactionState: "accepted",
    settlementState: "reward_funded",
    onchainTaskRef: "0xescrow:task_funded",
    rewardAmount: 12,
    reviewActions: [],
    timeline: [],
  });

  assert.equal(model.label, "Payment locked");
  assert.equal(model.description, "USDC stays locked until approval.");
  assert.equal(model.nextPaymentAction, "Waiting for agent submission.");
});

test("payment display shows submitted funded work waiting on owner review", () => {
  const model = buildTaskPaymentDisplayModel({
    taskId: "task_submitted_payment",
    status: "SUBMITTED",
    resultStatus: "submitted",
    transactionState: "accepted",
    settlementState: "reward_funded",
    onchainTaskRef: "0xescrow:task_submitted_payment",
    rewardAmount: 10,
    reviewActions: ["approve", "reject"],
    timeline: [],
  });

  assert.equal(model.label, "Payment locked");
  assert.equal(model.description, "Payment only moves after approval.");
  assert.equal(model.nextPaymentAction, "Review the submitted work.");
});

test("payment display shows approved funded work ready to release", () => {
  const model = buildTaskPaymentDisplayModel({
    taskId: "task_ready_payment",
    status: "APPROVED",
    resultStatus: "approved",
    transactionState: "accepted",
    settlementState: "pending_settlement",
    onchainTaskRef: "0xescrow:task_ready_payment",
    rewardAmount: 10,
    reviewActions: ["settle"],
    timeline: [],
  });

  assert.equal(model.label, "Ready to release");
  assert.equal(model.description, "Approval is complete. You can release payment.");
  assert.equal(model.nextPaymentAction, "Release payment.");
});

test("payment display shows released payment and settlement transaction link", () => {
  const txHash = `0x${"a".repeat(64)}`;
  const model = buildTaskPaymentDisplayModel({
    taskId: "task_paid",
    status: "SETTLED",
    resultStatus: "settled",
    transactionState: "accepted",
    settlementState: "settled",
    onchainTaskRef: "0xescrow:task_paid",
    rewardAmount: 10,
    latestSettlement: {
      outcome: "paid",
      txReference: txHash,
      settlementTimestamp: "2026-04-03T10:00:00.000Z",
    },
    reviewActions: [],
    timeline: [],
  });

  assert.equal(model.label, "Released");
  assert.equal(model.nextPaymentAction, "No payment action needed.");
  assert.equal(model.settlementTxLink, `https://testnet.arcscan.app/tx/${txHash}`);
});

test("payment display uses safe fallback when amount and state are unknown", () => {
  const model = buildTaskPaymentDisplayModel({
    taskId: "task_unknown",
    status: "",
    transactionState: "",
    settlementState: "",
    reviewActions: [],
    timeline: [],
  });

  assert.equal(model.label, "Payment not funded");
  assert.equal(model.amountDisplay, "Not available yet");
  assert.equal(model.description, "Fund the task before work starts.");
});

test("Arc transaction links are only generated for valid hashes", () => {
  const txHash = `0x${"b".repeat(64)}`;
  assert.equal(buildArcTransactionLink(txHash), `https://testnet.arcscan.app/tx/${txHash}`);
  assert.equal(buildArcTransactionLink("missing_fund:task_1"), null);
  assert.equal(buildArcTransactionLink("0x1234"), null);
});

test("Nano tx hash display requires a real valid Arc transaction hash", () => {
  const txHash = `0x${"9".repeat(64)}`;
  assert.equal(buildArcTransactionLink(txHash), `https://testnet.arcscan.app/tx/${txHash}`);
  assert.equal(buildArcTransactionLink(""), null);
  assert.equal(buildArcTransactionLink("0xnot_real"), null);
  assert.equal(buildArcTransactionLink("local_receipt_only"), null);
});

test("task lifecycle prefers backend settlement summaries for refund-ready and disputed messaging", () => {
  const refundModel = buildTaskLifecycleModel({
    taskId: "task_refund_ready",
    status: "REJECTED",
    resultStatus: "rejected",
    transactionState: "accepted",
    settlementState: "pending_settlement",
    onchainTaskRef: "0xescrow:task_refund_ready",
    createdAt: "2026-04-01T10:00:00.000Z",
    updatedAt: "2026-04-03T10:00:00.000Z",
    settlementSummary: {
      settlementAvailable: true,
      settlementNextAction: "refund_reward",
      settlementReadinessLabel: "Rejected. Refund available.",
      canReleasePayment: false,
      canRefund: true,
      isFunded: true,
    },
    selectedAgents: [],
    participatingAgentIds: [],
    reviewActions: [],
    timeline: [],
  });

  const disputedModel = buildTaskLifecycleModel({
    taskId: "task_disputed",
    status: "DISPUTED",
    resultStatus: "disputed",
    transactionState: "accepted",
    settlementState: "disputed",
    onchainTaskRef: "0xescrow:task_disputed",
    createdAt: "2026-04-01T10:00:00.000Z",
    updatedAt: "2026-04-03T10:00:00.000Z",
    settlementSummary: {
      settlementAvailable: false,
      settlementNextAction: "dispute_review",
      settlementReadinessLabel: "Disputed. Settlement paused.",
      canReleasePayment: false,
      canRefund: false,
      isFunded: true,
    },
    selectedAgents: [],
    participatingAgentIds: [],
    reviewActions: [],
    timeline: [],
  });

  assert.equal(refundModel.settlementLabel, "Refund available");
  assert.equal(refundModel.settlementMessage, "Rejected. Refund available.");
  assert.equal(disputedModel.settlementMessage, "Disputed. Settlement paused.");
});

test("live Arc-submitted tasks disable Improve Again before it can hit submit_task", () => {
  const model = buildTaskResultModel(
    {
      taskId: "task_arc",
      status: "SUBMITTED",
      settlementState: "reward_funded",
      onchainTaskRef: "0xbd79cff0ff452b566f7c84ffc4dd4a2ee24c73eb:task_arc",
      structuredNotes: "Submitted result",
      selectedAgents: [{ originType: "platform" }],
    },
    [{
      runId: "run_arc",
      state: "completed",
      endpointUrl: "platform://thread-writer",
      updatedAt: "2026-04-03T10:00:00.000Z",
      rawPayload: {
        finalOutput: { summary: "Final", sections: [] },
      },
    }],
  );

  assert.equal(model.canImproveAgain, false);
  assert.match(model.improveAgainUnavailableReason, /cannot safely reopen execution/);
});
