import {
  agentAdapterTaskRequestSchema,
  agentAdapterTaskResponseSchema,
  agentResultResponseSchema,
  agentStatusResponseSchema,
  healthcheckResponseSchema,
} from "@marketplace/shared";

export function validateHealthPayload(input: unknown) {
  return healthcheckResponseSchema.parse(input);
}

export function validateExecuteRequest(input: unknown) {
  return agentAdapterTaskRequestSchema.parse(input);
}

export function validateExecuteResponse(input: unknown) {
  return agentAdapterTaskResponseSchema.parse(input);
}

export function validateStatusResponse(input: unknown) {
  return agentStatusResponseSchema.parse(input);
}

export function validateResultResponse(input: unknown) {
  return agentResultResponseSchema.parse(input);
}
