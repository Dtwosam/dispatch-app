import { createHash, randomBytes } from "node:crypto";

export function makeId(prefix: string): string {
  return `${prefix}_${randomBytes(8).toString("hex")}`;
}

export function fingerprint(parts: Array<string | number | boolean>): string {
  return createHash("sha256").update(parts.join("::")).digest("hex");
}
