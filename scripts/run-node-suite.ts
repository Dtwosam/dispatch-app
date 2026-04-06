import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";

type SuiteEntry = {
  file: string;
  pattern?: string;
  timeoutMs?: number;
};

async function main() {
  const manifestPath = process.argv[2];
  if (!manifestPath) {
    throw new Error("Expected a manifest path");
  }

  const absoluteManifestPath = path.resolve(process.cwd(), manifestPath);
  const raw = await readFile(absoluteManifestPath, "utf8");
  const entries = JSON.parse(raw) as SuiteEntry[];
  let failed = false;

  for (const entry of entries) {
    const args = ["--import", "tsx", "--test"];
    if (entry.pattern) {
      args.push("--test-name-pattern", entry.pattern);
    }
    args.push(path.resolve(process.cwd(), entry.file));
    const label = entry.pattern ? `${entry.file} :: ${entry.pattern}` : entry.file;
    process.stdout.write(`\n[router-test-suite] ${label}\n`);
    const exitCode = await runNode(args, entry.timeoutMs ?? 120000);
    if (exitCode !== 0) {
      failed = true;
      process.stderr.write(`[router-test-suite] failed: ${label}\n`);
    }
  }

  if (failed) {
    process.exitCode = 1;
  }
}

async function runNode(args: string[], timeoutMs: number) {
  return new Promise<number>((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: process.cwd(),
      stdio: "inherit",
      env: process.env,
    });
    const timeout = setTimeout(() => {
      child.kill();
      resolve(124);
    }, timeoutMs);
    child.on("error", reject);
    child.on("exit", (code) => {
      clearTimeout(timeout);
      resolve(code ?? 1);
    });
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
