import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { InMemoryRegistryStore } from "./store";

const DEFAULT_STORE_PATH = path.resolve(process.cwd(), "apps/router/.data/router-store.json");

export async function createPersistedRegistryStore(filePath = process.env.ROUTER_STORE_PATH || DEFAULT_STORE_PATH) {
  const store = new InMemoryRegistryStore();
  try {
    const raw = await readFile(filePath, "utf8");
    store.importSnapshot(JSON.parse(raw));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.warn(`router store restore failed: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  }

  let persistScheduled = false;
  let persistInFlight = false;

  const persist = async () => {
    if (persistInFlight) return;
    persistInFlight = true;
    try {
      await mkdir(path.dirname(filePath), { recursive: true });
      const tempPath = `${filePath}.tmp`;
      await writeFile(tempPath, JSON.stringify(store.exportSnapshot(), null, 2), "utf8");
      await rename(tempPath, filePath);
    } catch (error) {
      console.warn(`router store persist failed: ${error instanceof Error ? error.message : "unknown error"}`);
    } finally {
      persistInFlight = false;
    }
  };

  const schedulePersist = () => {
    if (persistScheduled) return;
    persistScheduled = true;
    setTimeout(async () => {
      persistScheduled = false;
      await persist();
    }, 150);
  };

  store.setChangeHandler(schedulePersist);

  const flushAndExit = async () => {
    await persist();
  };

  process.once("SIGINT", () => {
    void flushAndExit();
  });
  process.once("SIGTERM", () => {
    void flushAndExit();
  });
  process.once("beforeExit", () => {
    void flushAndExit();
  });

  return store;
}
