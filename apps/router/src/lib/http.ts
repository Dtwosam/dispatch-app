export async function fetchJson<T>(
  input: string,
  init: RequestInit = {},
  timeoutMs = 8000,
): Promise<{ status: number; data: T }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(input, {
      ...init,
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        ...(init.headers ?? {}),
      },
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const message =
        data && typeof data === "object" && "error" in data && typeof (data as { error?: unknown }).error === "string"
          ? (data as { error: string }).error
          : `HTTP ${response.status} for ${input}`;
      throw new Error(message);
    }
    return { status: response.status, data };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request timed out for ${input}`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
