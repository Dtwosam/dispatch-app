import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { PlatformAgentBenchmarkSuiteResult } from "./platformAgentBenchmarks";

export type PlatformAgentEvalHistoryEntry = {
  generatedAt: string;
  benchmarkVersion: string;
  model: string | null;
  baseUrl: string | null;
  llmEnabled: boolean;
  total: number;
  passed: number;
  averageScore: number;
  profiles: PlatformAgentBenchmarkSuiteResult["profiles"];
  snapshotPath: string;
};

export type PersistedPlatformAgentEvalRun = {
  directory: string;
  latestPath: string;
  snapshotPath: string;
  indexPath: string;
  entry: PlatformAgentEvalHistoryEntry;
};

type PersistOptions = {
  model?: string | null;
  baseUrl?: string | null;
  maxEntries?: number;
};

const evalHistoryDir = new URL("../../.eval-history/platform-agents/", import.meta.url);
const latestResultPath = new URL("latest.json", evalHistoryDir);
const historyIndexPath = new URL("history.json", evalHistoryDir);

export async function persistPlatformAgentEvalRun(
  result: PlatformAgentBenchmarkSuiteResult,
  options: PersistOptions = {},
): Promise<PersistedPlatformAgentEvalRun> {
  const directory = fileUrlToWindowsPath(evalHistoryDir);
  await mkdir(directory, { recursive: true });

  const snapshotFileName = `${sanitizeTimestamp(result.generatedAt)}.json`;
  const snapshotUrl = new URL(snapshotFileName, evalHistoryDir);
  const snapshotPath = fileUrlToWindowsPath(snapshotUrl);
  const latestPath = fileUrlToWindowsPath(latestResultPath);
  const indexPath = fileUrlToWindowsPath(historyIndexPath);
  const llmEnabled = Boolean(options.model?.trim());

  const entry: PlatformAgentEvalHistoryEntry = {
    generatedAt: result.generatedAt,
    benchmarkVersion: result.benchmarkVersion,
    model: options.model?.trim() || null,
    baseUrl: options.baseUrl?.trim() || null,
    llmEnabled,
    total: result.total,
    passed: result.passed,
    averageScore: result.averageScore,
    profiles: result.profiles,
    snapshotPath,
  };

  await writeJson(snapshotPath, {
    metadata: entry,
    suite: result,
  });

  await writeJson(latestPath, {
    metadata: entry,
    suite: result,
  });

  const maxEntries = options.maxEntries ?? 50;
  const history = await readHistoryIndex(indexPath);
  const nextHistory = [entry, ...history.filter((item) => item.generatedAt !== entry.generatedAt)].slice(0, maxEntries);
  await writeJson(indexPath, nextHistory);

  return {
    directory,
    latestPath,
    snapshotPath,
    indexPath,
    entry,
  };
}

async function readHistoryIndex(path: string): Promise<PlatformAgentEvalHistoryEntry[]> {
  try {
    const raw = await readFile(path, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as PlatformAgentEvalHistoryEntry[]) : [];
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/ENOENT/i.test(message)) {
      return [];
    }
    throw error;
  }
}

async function writeJson(path: string, value: unknown) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function sanitizeTimestamp(timestamp: string) {
  return timestamp.replace(/[:.]/g, "-");
}

function fileUrlToWindowsPath(url: URL) {
  return decodeURIComponent(url.pathname.replace(/^\//, "").replace(/\//g, "\\"));
}
