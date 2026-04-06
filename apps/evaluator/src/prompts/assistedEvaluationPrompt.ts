export function buildAssistedEvaluationPrompt(input: {
  taskTitle: string;
  taskDescription: string;
  criteriaSummary: string;
  outputSchema: string;
  resultPreview: string;
}) {
  return [
    "You are evaluating an AI agent marketplace task result.",
    `Task title: ${input.taskTitle}`,
    `Task description: ${input.taskDescription}`,
    `Criteria: ${input.criteriaSummary}`,
    `Expected output schema: ${input.outputSchema}`,
    `Result preview: ${input.resultPreview}`,
    "Return concise scoring rationale for completion, relevance, correctness proxy, formatting, usefulness, and latency awareness where relevant.",
  ].join("\n");
}
