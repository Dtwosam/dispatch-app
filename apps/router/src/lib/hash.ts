import { createHash } from "node:crypto";
import { canonicalize } from "./canonicalize";

export function hashCanonicalPayload(value: unknown): string {
  return createHash("sha256").update(canonicalize(value)).digest("hex");
}
