import type { EvaluationRunRequest, EvaluationRunResponse, ReviewerFinding } from "@marketplace/shared";
import type { ReviewerAdapter } from "../models";

export class EvidenceRiskValidatorAdapter implements ReviewerAdapter {
  id = "evidence-risk-validator-v1";
  path = "subjective_consensus" as const;

  async evaluate(request: EvaluationRunRequest): Promise<EvaluationRunResponse> {
    const taskText = stringify(request.taskSnapshot);
    const resultText = stringify(request.submissionPayload);
    const evidenceLines = extractEvidenceLines(taskText);
    const quantifiedEvidence = evidenceLines.filter((line) => /\b\d+(?:\.\d+)?%|\$?\d[\d,]*\b/.test(line));
    const unsupportedClaims = findUnsupportedClaims(resultText, evidenceLines);
    const explicitCaveats = countMatches(resultText, /\b(?:limited|unclear|insufficient|unknown|pending|tentative|needs validation)\b/gi);
    const completionScore = clamp(58 + (evidenceLines.length * 7) + (quantifiedEvidence.length * 6) - (unsupportedClaims.length * 18));
    const relevanceScore = clamp(overlapScore(taskText, resultText));
    const correctnessProxyScore = clamp(52 + (quantifiedEvidence.length * 8) + (explicitCaveats * 4) - (unsupportedClaims.length * 20));
    const formatComplianceScore = clamp(resultText.includes(":") || resultText.includes("{") ? 76 : 62);
    const usefulnessScore = clamp(55 + (explicitCaveats * 6) + (evidenceLines.length * 4) - (unsupportedClaims.length * 12));
    const overallScore = clamp(
      Math.round(
        (completionScore * 0.22) +
        (relevanceScore * 0.18) +
        (correctnessProxyScore * 0.28) +
        (formatComplianceScore * 0.12) +
        (usefulnessScore * 0.20),
      ),
    );

    const acceptanceSignal =
      unsupportedClaims.length > 1 || overallScore < 52 ? "reject"
        : evidenceLines.length >= 2 && quantifiedEvidence.length >= 1 && overallScore >= 72 ? "accept"
          : "uncertain";
    const decision =
      acceptanceSignal === "accept" ? "approve"
        : acceptanceSignal === "reject" ? "reject"
          : "needs_human_review";
    const confidence =
      acceptanceSignal === "accept" ? 0.78
        : acceptanceSignal === "reject" ? 0.73
          : 0.57;
    const summary =
      acceptanceSignal === "accept"
        ? "Evidence-risk review found enough grounded signal to support acceptance without overclaiming."
        : acceptanceSignal === "reject"
          ? "Evidence-risk review found unsupported claims or too little grounding for a safe acceptance."
          : "Evidence-risk review found partially grounded output, but not enough risk control for automatic finalization.";
    const reasoningParts = [
      `Visible evidence lines: ${evidenceLines.length}.`,
      quantifiedEvidence.length > 0 ? `Quantified evidence lines: ${quantifiedEvidence.length}.` : "No quantified evidence lines were visible.",
      unsupportedClaims.length > 0
        ? `Potentially unsupported claims detected: ${unsupportedClaims.join(", ")}.`
        : "No obvious unsupported hype claims were detected.",
    ];

    const finding: ReviewerFinding = {
      reviewerId: this.id,
      reviewerType: "evidence_risk_reviewer" as any,
      decision,
      acceptanceSignal,
      overallScore,
      confidence,
      summary,
      reasoning: reasoningParts.join(" "),
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
          ? "Grounded evidence appears strong enough that the result can count as an acceptable equivalent."
          : acceptanceSignal === "reject"
            ? "Weak grounding or overclaiming makes the result unsafe to treat as an acceptable equivalent."
            : "Grounding is mixed, so equivalence remains unresolved until stronger review or appeal.",
      path: request.evaluationPath,
      findings: [finding],
      reviewerType: "evidence_risk_reviewer" as any,
      createdAt: new Date().toISOString(),
    };
  }
}

function stringify(value: unknown) {
  return JSON.stringify(value ?? {}).toLowerCase();
}

function extractEvidenceLines(text: string) {
  return text
    .split(/\\n|[.?!]/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 8)
    .slice(0, 8);
}

function findUnsupportedClaims(resultText: string, evidenceLines: string[]) {
  const evidenceCorpus = evidenceLines.join(" ");
  return CLAIM_PATTERNS
    .filter((pattern) => pattern.regex.test(resultText) && !pattern.evidence.test(evidenceCorpus))
    .map((pattern) => pattern.label);
}

function overlapScore(taskText: string, resultText: string) {
  const taskTokens = new Set(taskText.split(/[^a-z0-9_]+/).filter((token) => token.length >= 4));
  const resultTokens = new Set(resultText.split(/[^a-z0-9_]+/).filter((token) => token.length >= 4));
  if (taskTokens.size === 0 || resultTokens.size === 0) return 42;
  let overlap = 0;
  taskTokens.forEach((token) => {
    if (resultTokens.has(token)) overlap += 1;
  });
  return 38 + Math.round((overlap / taskTokens.size) * 55);
}

function countMatches(value: string, pattern: RegExp) {
  return [...value.matchAll(pattern)].length;
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, value));
}

const CLAIM_PATTERNS = [
  { label: "market leadership", regex: /\b(?:market leader|#1|best in class)\b/i, evidence: /\b(?:market leader|#1|best in class|benchmark|leader)\b/i },
  { label: "guaranteed outcome", regex: /\b(?:guaranteed|guarantees|certainly will)\b/i, evidence: /\b(?:guarantee|sla|contracted)\b/i },
  { label: "proof of ROI", regex: /\b(?:roi|return on investment|payback)\b/i, evidence: /\b(?:roi|return on investment|payback|revenue|conversion|savings)\b/i },
];
