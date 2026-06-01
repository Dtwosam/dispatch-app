import type {
  EvaluationRunRequest,
  HybridReviewConfirmRequest,
  UserReviewDecision,
} from "@marketplace/shared";
import { evaluationRunResponseSchema } from "@marketplace/shared";
import { fetchJson, HttpError } from "../lib/http";

export class EvaluatorClient {
  constructor(private readonly baseUrl = normalizeEvaluatorBaseUrl(process.env.EVALUATOR_BASE_URL ?? "http://localhost:4030")) {}

  async runAssisted(request: EvaluationRunRequest) {
    const response = await fetchJson(`${this.baseUrl}/api/evaluations/assisted`, {
      method: "POST",
      body: JSON.stringify(request),
    });
    return evaluationRunResponseSchema.parse(response.data);
  }

  async runHybrid(request: EvaluationRunRequest) {
    const response = await fetchJson(`${this.baseUrl}/api/evaluations/hybrid`, {
      method: "POST",
      body: JSON.stringify(request),
    });
    return evaluationRunResponseSchema.parse(response.data);
  }

  async runConsensus(request: EvaluationRunRequest) {
    const response = await fetchJson(`${this.baseUrl}/api/evaluations/subjective-consensus`, {
      method: "POST",
      body: JSON.stringify(request),
    });
    return evaluationRunResponseSchema.parse(response.data);
  }

  async submitUserReview(request: EvaluationRunRequest, review: UserReviewDecision) {
    try {
      const response = await fetchJson(`${this.baseUrl}/api/evaluations/user-review`, {
        method: "POST",
        body: JSON.stringify({ request, review }),
      });
      return evaluationRunResponseSchema.parse(response.data);
    } catch (error) {
      if (!(error instanceof HttpError) || error.status !== 429) throw error;

      // Buyer review is deterministic. Keep owner approval available if the
      // evaluator service is temporarily throttled, without bypassing AI review paths.
      return evaluationRunResponseSchema.parse(buildThrottledUserReviewFallback(request, review));
    }
  }

  async confirmHybrid(request: HybridReviewConfirmRequest) {
    const response = await fetchJson(`${this.baseUrl}/api/evaluations/hybrid/confirm`, {
      method: "POST",
      body: JSON.stringify(request),
    });
    return evaluationRunResponseSchema.parse(response.data);
  }
}

function buildThrottledUserReviewFallback(request: EvaluationRunRequest, review: UserReviewDecision) {
  const approved = review.decision === "approve";
  const overallScore = approved ? ((review.starRating ?? 4) / 5) * 100 : 35;
  const confidence = approved ? 0.95 : 0.92;
  const reasoning = review.feedback ?? review.rejectionReason ?? "No additional feedback provided.";
  const createdAt = new Date().toISOString();

  return {
    evaluationId: `eval_router_fallback_${Date.now()}`,
    taskId: request.taskId,
    winningSubmissionId: approved ? review.submissionId : null,
    scores: [
      {
        submissionId: review.submissionId,
        agentId: String(request.resultSnapshot?.agentId ?? "unknown"),
        score: overallScore,
        normalizedScore: overallScore / 100,
        notes: review.feedback ?? (approved ? "User approved the result." : review.rejectionReason ?? "User rejected the result."),
      },
    ],
    summary: approved ? "The buyer approved the submission." : "The buyer rejected the submission.",
    reasoning,
    normalizedScore: overallScore / 100,
    overallScore,
    finalDecision: approved ? "approve" as const : "reject" as const,
    finalOutcome: approved ? "accepted" as const : "rejected" as const,
    consensusScore: overallScore,
    validatorAgreement: 1,
    consensusConfidence: confidence,
    equivalenceSummary: approved
      ? "The buyer judged the result equivalent to a satisfactorily completed task."
      : "The buyer judged the result not equivalent to the requested outcome.",
    path: request.evaluationPath,
    findings: [
      {
        reviewerId: review.reviewerWallet,
        reviewerType: "buyer" as const,
        decision: approved ? "approve" as const : "reject" as const,
        acceptanceSignal: approved ? "accept" as const : "reject" as const,
        overallScore,
        confidence,
        summary: approved ? "Buyer approved the result." : "Buyer rejected the result.",
        reasoning,
        criteriaScores: {
          completionScore: overallScore,
          relevanceScore: overallScore,
          correctnessProxyScore: overallScore,
          formatComplianceScore: overallScore,
          usefulnessScore: overallScore,
          latencyAwarenessScore: null,
        },
        createdAt,
      },
    ],
    reviewerType: "buyer" as const,
    createdAt,
  };
}

function normalizeEvaluatorBaseUrl(value: string) {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed) return "http://localhost:4030";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `http://${trimmed}`;
}
