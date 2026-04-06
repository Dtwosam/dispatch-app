import type {
  EvaluationAggregateRequest,
  EvaluationAggregateResponse,
  EvaluationRunRequest,
  EvaluationRunResponse,
  HybridReviewConfirmRequest,
  UserReviewDecision,
} from "@marketplace/shared";
import { evaluationAggregateResponseSchema } from "@marketplace/shared";
import { AssistedScorerAdapter } from "../adapters/assistedScorer";
import { ConstraintValidatorAdapter } from "../adapters/constraintValidator";
import { EquivalenceValidatorAdapter } from "../adapters/equivalenceValidator";
import { EvidenceRiskValidatorAdapter } from "../adapters/evidenceRiskValidator";
import { FormatUsefulnessValidatorAdapter } from "../adapters/formatUsefulnessValidator";
import { FutureConsensusAdapter } from "../adapters/futureConsensusAdapter";
import { UserReviewAdapter } from "../adapters/userReviewAdapter";
import type { Aggregator, EvaluationRecord, HybridConfirmationRecord, UserReviewRecord } from "../models";
import { WeightedAggregator } from "../aggregation/weightedAggregator";

export class EvaluationService {
  private readonly evaluationRecords = new Map<string, EvaluationRecord>();
  private readonly userReviews = new Map<string, UserReviewRecord>();
  private readonly hybridConfirmations = new Map<string, HybridConfirmationRecord>();
  private readonly assistedAdapter = new AssistedScorerAdapter();
  private readonly constraintAdapter = new ConstraintValidatorAdapter();
  private readonly equivalenceAdapter = new EquivalenceValidatorAdapter();
  private readonly evidenceRiskAdapter = new EvidenceRiskValidatorAdapter();
  private readonly formatUsefulnessAdapter = new FormatUsefulnessValidatorAdapter();
  private readonly futureAdapter = new FutureConsensusAdapter();

  constructor(private readonly aggregator: Aggregator = new WeightedAggregator()) {}

  async runAssistedEvaluation(request: EvaluationRunRequest): Promise<EvaluationRunResponse> {
    const result = await this.runConsensusReview({
      ...request,
      evaluationPath: request.evaluationPath ?? "assisted_evaluation",
    });
    this.persist(result, request.submissionIds[0] ?? "unknown");
    return result;
  }

  async runUserReview(request: EvaluationRunRequest, decision: UserReviewDecision): Promise<EvaluationRunResponse> {
    const adapter = new UserReviewAdapter(decision);
    const result = await adapter.evaluate({
      ...request,
      evaluationPath: "user_review",
    });
    this.userReviews.set(result.evaluationId, {
      reviewId: result.evaluationId,
      taskId: decision.taskId,
      submissionId: decision.submissionId,
      review: decision,
    });
    this.persist(result, decision.submissionId);
    return result;
  }

  async runHybridEvaluation(request: EvaluationRunRequest): Promise<EvaluationRunResponse> {
    const result = await this.runConsensusReview({
      ...request,
      evaluationPath: "hybrid_review",
    });
    result.finalDecision = "needs_human_review";
    result.summary = result.finalOutcome === "accepted"
      ? "Consensus review supports acceptance, but hybrid mode still expects a human confirmation step."
      : result.summary;
    this.persist(result, request.submissionIds[0] ?? "unknown");
    return result;
  }

  async runFutureConsensus(request: EvaluationRunRequest): Promise<EvaluationRunResponse> {
    const result = await this.runConsensusReview({
      ...request,
      evaluationPath: "subjective_consensus",
      reviewerType: "validator_subjective",
    });
    result.findings.push((await this.futureAdapter.evaluate(request)).findings[0]!);
    result.summary = `Validator-style subjective consensus completed. ${result.summary}`;
    this.persist(result, request.submissionIds[0] ?? "unknown");
    return result;
  }

  confirmHybridReview(input: HybridReviewConfirmRequest) {
    this.hybridConfirmations.set(input.evaluationId, {
      evaluationId: input.evaluationId,
      confirmation: input,
      confirmedAt: new Date().toISOString(),
    });
    return this.hybridConfirmations.get(input.evaluationId);
  }

  aggregate(input: EvaluationAggregateRequest): EvaluationAggregateResponse {
    return evaluationAggregateResponseSchema.parse(
      this.aggregator.aggregate({
        taskId: input.taskId,
        submissionId: input.submissionId,
        findings: input.findings,
      }),
    );
  }

  getEvaluation(evaluationId: string) {
    return this.evaluationRecords.get(evaluationId) ?? null;
  }

  private persist(result: EvaluationRunResponse, submissionId: string) {
    this.evaluationRecords.set(result.evaluationId, {
      evaluationId: result.evaluationId,
      taskId: result.taskId,
      submissionId,
      result,
    });
  }

  private async runConsensusReview(request: EvaluationRunRequest): Promise<EvaluationRunResponse> {
    const validators = [
      this.assistedAdapter,
      this.constraintAdapter,
      this.equivalenceAdapter,
      this.evidenceRiskAdapter,
      this.formatUsefulnessAdapter,
    ];
    const validatorResults = await Promise.all(
      validators.map((validator) => validator.evaluate({
        ...request,
        evaluationPath: request.evaluationPath ?? "assisted_evaluation",
      })),
    );
    const findings = validatorResults.flatMap((result) => result.findings);
    const aggregate = this.aggregate({
      taskId: request.taskId,
      submissionId: request.submissionIds[0] ?? "unknown",
      findings: findings.map((finding) => ({
        reviewerType: finding.reviewerType as any,
        overallScore: finding.overallScore,
        decision: finding.decision,
        acceptanceSignal: finding.acceptanceSignal,
        confidence: finding.confidence,
        summary: finding.summary,
        reasoning: finding.reasoning,
      })),
    });
    const winningSubmissionId = aggregate.finalOutcome === "rejected" ? null : request.submissionIds[0] ?? null;
    const averageScore = aggregate.consensusScore;
    const normalizedScore = averageScore / 100;
    const summary = aggregate.summary;
    const reasoning = [
      aggregate.equivalenceSummary,
      ...findings.map((finding) => `${finding.reviewerId}: ${finding.summary}`),
    ].join("\n");

    return {
      evaluationId: `eval_${Date.now()}`,
      taskId: request.taskId,
      winningSubmissionId,
      scores: [{
        submissionId: request.submissionIds[0] ?? "unknown",
        agentId: String(request.resultSnapshot?.agentId ?? "unknown"),
        score: averageScore,
        normalizedScore,
        notes: summary,
      }],
      summary,
      reasoning,
      normalizedScore,
      overallScore: averageScore,
      finalDecision: aggregate.finalDecision,
      finalOutcome: aggregate.finalOutcome,
      consensusScore: aggregate.consensusScore,
      validatorAgreement: aggregate.validatorAgreement,
      consensusConfidence: aggregate.consensusConfidence,
      equivalenceSummary: aggregate.equivalenceSummary,
      appealRound: readAppealRound(request),
      path: request.evaluationPath,
      findings,
      reviewerType: request.reviewerType,
      createdAt: new Date().toISOString(),
    };
  }
}

function readAppealRound(request: EvaluationRunRequest) {
  const taskSnapshot = request.taskSnapshot ?? {};
  const value = typeof taskSnapshot.appealRound === "number" ? taskSnapshot.appealRound : 0;
  return Math.max(0, Math.trunc(value));
}
