import test from "node:test";
import assert from "node:assert/strict";
import { isAllowedOrigin, resolveAllowedOrigins } from "../src/lib/publicBaseUrl";

test("resolveAllowedOrigins keeps Dispatch defaults when custom origins are configured", () => {
  const originalAllowedOrigins = process.env.ALLOWED_ORIGINS;
  const originalRenderExternalUrl = process.env.RENDER_EXTERNAL_URL;
  process.env.ALLOWED_ORIGINS = "https://custom.dispatch.example";
  process.env.RENDER_EXTERNAL_URL = "https://dispatch-router.onrender.com";

  try {
    const origins = resolveAllowedOrigins();
    assert.ok(origins.has("https://custom.dispatch.example"));
    assert.ok(origins.has("https://dispatch-arc.vercel.app"));
    assert.ok(origins.has("https://dispatch-router.onrender.com"));
  } finally {
    restoreEnv("ALLOWED_ORIGINS", originalAllowedOrigins);
    restoreEnv("RENDER_EXTERNAL_URL", originalRenderExternalUrl);
  }
});

test("isAllowedOrigin allows Dispatch Vercel previews without wildcard CORS", () => {
  const allowedOrigins = new Set(["https://dispatch-arc.vercel.app"]);

  assert.equal(
    isAllowedOrigin("https://dispatch-n058jp9zz-dtwoflicks-2878s-projects.vercel.app", allowedOrigins),
    true,
  );
  assert.equal(isAllowedOrigin("https://dispatch-arc.vercel.app", allowedOrigins), true);
  assert.equal(isAllowedOrigin("http://localhost:3001", allowedOrigins), true);
  assert.equal(isAllowedOrigin("https://not-dispatch.vercel.app", allowedOrigins), false);
});

function restoreEnv(key: string, value: string | undefined) {
  if (typeof value === "string") process.env[key] = value;
  else delete process.env[key];
}
