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
  buildNanoBudgetStatusModel,
  buildNanoMetricsModel,
  buildNanoReceiptStatusModel,
  buildNanoSpendIntentStatusModel,
  getTaskBriefTemplate,
  taskBriefTemplates,
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

test("Nano local receipts are not labeled as settled payments", () => {
  const model = buildNanoReceiptStatusModel({
    paymentState: "recorded",
    proof: {
      proofType: "local",
      paymentState: "recorded",
      txHash: null,
    },
  });

  assert.equal(model.label, "Local proof");
  assert.match(model.helper, /not settlement/i);
});

test("Nano metrics use zero fallbacks without inventing payment data", () => {
  const model = buildNanoMetricsModel(null);

  assert.equal(model.budgetCount, "0");
  assert.equal(model.totalAuthorizedBudget, "0 USDC");
  assert.equal(model.totalRecordedPaymentValue, "0 USDC");
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
