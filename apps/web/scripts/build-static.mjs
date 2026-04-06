import { build } from "esbuild";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(__dirname, "..");
const workspaceRoot = resolve(appRoot, "..", "..");
const srcRoot = resolve(appRoot, "src");
const outRoot = resolve(appRoot, ".vercel-static");
const nodeModulesRoot = resolve(workspaceRoot, "node_modules");
const configuredApiBase = (process.env.DISPATCH_API_BASE || "").trim();

const moduleAliasPlugin = {
  name: "dispatch-module-alias",
  setup(buildContext) {
    buildContext.onResolve({ filter: /^\/@modules\// }, (args) => ({
      path: resolveModulePath(args.path),
    }));
  },
};

rmSync(outRoot, { recursive: true, force: true });
mkdirSync(outRoot, { recursive: true });

await build({
  absWorkingDir: workspaceRoot,
  entryPoints: [resolve(srcRoot, "app.js")],
  bundle: true,
  format: "esm",
  platform: "browser",
  target: ["es2020"],
  outfile: resolve(outRoot, "app.js"),
  plugins: [moduleAliasPlugin],
});

cpSync(resolve(srcRoot, "styles.css"), resolve(outRoot, "styles.css"));
cpSync(resolve(nodeModulesRoot, "pdfjs-dist", "build", "pdf.worker.mjs"), resolve(outRoot, "@modules", "pdfjs-dist", "build", "pdf.worker.mjs"), { recursive: true });
cpSync(resolve(nodeModulesRoot, "mammoth", "mammoth.browser.js"), resolve(outRoot, "@modules", "mammoth", "mammoth.browser.js"), { recursive: true });
cpSync(resolve(nodeModulesRoot, "tesseract.js", "dist"), resolve(outRoot, "@modules", "tesseract.js", "dist"), { recursive: true });
cpSync(resolve(nodeModulesRoot, "tesseract.js-core"), resolve(outRoot, "@modules", "tesseract.js-core"), { recursive: true });

const rawHtml = readFileSync(resolve(srcRoot, "index.html"), "utf8");
const withoutImportMap = rawHtml.replace(/\s*<script type="importmap">[\s\S]*?<\/script>\s*/m, "\n");
const withApiMeta = withoutImportMap.replace(
  '<meta name="viewport" content="width=device-width, initial-scale=1.0" />',
  `<meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <meta name="dispatch-api-base" content="${escapeHtmlAttribute(configuredApiBase)}" />`,
);

writeFileSync(resolve(outRoot, "index.html"), withApiMeta);

function escapeHtmlAttribute(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function resolveModulePath(importPath) {
  if (importPath === "/@modules/tesseract.js/dist/tesseract.esm.min.js") {
    return resolve(nodeModulesRoot, "tesseract.js", "src", "index.js");
  }
  return resolve(nodeModulesRoot, importPath.replace(/^\/@modules\//, ""));
}
