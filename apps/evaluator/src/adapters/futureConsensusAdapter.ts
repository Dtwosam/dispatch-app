import type { EvaluationRunRequest, EvaluationRunResponse } from "@marketplace/shared";
import type { ReviewerAdapter } from "../models";

export class FutureConsensusAdapter implements ReviewerAdapter {
  id = "future-subjective-consensus";
  path = "subjective_consensus" as const;

  async evaluate(request: EvaluationRunRequest): Promise<EvaluationRunResponse> {
    return {
      evaluationId: `eval_${Date.now()}`,
      taskId: request.taskId,
      winningSubmissionId: null,
      scores: [],
      summary: "Subjective consensus is not active in this MVP.",
      reasoning: "This adapter reserves a future validator-driven review path. Heavy scoring remains offchain for the MVP.",
      normalizedScore: 0,
      overallScore: 0,
      finalDecision: "needs_human_review",
      finalOutcome: "unresolved",
      consensusScore: 0,
      validatorAgreement: 0,
      consensusConfidence: 0.1,
      equivalenceSummary: "This placeholder adapter does not yet contribute a live equivalence verdict.",
      path: request.evaluationPath,
      findings: [
        {
          reviewerId: this.id,
          reviewerType: "validator_subjective",
          decision: "needs_human_review",
          acceptanceSignal: "uncertain",
          overallScore: 0,
          confidence: 0.1,
          summary: "Consensus path reserved for future integration.",
          reasoning: "This is an abstraction seam, not a live consensus evaluator in the MVP.",
          criteriaScores: {
            completionScore: 0,
            relevanceScore: 0,
            correctnessProxyScore: 0,
            formatComplianceScore: 0,
            usefulnessScore: 0,
            latencyAwarenessScore: null,
          },
          createdAt: new Date().toISOString(),
        },
      ],
      reviewerType: "validator_subjective",
      createdAt: new Date().toISOString(),
    };
  }
}
