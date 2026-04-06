import type { EvaluationRunRequest, EvaluationRunResponse, ReviewerFinding } from "@marketplace/shared";
import type { ReviewerAdapter } from "../models";

export class EquivalenceValidatorAdapter implements ReviewerAdapter {
  id = "equivalence-validator-v1";
  path = "subjective_consensus" as const;

  async evaluate(request: EvaluationRunRequest): Promise<EvaluationRunResponse> {
    const taskText = normalize(JSON.stringify(request.taskSnapshot ?? {}));
    const resultText = normalize(JSON.stringify(request.submissionPayload ?? {}));
    const taskTokens = tokenize(taskText);
    const resultTokens = tokenize(resultText);
    const overlap = sharedRatio(taskTokens, resultTokens);
    const coverageScore = Math.round(overlap * 100);
    const formatComplianceScore = scoreFormat(request.outputSchema, resultText);
    const usefulnessScore = resultText.length > 140 ? 86 : resultText.length > 90 ? 72 : 50;
    const completionScore = Math.round((coverageScore * 0.6) + (formatComplianceScore * 0.2) + (usefulnessScore * 0.2));
    const relevanceScore = Math.round((coverageScore * 0.7) + (usefulnessScore * 0.3));
    const correctnessProxyScore = Math.round((completionScore + relevanceScore + usefulnessScore) / 3);
    const overallScore = clamp(Math.round((completionScore + relevanceScore + correctnessProxyScore + formatComplianceScore + usefulnessScore) / 5));
    const acceptanceSignal = overallScore >= 76 ? "accept" : overallScore >= 60 ? "uncertain" : "reject";
    const decision = acceptanceSignal === "accept" ? "approve" : acceptanceSignal === "reject" ? "reject" : "needs_human_review";
    const confidence = acceptanceSignal === "accept" ? 0.79 : acceptanceSignal === "reject" ? 0.72 : 0.54;
    const equivalenceSummary =
      acceptanceSignal === "accept"
        ? "The output appears meaningfully equivalent to a successful answer even if wording differs."
        : acceptanceSignal === "reject"
          ? "The output does not appear meaningfully equivalent to a successful task outcome."
          : "The output shows partial equivalence, but not enough to safely finalize without escalation.";

    const finding: ReviewerFinding = {
      reviewerId: this.id,
      reviewerType: "equivalence_reviewer" as any,
      decision,
      acceptanceSignal,
      overallScore,
      confidence,
      summary: equivalenceSummary,
      reasoning: `Task/result semantic overlap proxy is ${coverageScore} with format score ${formatComplianceScore}.`,
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
        notes: equivalenceSummary,
        breakdown: finding.criteriaScores,
      }],
      summary: equivalenceSummary,
      reasoning: finding.reasoning,
      normalizedScore: overallScore / 100,
      overallScore,
      finalDecision: decision,
      finalOutcome: acceptanceSignal === "accept" ? "accepted" : acceptanceSignal === "reject" ? "rejected" : "unresolved",
      consensusScore: overallScore,
      validatorAgreement: 1,
      consensusConfidence: confidence,
      equivalenceSummary,
      path: request.evaluationPath,
      findings: [finding],
      reviewerType: "equivalence_reviewer" as any,
      createdAt: new Date().toISOString(),
    };
  }
}

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function tokenize(value: string) {
  return Array.from(new Set(value.split(/[^a-z0-9_]+/).filter((token) => token.length >= 4)));
}

function sharedRatio(taskTokens: string[], resultTokens: string[]) {
  if (taskTokens.length === 0 || resultTokens.length === 0) return 0;
  let overlap = 0;
  const resultSet = new Set(resultTokens);
  taskTokens.forEach((token) => {
    if (resultSet.has(token)) overlap += 1;
  });
  return overlap / taskTokens.length;
}

function scoreFormat(outputSchema: unknown, resultText: string) {
  if (!outputSchema) return 62;
  const schemaText = normalize(JSON.stringify(outputSchema));
  const schemaKeys = tokenize(schemaText);
  if (schemaKeys.length === 0) return 76;
  const resultSet = new Set(tokenize(resultText));
  const matched = schemaKeys.filter((token) => resultSet.has(token)).length;
  return clamp(Math.round((matched / schemaKeys.length) * 100));
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, value));
}
