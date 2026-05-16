import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(root, "..", "..");

const requiredFiles = [
  path.join(repoRoot, "contracts", "marketplace", "marketplace.py"),
  path.join(root, "marketplace", "task_escrow.py"),
  path.join(root, "marketplace", "agent_registry.py"),
  path.join(root, ".generated", "task_escrow.py"),
  path.join(root, ".generated", "agent_registry.py"),
];

for (const file of requiredFiles) {
  await access(file);
  const content = await readFile(file, "utf8");
  if (!content.includes("from genlayer import *") || !content.includes("gl.Contract")) {
    throw new Error(`${path.relative(repoRoot, file)} is not a GenLayer contract artifact.`);
  }
}

console.log("GenLayer contract artifacts are present and deployment-ready:");
for (const file of requiredFiles) {
  console.log(`- ${path.relative(repoRoot, file)}`);
}
