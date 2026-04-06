import { hashCanonicalPayload } from "../lib/hash";

export class ResultStore {
  private readonly payloads = new Map<string, unknown>();

  persist(runId: string, payload: unknown) {
    const pointer = `memory://results/${runId}`;
    this.payloads.set(pointer, payload);
    return {
      pointer,
      hash: hashCanonicalPayload(payload),
    };
  }

  read(pointer: string) {
    return this.payloads.get(pointer) ?? null;
  }
}
