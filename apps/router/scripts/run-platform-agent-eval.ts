import { runPlatformAgentBenchmarkSuite } from "../src/evals/platformAgentBenchmarks";
import { persistPlatformAgentEvalRun } from "../src/evals/platformAgentEvalHistory";

const result = await runPlatformAgentBenchmarkSuite();
const persisted = await persistPlatformAgentEvalRun(result, {
  model: process.env.PLATFORM_AGENT_LLM_MODEL ?? null,
  baseUrl: process.env.PLATFORM_AGENT_LLM_BASE_URL ?? null,
});

console.log(`Platform agent eval generated at ${result.generatedAt}`);
console.log(`Benchmark version: ${result.benchmarkVersion}`);
console.log(`Passed ${result.passed}/${result.total} benchmarks | average score ${result.averageScore}`);
console.log("");
console.log(`Baseline profile: ${result.profiles.baseline.passed}/${result.profiles.baseline.total} | avg ${result.profiles.baseline.averageScore}`);
console.log(`Adversarial profile: ${result.profiles.adversarial.passed}/${result.profiles.adversarial.total} | avg ${result.profiles.adversarial.averageScore}`);
console.log("");

for (const item of result.results) {
  console.log(`${item.passed ? "PASS" : "FAIL"} [${item.profile}] ${item.agentId} :: ${item.title} :: score ${item.score}`);
  for (const check of item.checks) {
    console.log(`  - ${check.passed ? "ok" : "x"} ${check.label} :: ${check.detail}`);
  }
}

console.log("");
console.log(`Saved latest eval snapshot to ${persisted.latestPath}`);
console.log(`Saved historical snapshot to ${persisted.snapshotPath}`);
