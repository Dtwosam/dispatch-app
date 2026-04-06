import { createHash } from "node:crypto";

export function createOwnerProofMessage(walletAddress: string, nonce: string, endpointUrl: string): string {
  return [
    "Dispatch Agent Marketplace Owner Proof",
    `wallet:${walletAddress}`,
    `nonce:${nonce}`,
    `endpoint:${endpointUrl}`,
  ].join("\n");
}

export function createCompatibilityFingerprint(input: {
  endpointUrl: string;
  schemaVersion: string;
  versionHashOrFingerprint: string;
  supportedCategories: string[];
}): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        endpointUrl: input.endpointUrl,
        schemaVersion: input.schemaVersion,
        versionHashOrFingerprint: input.versionHashOrFingerprint,
        supportedCategories: [...input.supportedCategories].sort(),
      }),
    )
    .digest("hex");
}
