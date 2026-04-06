import type { EvaluationAggregateResponse } from "@marketplace/shared";
import type { Aggregator } from "../models";

export class WeightedAggregator implements Aggregator {
  aggregate(input: { taskId: string; submissionId: string; findings: { reviewerType: string; overallScore: number; decision: "approve" | "reject" | "needs_human_review"; acceptanceSignal: "accept" | "reject" | "uncertain"; confidence: number; summary: string; reasoning: string; }[] }): EvaluationAggregateResponse {
    const weightedFindings = input.findings.map((finding) => ({
      ...finding,
      weight: REVIEWER_WEIGHTS[finding.reviewerType] ?? REVIEWER_WEIGHTS.default,
    }));
    const totalWeight = weightedFindings.reduce((sum, finding) => sum + finding.weight, 0);
    const weightedScore = totalWeight
      ? weightedFindings.reduce((sum, finding) => sum + (finding.overallScore * finding.weight), 0) / totalWeight
      : 0;
    const weightedConfidence = totalWeight
      ? weightedFindings.reduce((sum, finding) => sum + (finding.confidence * finding.weight), 0) / totalWeight
      : 0;
    const acceptWeight = sumSignalWeight(weightedFindings, "accept");
    const rejectWeight = sumSignalWeight(weightedFindings, "reject");
    const uncertainWeight = sumSignalWeight(weightedFindings, "uncertain");
    const strongestSignal = Math.max(acceptWeight, rejectWeight, uncertainWeight);
    const validatorAgreement = totalWeight ? strongestSignal / totalWeight : 0;
    const diversityCount = new Set(weightedFindings.map((finding) => finding.reviewerType)).size;
    const diversityReady = diversityCount >= 3;
    const finalOutcome =
      diversityReady && acceptWeight / Math.max(totalWeight, 1) >= 0.62 && weightedScore >= 74 && validatorAgreement >= 0.58
        ? "accepted"
        : diversityReady && rejectWeight / Math.max(totalWeight, 1) >= 0.62 && weightedScore <= 54 && validatorAgreement >= 0.58
          ? "rejected"
          : acceptWeight > 0 && rejectWeight > 0
            ? "disputed"
            : "unresolved";
    const finalDecision =
      finalOutcome === "accepted"
        ? "approve"
        : finalOutcome === "rejected"
          ? "reject"
          : "needs_human_review";
    const equivalenceSummary =
      finalOutcome === "accepted"
        ? `A diverse validator council (${diversityCount} reviewer lenses) judged the result meaningfully equivalent to successful task completion.`
        : finalOutcome === "rejected"
          ? `A diverse validator council (${diversityCount} reviewer lenses) agreed the result was not meaningfully equivalent to a successful completion.`
          : finalOutcome === "disputed"
            ? "Validator signals conflict on whether the result is equivalent enough for acceptance."
            : diversityReady
              ? "Validator signals did not reach strong enough equivalence for automatic finalization."
              : "Validator diversity or agreement was too weak for automatic finalization.";
    return {
      finalDecision,
      overallScore: Math.round(weightedScore),
      summary:
        finalOutcome === "accepted"
          ? "Optimistic Democracy review reached enough diverse agreement to accept the result."
          : finalOutcome === "rejected"
            ? "Optimistic Democracy review reached enough diverse agreement to reject the result."
            : finalOutcome === "disputed"
              ? "Validator disagreement triggered a dispute-ready review outcome."
              : diversityReady
                ? "Validator agreement was too weak for automatic finalization."
                : "Validator diversity was too narrow for automatic finalization.",
      finalOutcome,
      consensusScore: Math.round(weightedScore),
      validatorAgreement: Number(validatorAgreement.toFixed(2)),
      consensusConfidence: Number(Math.min(1, weightedConfidence * (0.82 + Math.min(diversityCount, 4) * 0.05)).toFixed(2)),
      equivalenceSummary,
    };
  }
}

function sumSignalWeight(
  findings: Array<{ acceptanceSignal: "accept" | "reject" | "uncertain"; weight: number }>,
  signal: "accept" | "reject" | "uncertain",
) {
  return findings.reduce((sum, finding) => sum + (finding.acceptanceSignal === signal ? finding.weight : 0), 0);
}

const REVIEWER_WEIGHTS: Record<string, number> = {
  machine_assisted: 1,
  validator_subjective: 1.05,
  genlayer_subjective: 1.05,
  constraint_auditor: 1.1,
  equivalence_reviewer: 1.2,
  evidence_risk_reviewer: 1.15,
  format_usefulness_reviewer: 1,
  buyer: 1.25,
  admin: 1.2,
  default: 1,
};
