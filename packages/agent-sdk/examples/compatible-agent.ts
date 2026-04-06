import {
  createExampleExecuteResponse,
  createExampleHealthResponse,
  validateExecuteRequest,
} from "../src/index";

export const health = createExampleHealthResponse();

export function execute(payload: unknown) {
  const request = validateExecuteRequest(payload);
  return createExampleExecuteResponse(request);
}
