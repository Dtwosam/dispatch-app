import type { EvaluationRunRequest, EvaluationRunResponse, ReviewerFinding } from "@marketplace/shared";
import { buildAssistedEvaluationPrompt } from "../prompts/assistedEvaluationPrompt";
import type { ReviewerAdapter } from "../models";

export class AssistedScorerAdapter implements ReviewerAdapter {
  id = "assisted-scorer-v1";
  path = "assisted_evaluation" as const;

  async evaluate(request: EvaluationRunRequest): Promise<EvaluationRunResponse> {
    const completionScore = scoreCompletion(request);
    const relevanceScore = scoreRelevance(request);
    const formatComplianceScore = scoreFormatting(request);
    const correctnessProxyScore = scoreCorrectnessProxy(request);
    const usefulnessScore = scoreUsefulness(request);
    const latencyAwarenessScore = 75;
    const overallScore = Math.round(
      (completionScore + relevanceScore + formatComplianceScore + correctnessProxyScore + usefulnessScore + latencyAwarenessScore) / 6,
    );

    const reasoningSummary =
      overallScore >= 80
        ? "The result appears task-aligned, structurally usable, and strong enough for straightforward approval."
        : overallScore >= 60
          ? "The result is partially useful but likely needs human judgment before final approval."
          : "The result is weak against the requested task and should not be auto-approved.";

    const criteriaSummary = request.criteria
      .map((criterion) => `${criterion.label} (${criterion.weight})`)
      .join(", ");
    const promptPreview = buildAssistedEvaluationPrompt({
      taskTitle: String(request.taskSnapshot?.title ?? request.taskId),
      taskDescription: String(request.taskSnapshot?.description ?? "No task description supplied"),
      criteriaSummary,
      outputSchema: JSON.stringify(request.outputSchema ?? {}),
      resultPreview: JSON.stringify(request.submissionPayload).slice(0, 500),
    });

    const finding: ReviewerFinding = {
      reviewerId: this.id,
      reviewerType: "machine_assisted",
      decision: overallScore >= 80 ? "approve" : overallScore >= 60 ? "needs_human_review" : "reject",
      acceptanceSignal: overallScore >= 80 ? "accept" : overallScore >= 60 ? "uncertain" : "reject",
      overallScore,
      confidence: overallScore >= 80 ? 0.82 : overallScore >= 60 ? 0.58 : 0.77,
      summary: reasoningSummary,
      reasoning: `Prompt template used:\n${promptPreview}`,
      criteriaScores: {
        completionScore,
        relevanceScore,
        correctnessProxyScore,
        formatComplianceScore,
        usefulnessScore,
        latencyAwarenessScore,
      },
      createdAt: new Date().toISOString(),
    };

    return {
      evaluationId: `eval_${Date.now()}`,
      taskId: request.taskId,
      winningSubmissionId: request.submissionIds[0] ?? null,
      scores: [
        {
          submissionId: request.submissionIds[0] ?? "unknown",
          agentId: String(request.resultSnapshot?.agentId ?? "unknown"),
          score: overallScore,
          normalizedScore: overallScore / 100,
          notes: reasoningSummary,
          breakdown: finding.criteriaScores,
        },
      ],
      summary: reasoningSummary,
      reasoning: finding.reasoning,
      normalizedScore: overallScore / 100,
      overallScore,
      finalDecision: finding.decision,
      finalOutcome: overallScore >= 80 ? "accepted" : overallScore >= 60 ? "unresolved" : "rejected",
      consensusScore: overallScore,
      validatorAgreement: 1,
      consensusConfidence: finding.confidence,
      equivalenceSummary:
        overallScore >= 80
          ? "The result appears meaningfully equivalent to a successful completion of the task."
          : overallScore >= 60
            ? "The result partially matches the intended outcome, but equivalence is not strong enough for automatic acceptance."
            : "The result is not equivalent to a successful task completion.",
      path: request.evaluationPath,
      findings: [finding],
      reviewerType: "machine_assisted",
      createdAt: new Date().toISOString(),
    };
  }
}

function scoreCompletion(request: EvaluationRunRequest) {
  const text = JSON.stringify(request.submissionPayload).toLowerCase();
  return text.length > 40 ? 88 : 55;
}

function scoreRelevance(request: EvaluationRunRequest) {
  const taskText = JSON.stringify(request.taskSnapshot ?? {}).toLowerCase();
  const resultText = JSON.stringify(request.submissionPayload).toLowerCase();
  return overlapScore(taskText, resultText);
}

function scoreFormatting(request: EvaluationRunRequest) {
  return request.outputSchema ? 85 : 65;
}

function scoreCorrectnessProxy(request: EvaluationRunRequest) {
  return JSON.stringify(request.submissionPayload).includes("error") ? 42 : 78;
}

function scoreUsefulness(request: EvaluationRunRequest) {
  const text = JSON.stringify(request.submissionPayload);
  return text.length > 120 ? 82 : 60;
}

function overlapScore(a: string, b: string) {
  const aWords = new Set(a.split(/\W+/).filter(Boolean));
  const bWords = new Set(b.split(/\W+/).filter(Boolean));
  let overlap = 0;
  aWords.forEach((word) => {
    if (bWords.has(word)) overlap += 1;
  });
  const base = aWords.size === 0 ? 0 : overlap / aWords.size;
  return Math.max(35, Math.min(95, Math.round(base * 100)));
}
