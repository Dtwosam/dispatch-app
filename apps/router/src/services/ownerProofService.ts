import type {
  OwnerProofChallengeResponse,
  OwnerProofVerifyResponse,
} from "@marketplace/shared";
import type { InMemoryRegistryStore } from "../db/store";
import { makeId } from "../lib/ids";
import type { OwnerProofVerifier } from "./ownerProofVerifier";

export class OwnerProofService {
  constructor(
    private readonly store: InMemoryRegistryStore,
    private readonly verifier: OwnerProofVerifier,
    private readonly challengeTtlMs = 10 * 60 * 1000,
  ) {}

  issueChallenge(walletAddress: string): OwnerProofChallengeResponse {
    const challengeId = makeId("challenge");
    const nonce = makeId("nonce");
    const expiresAt = new Date(Date.now() + this.challengeTtlMs).toISOString();
    const message = [
      "Dispatch Marketplace owner proof",
      `wallet:${walletAddress}`,
      `nonce:${nonce}`,
      `challengeId:${challengeId}`,
    ].join("\n");

    this.store.ownerProofChallenges.set(challengeId, {
      challengeId,
      walletAddress,
      message,
      nonce,
      expiresAt,
      createdAt: new Date().toISOString(),
      verifiedAt: null,
      proofId: null,
      signature: null,
      status: "issued",
    });

    return { challengeId, walletAddress, message, nonce, expiresAt };
  }

  async verifyChallenge(
    challengeId: string,
    walletAddress: string,
    signature: string,
  ): Promise<OwnerProofVerifyResponse> {
    const challenge = this.store.ownerProofChallenges.get(challengeId);
    if (!challenge || challenge.walletAddress !== walletAddress) {
      return {
        verified: false,
        proofId: null,
        verifiedAt: null,
        mode: this.verifier.mode(),
      };
    }

    if (new Date(challenge.expiresAt).getTime() < Date.now()) {
      challenge.status = "expired";
      this.store.ownerProofChallenges.set(challengeId, challenge);
      return {
        verified: false,
        proofId: null,
        verifiedAt: null,
        mode: this.verifier.mode(),
      };
    }

    const verified = await this.verifier.verify({
      walletAddress,
      message: challenge.message,
      signature,
    });

    if (!verified) {
      return {
        verified: false,
        proofId: null,
        verifiedAt: null,
        mode: this.verifier.mode(),
      };
    }

    const proofId = makeId("proof");
    const verifiedAt = new Date().toISOString();
    challenge.verifiedAt = verifiedAt;
    challenge.proofId = proofId;
    challenge.signature = signature;
    challenge.status = "verified";
    this.store.ownerProofChallenges.set(challengeId, challenge);

    return {
      verified: true,
      proofId,
      verifiedAt,
      mode: this.verifier.mode(),
    };
  }

  requireVerifiedProof(proofId: string, walletAddress: string): void {
    const challenge = [...this.store.ownerProofChallenges.values()].find(
      (item) => item.proofId === proofId && item.walletAddress === walletAddress && item.status === "verified",
    );

    if (!challenge) {
      throw new Error("Verified owner proof was not found for this wallet");
    }
  }
}
