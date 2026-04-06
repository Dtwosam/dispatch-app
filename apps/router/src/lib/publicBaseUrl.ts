function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, "");
}

export function resolveRouterPublicBaseUrl() {
  const explicitBaseUrl = process.env.ROUTER_PUBLIC_BASE_URL?.trim();
  if (explicitBaseUrl) return normalizeBaseUrl(explicitBaseUrl);

  const renderExternalUrl = process.env.RENDER_EXTERNAL_URL?.trim();
  if (renderExternalUrl) return normalizeBaseUrl(renderExternalUrl);

  return "http://localhost:4020";
}

export function resolveAllowedOrigins() {
  const configured = (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .map(normalizeBaseUrl);

  if (configured.length) return new Set(configured);

  const defaults = new Set(["http://localhost:3005", "http://localhost:3000"]);
  const renderExternalUrl = process.env.RENDER_EXTERNAL_URL?.trim();
  if (renderExternalUrl) {
    defaults.add(normalizeBaseUrl(renderExternalUrl));
  }
  return defaults;
}
