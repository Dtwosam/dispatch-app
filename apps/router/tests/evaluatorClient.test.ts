import test from "node:test";
import assert from "node:assert/strict";
import { EvaluatorClient } from "../src/services/evaluatorClient";

test("buyer review falls back locally when evaluator throttles the deterministic user-review endpoint", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("Too many requests", { status: 429 });

  try {
    const client = new EvaluatorClient("http://evaluator.test");
    const result = await client.submitUserReview(
      {
        taskId: "task_1",
        submissionIds: ["submission_1"],
        evaluationMode: "human_only",
        evaluationPath: "user_review",
        criteria: [{ key: "relevance", label: "Relevance", weight: 1, description: "Matches the task." }],
        reviewerType: "buyer",
        resultSnapshot: { agentId: "agent_1" },
        submissionPayload: {},
      },
      {
        taskId: "task_1",
        submissionId: "submission_1",
        reviewerWallet: "0xbuyer",
        decision: "approve",
        starRating: 5,
        feedback: "Approved by the buyer.",
      },
    );

    assert.match(result.evaluationId, /^eval_router_fallback_/);
    assert.equal(result.finalDecision, "approve");
    assert.equal(result.finalOutcome, "accepted");
    assert.equal(result.reviewerType, "buyer");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
