import test from "node:test";
import assert from "node:assert/strict";
import { EvaluationService } from "../src/services/evaluationService";
import type { EvaluationRunRequest } from "@marketplace/shared";

const baseRequest: EvaluationRunRequest = {
  taskId: "task_1",
  submissionIds: ["sub_1"],
  evaluationMode: "assisted_scoring",
  evaluationPath: "assisted_evaluation",
  criteria: [
    { key: "completion", label: "Completion", weight: 0.25, description: "Did it finish the job?" },
    { key: "relevance", label: "Relevance", weight: 0.2, description: "Does it stay on task?" },
    { key: "correctness_proxy", label: "Correctness Proxy", weight: 0.2, description: "Is it plausibly correct?" },
    { key: "formatting", label: "Formatting", weight: 0.15, description: "Is it compliant?" },
    { key: "usefulness", label: "Usefulness", weight: 0.2, description: "Would a buyer use this?" },
  ],
  reviewerType: "machine_assisted",
  taskSnapshot: { title: "Competitor memo", description: "Write a useful competitor memo." },
  resultSnapshot: { agentId: "agent_1" },
  outputSchema: { summary: "string" },
  submissionPayload: {
    summary: "Three competitors are converging on similar positioning.",
    recommendations: ["Lead with proof", "Tighten pricing clarity"],
  },
};

test("assisted evaluation returns weighted score summary", async () => {
  const service = new EvaluationService();
  const result = await service.runAssistedEvaluation(baseRequest);
  assert.equal(result.taskId, "task_1");
  assert.ok(result.findings.length >= 5);
  assert.ok((result.overallScore ?? 0) > 0);
  assert.ok(typeof result.validatorAgreement === "number");
  assert.ok(typeof result.consensusConfidence === "number");
  assert.ok(new Set(result.findings.map((finding) => finding.reviewerType)).size >= 4);
});

test("user review requires explicit rejection reason path", async () => {
  const service = new EvaluationService();
  const result = await service.runUserReview(
    { ...baseRequest, evaluationPath: "user_review", reviewerType: "buyer" },
    {
      taskId: "task_1",
      submissionId: "sub_1",
      reviewerWallet: "0xbuyer",
      decision: "reject",
      rejectionReason: "The output missed the requested structure.",
      feedback: "The memo needs explicit competitor sections.",
    },
  );
  assert.equal(result.finalDecision, "reject");
});

test("hybrid evaluation defers final decision until confirmation", async () => {
  const service = new EvaluationService();
  const result = await service.runHybridEvaluation({ ...baseRequest, evaluationPath: "hybrid_review" });
  assert.equal(result.finalDecision, "needs_human_review");
  const confirmed = service.confirmHybridReview({
    evaluationId: result.evaluationId,
    reviewerWallet: "0xbuyer",
    confirmDecision: "approve",
    feedback: "Looks good.",
  });
  assert.equal(confirmed?.confirmation.confirmDecision, "approve");
});

test("aggregator escalates mixed findings to human review", () => {
  const service = new EvaluationService();
  const aggregate = service.aggregate({
    taskId: "task_1",
    submissionId: "sub_1",
    findings: [
      {
        reviewerType: "machine_assisted",
        overallScore: 74,
        decision: "needs_human_review",
        acceptanceSignal: "uncertain",
        confidence: 0.58,
        summary: "Needs inspection",
        reasoning: "Formatting is okay but usefulness is mixed.",
      },
      {
        reviewerType: "equivalence_reviewer" as any,
        overallScore: 82,
        decision: "approve",
        acceptanceSignal: "accept",
        confidence: 0.91,
        summary: "Looks good",
        reasoning: "I would use this result.",
      },
    ],
  });
  assert.equal(aggregate.finalOutcome, "unresolved");
  assert.equal(aggregate.finalDecision, "needs_human_review");
});

test("aggregator requires diverse validator agreement before auto-accepting", () => {
  const service = new EvaluationService();
  const aggregate = service.aggregate({
    taskId: "task_2",
    submissionId: "sub_2",
    findings: [
      {
        reviewerType: "equivalence_reviewer" as any,
        overallScore: 86,
        decision: "approve",
        acceptanceSignal: "accept",
        confidence: 0.86,
        summary: "Equivalent",
        reasoning: "Equivalent enough.",
      },
      {
        reviewerType: "constraint_auditor" as any,
        overallScore: 82,
        decision: "approve",
        acceptanceSignal: "accept",
        confidence: 0.8,
        summary: "Constraints satisfied",
        reasoning: "Constraints matched.",
      },
      {
        reviewerType: "evidence_risk_reviewer" as any,
        overallScore: 79,
        decision: "approve",
        acceptanceSignal: "accept",
        confidence: 0.74,
        summary: "Grounded enough",
        reasoning: "Claims are bounded.",
      },
    ],
  });
  assert.equal(aggregate.finalOutcome, "accepted");
  assert.equal(aggregate.finalDecision, "approve");
});
