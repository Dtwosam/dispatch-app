function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, "");
}

const defaultAllowedOrigins = [
  "http://localhost:3005",
  "http://localhost:3000",
  "https://dispatch-arc.vercel.app",
];

const localOriginPattern = /^http:\/\/(?:localhost|127\.0\.0\.1):\d+$/i;
const dispatchVercelPreviewOriginPattern = /^https:\/\/dispatch-[a-z0-9-]+(?:-[a-z0-9-]+)*\.vercel\.app$/i;

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

  const origins = new Set([...defaultAllowedOrigins, ...configured]);

  const renderExternalUrl = process.env.RENDER_EXTERNAL_URL?.trim();
  if (renderExternalUrl) {
    origins.add(normalizeBaseUrl(renderExternalUrl));
  }
  return origins;
}

export function isAllowedOrigin(origin: string | undefined, allowedOrigins = resolveAllowedOrigins()) {
  if (!origin) return false;
  return (
    allowedOrigins.has(normalizeBaseUrl(origin)) ||
    localOriginPattern.test(origin) ||
    dispatchVercelPreviewOriginPattern.test(origin)
  );
}
