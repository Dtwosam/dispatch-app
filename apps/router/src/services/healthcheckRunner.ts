import { healthcheckResponseSchema, type HealthcheckResponse } from "@marketplace/shared";
import { fetchJson } from "../lib/http";

export interface HealthcheckRunResult {
  ok: boolean;
  latencyMs: number;
  payload: HealthcheckResponse | null;
  errorMessage: string | null;
}

export class HealthcheckRunner {
  async run(endpointUrl: string): Promise<HealthcheckRunResult> {
    const startedAt = Date.now();

    try {
      const response = await fetchJson<unknown>(`${endpointUrl.replace(/\/$/, "")}/health`, {}, 6000);
      const payload = healthcheckResponseSchema.parse(response.data);
      return {
        ok: response.status >= 200 && response.status < 300 && payload.ok,
        latencyMs: Date.now() - startedAt,
        payload,
        errorMessage: null,
      };
    } catch (error) {
      return {
        ok: false,
        latencyMs: Date.now() - startedAt,
        payload: null,
        errorMessage: error instanceof Error ? error.message : "Unknown healthcheck error",
      };
    }
  }
}
