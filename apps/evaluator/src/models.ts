import type {
  EvaluationAggregateRequest,
  EvaluationAggregateResponse,
  EvaluationRunRequest,
  EvaluationRunResponse,
  HybridReviewConfirmRequest,
  UserReviewDecision,
} from "@marketplace/shared";

export interface ReviewerAdapter {
  id: string;
  path: "user_review" | "assisted_evaluation" | "hybrid_review" | "subjective_consensus";
  evaluate(request: EvaluationRunRequest): Promise<EvaluationRunResponse>;
}

export interface Aggregator {
  aggregate(input: {
    taskId: string;
    submissionId: string;
    findings: EvaluationAggregateRequest["findings"];
  }): EvaluationAggregateResponse;
}

export interface EvaluationRecord {
  evaluationId: string;
  taskId: string;
  submissionId: string;
  result: EvaluationRunResponse;
}

export interface UserReviewRecord {
  reviewId: string;
  taskId: string;
  submissionId: string;
  review: UserReviewDecision;
}

export interface HybridConfirmationRecord {
  evaluationId: string;
  confirmation: HybridReviewConfirmRequest;
  confirmedAt: string;
}
