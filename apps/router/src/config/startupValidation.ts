import { resolveDatabaseUrl } from "../db/postgresStore";

type StartupValidationResult = {
  errors: string[];
  warnings: string[];
};

export function validateRouterStartupEnv(): StartupValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const hosted = isHostedRuntime();
  const hasDatabase = Boolean(resolveDatabaseUrl());
  const hasFileStore = Boolean(process.env.ROUTER_STORE_PATH?.trim());

  if (hosted && !process.env.EVALUATOR_BASE_URL?.trim()) {
    errors.push("EVALUATOR_BASE_URL is required for hosted router deployments.");
  }
  if (hosted && !process.env.ROUTER_PUBLIC_BASE_URL?.trim()) {
    errors.push("ROUTER_PUBLIC_BASE_URL is required for hosted router deployments.");
  }
  if (hosted && !process.env.ALLOWED_ORIGINS?.trim()) {
    errors.push("ALLOWED_ORIGINS is required for hosted router deployments.");
  }
  if (hosted && !process.env.ROUTER_AGENT_SHARED_SECRET?.trim()) {
    errors.push("ROUTER_AGENT_SHARED_SECRET is required for hosted router deployments.");
  }
  if (hosted && !process.env.ROUTER_CALLBACK_SECRET?.trim()) {
    errors.push("ROUTER_CALLBACK_SECRET is required for hosted router deployments.");
  }
  if (hosted && !hasDatabase && !hasFileStore) {
    errors.push("Set SUPABASE_DATABASE_URL or DATABASE_URL for Postgres persistence, or provide ROUTER_STORE_PATH as a fallback.");
  }

  for (const key of [
    "ARC_RPC_URL",
    "ARC_BROWSER_RPC_URL",
    "ARC_CHAIN_ID",
    "ARC_CHAIN_KEY",
    "ARC_CHAIN_MODE",
    "ARC_NETWORK_NAME",
    "ARC_TASK_MARKETPLACE_ADDRESS",
    "ARC_AGENT_REGISTRY_ADDRESS",
    "ARC_EXPLORER_BASE_URL",
  ]) {
    if (hosted && !process.env[key]?.trim()) {
      errors.push(`${key} is required for hosted Arc router deployments.`);
    }
  }

  if (!hasDatabase) {
    warnings.push("Postgres persistence is not configured; router will fall back to file-based snapshot persistence.");
  }

  return { errors, warnings };
}

function isHostedRuntime() {
  return Boolean(
    process.env.RENDER ||
    process.env.RENDER_SERVICE_NAME ||
    process.env.RENDER_EXTERNAL_URL ||
    process.env.RAILWAY_SERVICE_NAME,
  );
}
