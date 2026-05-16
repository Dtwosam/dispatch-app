import type {
  EvaluationRunRequest,
  HybridReviewConfirmRequest,
  UserReviewDecision,
} from "@marketplace/shared";
import { evaluationRunResponseSchema } from "@marketplace/shared";
import { fetchJson } from "../lib/http";

export class EvaluatorClient {
  constructor(private readonly baseUrl = normalizeEvaluatorBaseUrl(process.env.EVALUATOR_BASE_URL ?? "http://localhost:4030")) {}

  async runAssisted(request: EvaluationRunRequest) {
    const response = await fetchJson(`${this.baseUrl}/api/evaluations/assisted`, {
      method: "POST",
      body: JSON.stringify(request),
    });
    return evaluationRunResponseSchema.parse(response.data);
  }

  async runHybrid(request: EvaluationRunRequest) {
    const response = await fetchJson(`${this.baseUrl}/api/evaluations/hybrid`, {
      method: "POST",
      body: JSON.stringify(request),
    });
    return evaluationRunResponseSchema.parse(response.data);
  }

  async runConsensus(request: EvaluationRunRequest) {
    const response = await fetchJson(`${this.baseUrl}/api/evaluations/subjective-consensus`, {
      method: "POST",
      body: JSON.stringify(request),
    });
    return evaluationRunResponseSchema.parse(response.data);
  }

  async submitUserReview(request: EvaluationRunRequest, review: UserReviewDecision) {
    const response = await fetchJson(`${this.baseUrl}/api/evaluations/user-review`, {
      method: "POST",
      body: JSON.stringify({ request, review }),
    });
    return evaluationRunResponseSchema.parse(response.data);
  }

  async confirmHybrid(request: HybridReviewConfirmRequest) {
    const response = await fetchJson(`${this.baseUrl}/api/evaluations/hybrid/confirm`, {
      method: "POST",
      body: JSON.stringify(request),
    });
    return evaluationRunResponseSchema.parse(response.data);
  }
}

function normalizeEvaluatorBaseUrl(value: string) {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed) return "http://localhost:4030";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `http://${trimmed}`;
}
