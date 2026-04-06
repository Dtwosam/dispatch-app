import http from "node:http";
import { readFileSync } from "node:fs";
import { extname, resolve } from "node:path";

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".wasm": "application/wasm",
};

const srcRoot = resolve("src");
const workspaceRoot = resolve("..", "..");
const nodeModulesRoot = resolve(workspaceRoot, "node_modules");
function safeResolve(root, relativePath) {
  const filePath = resolve(root, relativePath);
  if (!filePath.startsWith(root)) {
    throw new Error("Path escape is not allowed.");
  }
  return filePath;
}

function resolveModuleFile(root, relativePath) {
  const directPath = safeResolve(root, relativePath);
  const candidates = [directPath];
  if (!extname(directPath)) {
    candidates.push(`${directPath}.js`);
    candidates.push(`${directPath}.mjs`);
    candidates.push(resolve(directPath, "index.js"));
    candidates.push(resolve(directPath, "index.mjs"));
  }

  for (const candidate of candidates) {
    try {
      const body = readFileSync(candidate);
      return {
        filePath: candidate,
        body,
      };
    } catch {
      // try next candidate
    }
  }

  throw new Error("Module file not found.");
}

const server = http.createServer(async (req, res) => {
  const noCacheHeaders = {
    "cache-control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    pragma: "no-cache",
    expires: "0",
    "surrogate-control": "no-store",
  };

  if (req.url?.startsWith("/@modules/")) {
    try {
      const relativePath = req.url.replace(/^\/@modules\//, "");
      const { filePath, body } = resolveModuleFile(nodeModulesRoot, relativePath);
      const contentType = contentTypes[extname(filePath)] || "application/octet-stream";
      res.writeHead(200, { "content-type": contentType, ...noCacheHeaders });
      res.end(body);
    } catch {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8", ...noCacheHeaders });
      res.end("Module not found");
    }
    return;
  }

  if (req.url && (req.url.endsWith(".js") || req.url.endsWith(".css") || req.url.endsWith(".json"))) {
    try {
      const { filePath, body } = resolveModuleFile(srcRoot, req.url.replace(/^\//, ""));
      const contentType = contentTypes[extname(filePath)] || "application/octet-stream";
      res.writeHead(200, { "content-type": contentType, ...noCacheHeaders });
      res.end(body);
    } catch {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8", ...noCacheHeaders });
      res.end("Not found");
    }
    return;
  }

  const html = readFileSync(resolve(srcRoot, "index.html"), "utf8");
  res.writeHead(200, { "content-type": "text/html; charset=utf-8", ...noCacheHeaders });
  res.end(html);
});

const port = Number(process.env.PORT ?? 3000);
server.listen(port, () => {
  console.log(`web listening on ${port}`);
});
