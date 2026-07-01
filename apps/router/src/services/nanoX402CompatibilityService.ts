const NANO_SOURCE_PRICE_USDC = "0.001";
const ARC_TESTNET_CAIP2 = "eip155:5042002";

export const NANO_X402_SOURCE_BRIEF_PATH = "/api/nano/x402/source-brief";

export const nanoX402SourceBriefMetadata = {
  sourceId: "nano-source-brief-stablecoin-payments",
  sourceTitle: "Stablecoin payments source brief",
  sourceType: "source",
  price: Number(NANO_SOURCE_PRICE_USDC),
  currency: "USDC",
  chain: "Arc Testnet",
  reason: "The agent wants paid context before producing the final brief.",
  paymentProtocol: "x402",
  paymentRail: "Circle Gateway Nanopayments-compatible",
  state: "payment_required",
} as const;

export type NanoX402PaymentRequiredResponse = ReturnType<typeof buildNanoX402PaymentRequiredResponse>;

export function buildNanoX402PaymentRequiredResponse(resourceUrl = NANO_X402_SOURCE_BRIEF_PATH) {
  const paymentRequired = {
    x402Version: 2,
    resource: {
      url: resourceUrl || NANO_X402_SOURCE_BRIEF_PATH,
      description: nanoX402SourceBriefMetadata.sourceTitle,
      mimeType: "application/json",
    },
    accepts: [
      {
        scheme: "exact",
        network: ARC_TESTNET_CAIP2,
        asset: "USDC",
        amount: "1000",
        decimals: 6,
        maxTimeoutSeconds: 604900,
        payTo: null,
        extra: {
          name: "GatewayWalletBatched",
          version: "1",
          verifyingContract: null,
        },
      },
    ],
  };

  return {
    error: "payment_required",
    state: "payment_required",
    paid: false,
    unlocked: false,
    paymentRequired: true,
    source: nanoX402SourceBriefMetadata,
    paymentRequiredMetadata: paymentRequired,
    gateway: {
      compatible: true,
      settlement: "not_verified",
      buyerProofRequired: true,
      phase: "15H_required_for_buyer_payment",
    },
    unlockedPayload: null,
  };
}

export function encodeNanoX402PaymentRequiredHeader(response: NanoX402PaymentRequiredResponse) {
  return Buffer.from(JSON.stringify(response.paymentRequiredMetadata), "utf8").toString("base64");
}
