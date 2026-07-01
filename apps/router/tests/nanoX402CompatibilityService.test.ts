import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import type { AddressInfo } from "node:net";
import { InMemoryRegistryStore } from "../src/db/store";
import { createNanoRoutes } from "../src/routes/nanoRoutes";
import { NanoBudgetService } from "../src/services/nanoBudgetService";

async function withNanoServer(fn: (baseUrl: string) => Promise<void>) {
  const app = express();
  app.use(express.json());
  app.use("/api/nano", createNanoRoutes(new NanoBudgetService(new InMemoryRegistryStore())));

  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address() as AddressInfo;
  try {
    await fn(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

test("Nano x402 source brief returns unpaid payment-required metadata", async () => {
  await withNanoServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/nano/x402/source-brief`);
    const body = await response.json() as Record<string, unknown>;
    const source = body.source as Record<string, unknown>;
    const metadata = body.paymentRequiredMetadata as Record<string, unknown>;
    const accepts = metadata.accepts as Array<Record<string, unknown>>;
    const gateway = body.gateway as Record<string, unknown>;

    assert.equal(response.status, 402);
    assert.equal(body.error, "payment_required");
    assert.equal(body.state, "payment_required");
    assert.equal(body.paid, false);
    assert.equal(body.unlocked, false);
    assert.equal(body.paymentRequired, true);
    assert.equal(body.unlockedPayload, null);
    assert.equal(source.sourceId, "nano-source-brief-stablecoin-payments");
    assert.equal(source.sourceTitle, "Stablecoin payments source brief");
    assert.equal(source.price, 0.001);
    assert.equal(source.currency, "USDC");
    assert.equal(source.chain, "Arc Testnet");
    assert.equal(source.paymentProtocol, "x402");
    assert.equal(source.paymentRail, "Circle Gateway Nanopayments-compatible");
    assert.equal(metadata.x402Version, 2);
    assert.equal((metadata.resource as Record<string, unknown>).url, "/api/nano/x402/source-brief");
    assert.equal(accepts[0].scheme, "exact");
    assert.equal(accepts[0].network, "eip155:5042002");
    assert.equal(accepts[0].asset, "USDC");
    assert.equal(accepts[0].amount, "1000");
    assert.equal(gateway.compatible, true);
    assert.equal(gateway.settlement, "not_verified");
    assert.equal(gateway.buyerProofRequired, true);
    assert.ok(response.headers.get("payment-required"));
    assert.equal(Object.prototype.hasOwnProperty.call(body, "txHash"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(body, "gatewayReceipt"), false);
  });
});

test("Nano x402 source brief does not unlock for invalid payment proof", async () => {
  await withNanoServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/nano/x402/source-brief?paymentProof=invalid`, {
      headers: {
        "PAYMENT-SIGNATURE": "invalid",
      },
    });
    const body = await response.json() as Record<string, unknown>;

    assert.equal(response.status, 402);
    assert.equal(body.paid, false);
    assert.equal(body.unlocked, false);
    assert.equal(body.unlockedPayload, null);
    assert.equal(Object.prototype.hasOwnProperty.call(body, "txHash"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(body, "gatewayReceipt"), false);
    assert.notEqual(body.state, "paid");
  });
});
