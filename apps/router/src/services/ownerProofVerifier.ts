import { createHash } from "node:crypto";
import { fetchJson } from "../lib/http";

export interface OwnerProofVerifier {
  verify(input: { walletAddress: string; message: string; signature: string }): Promise<boolean>;
  mode(): "external_verifier" | "development";
}

export class ExternalOwnerProofVerifier implements OwnerProofVerifier {
  constructor(private readonly url: string) {}

  async verify(input: { walletAddress: string; message: string; signature: string }) {
    const response = await fetchJson<{ verified: boolean }>(
      this.url,
      {
        method: "POST",
        body: JSON.stringify(input),
      },
      8000,
    );
    return response.status >= 200 && response.status < 300 && response.data.verified === true;
  }

  mode(): "external_verifier" {
    return "external_verifier";
  }
}

export class DevelopmentOwnerProofVerifier implements OwnerProofVerifier {
  async verify(input: { walletAddress: string; message: string; signature: string }) {
    const expected = createHash("sha256")
      .update(`${input.walletAddress}::${input.message}`)
      .digest("hex");
    return input.signature === expected;
  }

  mode(): "development" {
    return "development";
  }
}

export function createOwnerProofVerifier(): OwnerProofVerifier {
  const verifierUrl = process.env.OWNER_PROOF_VERIFIER_URL;
  if (verifierUrl) {
    return new ExternalOwnerProofVerifier(verifierUrl);
  }

  if (process.env.ALLOW_INSECURE_DEV_OWNER_PROOFS === "true" || process.env.NODE_ENV !== "production") {
    return new DevelopmentOwnerProofVerifier();
  }

  throw new Error(
    "Owner proof verifier is not configured. Set OWNER_PROOF_VERIFIER_URL or ALLOW_INSECURE_DEV_OWNER_PROOFS=true for local development.",
  );
}
