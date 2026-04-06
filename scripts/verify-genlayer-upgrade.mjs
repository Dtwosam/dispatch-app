import assert from "node:assert/strict";
import { InMemoryRegistryStore } from "../apps/router/dist/db/store.js";
import { TaskMarketService } from "../apps/router/dist/services/taskMarketService.js";
import { SettlementService } from "../apps/router/dist/services/settlementService.js";
import { SafetyService } from "../apps/router/dist/services/safetyService.js";
import { EvaluationService } from "../apps/evaluator/dist/src/services/evaluationService.js";

const now = () => new Date().toISOString();

async function main() {
  await verifyConsensusEvaluation();
  await verifyUnresolvedAppealFlow();
  await verifySettlementPause();
  console.log("verify-genlayer-upgrade: ok");
}

async function verifyConsensusEvaluation() {
  const service = new EvaluationService();
  const result = await service.runFutureConsensus({
    taskId: "task_consensus_live",
    submissionIds: ["sub_live"],
    evaluationMode: "subjective_consensus",
    evaluationPath: "subjective_consensus",
    criteria: [
      { key: "completion", label: "Completion", weight: 0.25, description: "Did it finish the job?" },
      { key: "relevance", label: "Relevance", weight: 0.2, description: "Does it stay on task?" },
      { key: "correctness_proxy", label: "Correctness Proxy", weight: 0.2, description: "Is it plausible?" },
      { key: "formatting", label: "Formatting", weight: 0.15, description: "Does it follow the requested shape?" },
      { key: "usefulness", label: "Usefulness", weight: 0.2, description: "Would the buyer use it?" },
    ],
    reviewerType: "genlayer_subjective",
    taskSnapshot: {
      title: "Competitive memo",
      description: "Return a structured competitive memo with recommendation and risks.",
      appealRound: 0,
    },
    resultSnapshot: { agentId: "agent_fast" },
    outputSchema: { sections: ["summary", "risks", "recommendation"] },
    submissionPayload: {
      finalOutput: {
        sections: [
          { heading: "Summary", bullets: ["Competitor pressure is increasing."] },
          { heading: "Risks", bullets: ["Pricing confusion", "Weak proof"] },
          { heading: "Recommendation", bullets: ["Lead with clear proof and pricing clarity"] },
        ],
      },
    },
  });

  assert.ok(["accepted", "rejected", "disputed", "unresolved"].includes(result.finalOutcome));
  assert.equal(typeof result.consensusScore, "number");
  assert.equal(typeof result.validatorAgreement, "number");
  assert.equal(typeof result.consensusConfidence, "number");
  assert.ok(result.findings.length >= 3);
}

async function verifyUnresolvedAppealFlow() {
  const store = new InMemoryRegistryStore();
  seedPlatformAgent(store);
  let consensusCall = 0;
  const evaluatorClient = {
    async submitUserReview() {
      throw new Error("not used");
    },
    async runAssisted() {
      throw new Error("not used");
    },
    async runHybrid(request) {
      return this.runConsensus(request);
    },
    async runConsensus() {
      consensusCall += 1;
      return consensusCall === 1
        ? {
            evaluationId: "eval_unresolved",
            taskId: "task_case",
            winningSubmissionId: "submission_1",
            scores: [],
            summary: "Validator agreement was too weak to finalize safely.",
            reasoning: "Conflicting or incomplete equivalence signals.",
            normalizedScore: 0.61,
            overallScore: 61,
            finalDecision: "needs_human_review",
            finalOutcome: "unresolved",
            consensusScore: 61,
            validatorAgreement: 0.33,
            consensusConfidence: 0.57,
            equivalenceSummary: "Partial equivalence but not enough for automatic finalization.",
            appealRound: 0,
            path: "subjective_consensus",
            findings: [],
            reviewerType: "genlayer_subjective",
            createdAt: now(),
          }
        : {
            evaluationId: "eval_appeal_accept",
            taskId: "task_case",
            winningSubmissionId: "submission_1",
            scores: [],
            summary: "Appeal review converged on acceptance.",
            reasoning: "The stricter review found the result good enough.",
            normalizedScore: 0.84,
            overallScore: 84,
            finalDecision: "approve",
            finalOutcome: "accepted",
            consensusScore: 84,
            validatorAgreement: 0.67,
            consensusConfidence: 0.81,
            equivalenceSummary: "The result is meaningfully equivalent to a successful completion.",
            appealRound: 1,
            path: "subjective_consensus",
            findings: [],
            reviewerType: "genlayer_subjective",
            createdAt: now(),
          };
    },
    async confirmHybrid() {
      throw new Error("not used");
    },
  };

  const service = new TaskMarketService(store, createRegistryServiceStub(store), evaluatorClient, new SafetyService(store));
  const draft = service.createTaskDraft({
    title: "Appeal verification task",
    description: "Return a structured memo with recommendation and risks.",
    category: "research",
    rewardAmount: 10,
    deadline: new Date(Date.now() + 3600000).toISOString(),
    hiringMode: "direct_hire",
    selectedAgentId: "agent_fast",
    attachments: [],
    evaluationPreference: "assisted_evaluation",
    structuredNotes: null,
    creatorWallet: "0xbuyer",
    maxParticipants: 1,
  });

  service.syncTaskWithChain(draft.task.taskId, {
    createTxHash: "tx_create",
    fundTxHash: "tx_fund",
    assignTxHash: "tx_assign",
    onchainTaskRef: "onchain:task_case",
    latestReceipt: {
      hash: "tx_assign",
      status: "ACCEPTED",
      accepted: true,
      finalized: false,
      undetermined: false,
      contractAddress: null,
      blockNumber: null,
      raw: {},
    },
  });
  await service.markSubmissionReceived(draft.task.taskId, "agent_fast", "memory://result", "hash_case");
  const firstReview = await service.reviewAssisted(draft.task.taskId, "0xbuyer", service.getTask(draft.task.taskId).latestSubmissionId);
  assert.equal(firstReview.task.status, "UNRESOLVED");
  const appealed = await service.appealTask(draft.task.taskId, "0xbuyer", "Re-evaluate based on usefulness and completeness.");
  assert.equal(appealed.task.status, "APPROVED");
  assert.equal(appealed.task.appealRecord.resolutionOutcome, "accepted");
}

async function verifySettlementPause() {
  const store = new InMemoryRegistryStore();
  seedPlatformAgent(store);
  const evaluatorClient = {
    async submitUserReview() {
      throw new Error("not used");
    },
    async runAssisted() {
      throw new Error("not used");
    },
    async runHybrid() {
      throw new Error("not used");
    },
    async runConsensus() {
      throw new Error("not used");
    },
    async confirmHybrid() {
      throw new Error("not used");
    },
  };

  const taskMarket = new TaskMarketService(store, createRegistryServiceStub(store), evaluatorClient, new SafetyService(store));
  const settlement = new SettlementService(store, taskMarket, 250);

  store.tasks.set("task_unresolved", {
    taskId: "task_unresolved",
    title: "Task",
    description: "Long enough task description for validation.",
    category: "research",
    rewardAmount: 110,
    deadline: now(),
    status: "UNRESOLVED",
    resultStatus: "unresolved",
    creatorWallet: "0xbuyer",
    creatorDisplay: "0xbuyer",
    selectedAgentId: "agent_fast",
    participatingAgentIds: ["agent_fast"],
    maxParticipants: 1,
    transactionState: "accepted",
    onchainTaskRef: null,
    createdAt: now(),
    updatedAt: now(),
    attachments: [],
    evaluationPreference: "assisted_evaluation",
    structuredNotes: null,
    hiringMode: "direct_hire",
    timeline: [],
    selectedAgents: [{ agentId: "agent_fast", displayName: "Fast Agent", originType: "platform" }],
    reviewActions: ["appeal"],
    latestCreateTxHash: null,
    latestFundTxHash: null,
    latestAssignTxHash: null,
    latestSubmissionId: "submission_1",
    latestSubmissionTxHash: null,
    latestEvaluation: null,
    userReview: null,
    settlementState: "unresolved",
    latestSettlement: null,
    disputeRecord: null,
    appealRecord: null,
  });

  await assert.rejects(
    () => settlement.settleApprovedTask("task_unresolved", "0xbuyer"),
    /payout-safe final state/i,
  );
}

function seedPlatformAgent(store) {
  store.upsertAgent({
    profile: {
      agentId: "agent_fast",
      ownerWallet: "0xagentA",
      publicName: "Fast Agent",
      slug: "fast-agent",
      description: "Execution specialist.",
      avatarUrl: null,
      originType: "platform",
      category: "research",
      capabilityTags: ["research"],
      skills: [],
      skillCategories: [],
      endpointUrl: null,
      expectedLatencyMsRange: { minMs: 1200, maxMs: 6000 },
      pricingHint: "Fast.",
      activeVersionHash: "ver_fast",
      isActive: true,
      createdAt: now(),
      updatedAt: now(),
    },
    registrationState: "active",
    healthStatus: "healthy",
    compatibilityStatus: "compatible",
    latestVersionHash: "ver_fast",
    suspensionReason: null,
    compatibilityDeclaration: null,
  });
}

function createRegistryServiceStub(store) {
  return {
    getAgent(agentId) {
      const row = store.agents.get(agentId);
      assert.ok(row, `agent ${agentId} should exist`);
      return {
        profile: row.profile,
        performanceSummary: store.ensurePerformance(agentId),
      };
    },
    listAgents() {
      return [...store.agents.values()].map((row) => ({
        profile: row.profile,
        performanceSummary: store.ensurePerformance(row.profile.agentId),
      }));
    },
  };
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
