import test from "node:test";
import assert from "node:assert/strict";
import { resolveDatabaseUrl } from "../src/db/postgresStore";
import { validateRouterStartupEnv } from "../src/config/startupValidation";

test("resolveDatabaseUrl prefers SUPABASE_DATABASE_URL over DATABASE_URL", () => {
  const originalSupabase = process.env.SUPABASE_DATABASE_URL;
  const originalDatabase = process.env.DATABASE_URL;
  process.env.SUPABASE_DATABASE_URL = "postgres://supabase";
  process.env.DATABASE_URL = "postgres://generic";

  try {
    assert.equal(resolveDatabaseUrl(), "postgres://supabase");
  } finally {
    restoreEnv("SUPABASE_DATABASE_URL", originalSupabase);
    restoreEnv("DATABASE_URL", originalDatabase);
  }
});

test("hosted router validation requires database and core runtime env", () => {
  const snapshot = captureEnv([
    "RENDER_SERVICE_NAME",
    "SUPABASE_DATABASE_URL",
    "DATABASE_URL",
    "ROUTER_STORE_PATH",
    "EVALUATOR_BASE_URL",
    "ROUTER_PUBLIC_BASE_URL",
    "ALLOWED_ORIGINS",
    "ROUTER_AGENT_SHARED_SECRET",
    "ROUTER_CALLBACK_SECRET",
    "NODE_ENV",
    "OWNER_PROOF_VERIFIER_URL",
    "ALLOW_INSECURE_DEV_OWNER_PROOFS",
    "ARC_RPC_URL",
    "ARC_BROWSER_RPC_URL",
    "ARC_CHAIN_ID",
    "ARC_CHAIN_KEY",
    "ARC_CHAIN_MODE",
    "ARC_NETWORK_NAME",
    "ARC_TASK_MARKETPLACE_ADDRESS",
    "ARC_AGENT_REGISTRY_ADDRESS",
    "ARC_PAYMENT_TOKEN_ADDRESS",
    "ARC_EXPLORER_BASE_URL",
    "ARC_SERVER_WALLET_ADDRESS",
    "ARC_SERVER_PRIVATE_KEY",
  ]);

  process.env.RENDER_SERVICE_NAME = "dispatch-router";
  for (const key of Object.keys(snapshot).filter((key) => key !== "RENDER_SERVICE_NAME")) {
    process.env[key] = "";
  }
  process.env.NODE_ENV = "production";
  process.env.ARC_CHAIN_MODE = "browser_wallet";

  try {
    const result = validateRouterStartupEnv();
    const errors = result.errors.join("\n");
    assert.ok(result.errors.some((item) => item.includes("SUPABASE_DATABASE_URL") || item.includes("DATABASE_URL")));
    assert.ok(result.errors.some((item) => item.includes("EVALUATOR_BASE_URL")));
    assert.match(errors, /ARC_TASK_MARKETPLACE_ADDRESS/);
    assert.match(errors, /ARC_PAYMENT_TOKEN_ADDRESS/);
    assert.match(errors, /ARC_SERVER_PRIVATE_KEY/);
    assert.match(errors, /OWNER_PROOF_VERIFIER_URL/);
  } finally {
    restoreMany(snapshot);
  }
});

function captureEnv(keys: string[]) {
  return Object.fromEntries(keys.map((key) => [key, process.env[key]]));
}

function restoreMany(snapshot: Record<string, string | undefined>) {
  for (const [key, value] of Object.entries(snapshot)) {
    restoreEnv(key, value);
  }
}

function restoreEnv(key: string, value: string | undefined) {
  if (typeof value === "string") process.env[key] = value;
  else delete process.env[key];
}
