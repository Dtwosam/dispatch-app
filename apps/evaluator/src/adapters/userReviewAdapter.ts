import type { EvaluationRunRequest, EvaluationRunResponse, UserReviewDecision } from "@marketplace/shared";
import type { ReviewerAdapter } from "../models";

export class UserReviewAdapter implements ReviewerAdapter {
  id = "user-review-v1";
  path = "user_review" as const;

  constructor(private readonly decision: UserReviewDecision) {}

  async evaluate(request: EvaluationRunRequest): Promise<EvaluationRunResponse> {
    const approved = this.decision.decision === "approve";
    const overallScore = approved ? ((this.decision.starRating ?? 4) / 5) * 100 : 35;

    return {
      evaluationId: `eval_${Date.now()}`,
      taskId: request.taskId,
      winningSubmissionId: approved ? this.decision.submissionId : null,
      scores: [
        {
          submissionId: this.decision.submissionId,
          agentId: String(request.resultSnapshot?.agentId ?? "unknown"),
          score: overallScore,
          normalizedScore: overallScore / 100,
          notes: this.decision.feedback ?? (approved ? "User approved the result." : this.decision.rejectionReason ?? "User rejected the result."),
        },
      ],
      summary: approved ? "The buyer approved the submission." : "The buyer rejected the submission.",
      reasoning: this.decision.feedback ?? this.decision.rejectionReason ?? "No additional feedback provided.",
      normalizedScore: overallScore / 100,
      overallScore,
      finalDecision: approved ? "approve" : "reject",
      finalOutcome: approved ? "accepted" : "rejected",
      consensusScore: overallScore,
      validatorAgreement: 1,
      consensusConfidence: approved ? 0.95 : 0.92,
      equivalenceSummary: approved
        ? "The buyer judged the result equivalent to a satisfactorily completed task."
        : "The buyer judged the result not equivalent to the requested outcome.",
      path: request.evaluationPath,
      findings: [
        {
          reviewerId: this.decision.reviewerWallet,
          reviewerType: "buyer",
          decision: approved ? "approve" : "reject",
          acceptanceSignal: approved ? "accept" : "reject",
          overallScore,
          confidence: approved ? 0.95 : 0.92,
          summary: approved ? "Buyer approved the result." : "Buyer rejected the result.",
          reasoning: this.decision.feedback ?? this.decision.rejectionReason ?? "No additional feedback provided.",
          criteriaScores: {
            completionScore: overallScore,
            relevanceScore: overallScore,
            correctnessProxyScore: overallScore,
            formatComplianceScore: overallScore,
            usefulnessScore: overallScore,
            latencyAwarenessScore: null,
          },
          createdAt: new Date().toISOString(),
        },
      ],
      reviewerType: "buyer",
      createdAt: new Date().toISOString(),
    };
  }
}
