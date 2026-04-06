import type { TaskDetailView } from "@marketplace/shared";
import type { BuiltInPlatformAgentDefinition } from "./platformAgentCatalog";
import { buildGenerationPrompt, buildPlatformTaskContext } from "./platformAgentPromptLayer";
import type { PlatformDraftArtifact, PlatformQualityMode, PlatformStructuredTask } from "./platformQualityTypes";

export type PlatformAgentCandidate = PlatformDraftArtifact;

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
};

export class PlatformAgentModelClient {
  private readonly apiKey = process.env.PLATFORM_AGENT_LLM_API_KEY ?? "";
  private readonly model = process.env.PLATFORM_AGENT_LLM_MODEL ?? "";
  private readonly baseUrl = (process.env.PLATFORM_AGENT_LLM_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");

  isEnabled() {
    return Boolean(this.apiKey && this.model);
  }

  async generate(
    definition: BuiltInPlatformAgentDefinition,
    task: TaskDetailView,
    structuredTask: PlatformStructuredTask,
    mode: PlatformQualityMode,
  ): Promise<PlatformAgentCandidate> {
    if (!this.isEnabled()) {
      throw new Error("Platform agent LLM backend is not configured");
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.15,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: buildGenerationPrompt(definition, structuredTask, mode),
          },
          {
            role: "user",
            content: JSON.stringify(
              {
                structuredTask,
                taskContext: buildPlatformTaskContext(task),
              },
              null,
              2,
            ),
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Platform agent LLM request failed with status ${response.status}`);
    }

    const payload = (await response.json()) as ChatCompletionResponse;
    const rawContent = payload.choices?.[0]?.message?.content;
    const text =
      typeof rawContent === "string"
        ? rawContent
        : Array.isArray(rawContent)
          ? rawContent.map((item) => item.text ?? "").join("")
          : "";

    if (!text.trim()) {
      throw new Error("Platform agent LLM returned an empty response");
    }

    return JSON.parse(text) as PlatformAgentCandidate;
  }
}
