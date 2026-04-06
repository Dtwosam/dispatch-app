import type { EvaluationRunRequest, EvaluationRunResponse, ReviewerFinding } from "@marketplace/shared";
import type { ReviewerAdapter } from "../models";

export class FormatUsefulnessValidatorAdapter implements ReviewerAdapter {
  id = "format-usefulness-validator-v1";
  path = "subjective_consensus" as const;

  async evaluate(request: EvaluationRunRequest): Promise<EvaluationRunResponse> {
    const resultText = JSON.stringify(request.submissionPayload ?? {}).toLowerCase();
    const schemaText = JSON.stringify(request.outputSchema ?? {}).toLowerCase();
    const schemaKeys = Array.from(new Set(schemaText.split(/[^a-z0-9_]+/).filter((token) => token.length >= 4)));
    const matchedKeys = schemaKeys.filter((token) => resultText.includes(token));
    const listSignals = countMatches(resultText, /[:\-\[]/g);
    const actionSignals = countMatches(resultText, /\b(?:next step|action|recommend|approve|review|validate|follow up|owner)\b/gi);
    const completionScore = clamp(schemaKeys.length === 0 ? 72 : Math.round((matchedKeys.length / schemaKeys.length) * 100));
    const relevanceScore = clamp(actionSignals > 0 ? 82 : 64);
    const correctnessProxyScore = clamp(Math.round((completionScore * 0.5) + (actionSignals * 6) + 38));
    const formatComplianceScore = clamp((schemaKeys.length > 0 ? 54 : 60) + (matchedKeys.length * 8) + (listSignals > 2 ? 10 : 0));
    const usefulnessScore = clamp(50 + (actionSignals * 9) + (listSignals * 2));
    const overallScore = clamp(
      Math.round(
        (completionScore * 0.25) +
        (relevanceScore * 0.15) +
        (correctnessProxyScore * 0.2) +
        (formatComplianceScore * 0.2) +
        (usefulnessScore * 0.2),
      ),
    );
    const acceptanceSignal =
      overallScore >= 76 && (schemaKeys.length === 0 || matchedKeys.length >= Math.max(1, Math.ceil(schemaKeys.length / 2))) ? "accept"
        : overallScore <= 54 ? "reject"
          : "uncertain";
    const decision =
      acceptanceSignal === "accept" ? "approve"
        : acceptanceSignal === "reject" ? "reject"
          : "needs_human_review";
    const confidence =
      acceptanceSignal === "accept" ? 0.75
        : acceptanceSignal === "reject" ? 0.7
          : 0.55;
    const summary =
      acceptanceSignal === "accept"
        ? "Format-usefulness review found the result structured enough to be directly usable."
        : acceptanceSignal === "reject"
          ? "Format-usefulness review found the result too weakly structured for safe buyer approval."
          : "Format-usefulness review found partial structure and actionability, but not enough for automatic approval.";
    const reasoning = schemaKeys.length > 0
      ? `Matched ${matchedKeys.length} of ${schemaKeys.length} schema/output cues with ${actionSignals} actionability signals.`
      : `No formal schema was provided, so the review relied on actionability (${actionSignals}) and structure cues (${listSignals}).`;

    const finding: ReviewerFinding = {
      reviewerId: this.id,
      reviewerType: "format_usefulness_reviewer" as any,
      decision,
      acceptanceSignal,
      overallScore,
      confidence,
      summary,
      reasoning,
      criteriaScores: {
        completionScore,
        relevanceScore,
        correctnessProxyScore,
        formatComplianceScore,
        usefulnessScore,
        latencyAwarenessScore: null,
      },
      createdAt: new Date().toISOString(),
    };

    return {
      evaluationId: `eval_${Date.now()}`,
      taskId: request.taskId,
      winningSubmissionId: request.submissionIds[0] ?? null,
      scores: [{
        submissionId: request.submissionIds[0] ?? "unknown",
        agentId: String(request.resultSnapshot?.agentId ?? "unknown"),
        score: overallScore,
        normalizedScore: overallScore / 100,
        notes: summary,
        breakdown: finding.criteriaScores,
      }],
      summary,
      reasoning,
      normalizedScore: overallScore / 100,
      overallScore,
      finalDecision: decision,
      finalOutcome: acceptanceSignal === "accept" ? "accepted" : acceptanceSignal === "reject" ? "rejected" : "unresolved",
      consensusScore: overallScore,
      validatorAgreement: 1,
      consensusConfidence: confidence,
      equivalenceSummary:
        acceptanceSignal === "accept"
          ? "The output is structured and useful enough to count as an acceptable equivalent for the requested deliverable."
          : acceptanceSignal === "reject"
            ? "The output is too weakly structured to count as an acceptable equivalent deliverable."
            : "The output may be partially useful, but equivalence remains unresolved because structure/actionability are mixed.",
      path: request.evaluationPath,
      findings: [finding],
      reviewerType: "format_usefulness_reviewer" as any,
      createdAt: new Date().toISOString(),
    };
  }
}

function countMatches(value: string, pattern: RegExp) {
  return [...value.matchAll(pattern)].length;
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, value));
}
