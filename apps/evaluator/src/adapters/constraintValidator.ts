import type { EvaluationRunRequest, EvaluationRunResponse, ReviewerFinding } from "@marketplace/shared";
import type { ReviewerAdapter } from "../models";

export class ConstraintValidatorAdapter implements ReviewerAdapter {
  id = "constraint-validator-v1";
  path = "subjective_consensus" as const;

  async evaluate(request: EvaluationRunRequest): Promise<EvaluationRunResponse> {
    const taskText = JSON.stringify(request.taskSnapshot ?? {}).toLowerCase();
    const resultText = JSON.stringify(request.submissionPayload ?? {}).toLowerCase();
    const outputSchemaText = JSON.stringify(request.outputSchema ?? {}).toLowerCase();
    const requiredSignals = extractSignals(`${taskText} ${outputSchemaText}`);
    const matchedSignals = requiredSignals.filter((signal) => resultText.includes(signal));
    const formatComplianceScore = request.outputSchema ? 82 : 64;
    const completionScore = requiredSignals.length === 0
      ? 78
      : Math.round((matchedSignals.length / requiredSignals.length) * 100);
    const usefulnessScore = resultText.length > 160 ? 84 : resultText.length > 80 ? 68 : 48;
    const relevanceScore = resultText.includes(String(request.taskId).toLowerCase()) ? 72 : Math.max(48, completionScore - 8);
    const correctnessProxyScore = Math.round((completionScore + formatComplianceScore + usefulnessScore) / 3);
    const overallScore = clampScore(
      Math.round((completionScore * 0.35) + (formatComplianceScore * 0.25) + (usefulnessScore * 0.2) + (relevanceScore * 0.1) + (correctnessProxyScore * 0.1)),
    );
    const acceptanceSignal = overallScore >= 78 ? "accept" : overallScore >= 58 ? "uncertain" : "reject";
    const decision = acceptanceSignal === "accept" ? "approve" : acceptanceSignal === "reject" ? "reject" : "needs_human_review";
    const confidence = acceptanceSignal === "uncertain" ? 0.56 : 0.74;
    const summary =
      acceptanceSignal === "accept"
        ? "Constraint review found the required task shape and structure largely satisfied."
        : acceptanceSignal === "reject"
          ? "Constraint review found important requested requirements missing or structurally weak."
          : "Constraint review found a partially satisfied result that still needs broader consensus.";

    const finding: ReviewerFinding = {
      reviewerId: this.id,
      reviewerType: "constraint_auditor" as any,
      decision,
      acceptanceSignal,
      overallScore,
      confidence,
      summary,
      reasoning: requiredSignals.length === 0
        ? "No strong explicit constraints were extracted from the task snapshot, so the validator used structural completeness and usefulness proxies."
        : `Matched ${matchedSignals.length} of ${requiredSignals.length} extracted constraint signals.`,
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
      reasoning: finding.reasoning,
      normalizedScore: overallScore / 100,
      overallScore,
      finalDecision: decision,
      finalOutcome: acceptanceSignal === "accept" ? "accepted" : acceptanceSignal === "reject" ? "rejected" : "unresolved",
      consensusScore: overallScore,
      validatorAgreement: 1,
      consensusConfidence: confidence,
      equivalenceSummary:
        acceptanceSignal === "accept"
          ? "The result satisfies the key structural constraints strongly enough to count as an acceptable equivalent."
          : acceptanceSignal === "reject"
            ? "The result misses core task constraints and is not equivalent to a successful completion."
            : "The result only partially satisfies the requested structure, so equivalence remains unresolved.",
      path: request.evaluationPath,
      findings: [finding],
      reviewerType: "constraint_auditor" as any,
      createdAt: new Date().toISOString(),
    };
  }
}

function extractSignals(text: string) {
  return Array.from(new Set(
    text
      .split(/[^a-z0-9_]+/)
      .map((value) => value.trim())
      .filter((value) => value.length >= 5)
      .filter((value) => !STOP_WORDS.has(value))
      .slice(0, 12),
  ));
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, value));
}

const STOP_WORDS = new Set([
  "about",
  "above",
  "after",
  "before",
  "buyer",
  "could",
  "description",
  "result",
  "should",
  "their",
  "there",
  "these",
  "title",
  "under",
  "which",
  "would",
]);
