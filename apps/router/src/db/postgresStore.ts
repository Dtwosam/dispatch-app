import { Pool } from "pg";
import { InMemoryRegistryStore } from "./store";

const DEFAULT_STORE_KEY = process.env.ROUTER_STORE_KEY?.trim() || "dispatch_router_store";

export function resolveDatabaseUrl() {
  return process.env.SUPABASE_DATABASE_URL?.trim() || process.env.DATABASE_URL?.trim() || "";
}

export async function createPostgresBackedRegistryStore(databaseUrl = resolveDatabaseUrl(), storeKey = DEFAULT_STORE_KEY) {
  if (!databaseUrl) {
    throw new Error("A Postgres connection string is required. Set SUPABASE_DATABASE_URL or DATABASE_URL.");
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: shouldUseSsl(databaseUrl) ? { rejectUnauthorized: false } : undefined,
    max: 5,
  });

  const store = new InMemoryRegistryStore();
  await initializeSnapshotTable(pool);

  try {
    const restored = await pool.query<{ snapshot: unknown }>(
      "select snapshot from dispatch_state_snapshots where store_key = $1 limit 1",
      [storeKey],
    );
    const snapshot = restored.rows[0]?.snapshot;
    if (snapshot && typeof snapshot === "object") {
      store.importSnapshot(snapshot as Record<string, unknown>);
    }
  } catch (error) {
    console.warn(`router store restore failed: ${error instanceof Error ? error.message : "unknown error"}`);
  }

  let persistScheduled = false;
  let persistInFlight = false;

  const persist = async () => {
    if (persistInFlight) return;
    persistInFlight = true;
    try {
      await pool.query(
        `insert into dispatch_state_snapshots (store_key, snapshot, updated_at)
         values ($1, $2::jsonb, now())
         on conflict (store_key)
         do update set snapshot = excluded.snapshot, updated_at = now()`,
        [storeKey, JSON.stringify(store.exportSnapshot())],
      );
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

  const flushAndClose = async () => {
    await persist();
    await pool.end().catch(() => undefined);
  };

  process.once("SIGINT", () => {
    void flushAndClose();
  });
  process.once("SIGTERM", () => {
    void flushAndClose();
  });
  process.once("beforeExit", () => {
    void flushAndClose();
  });

  return store;
}

async function initializeSnapshotTable(pool: Pool) {
  await pool.query(`
    create table if not exists dispatch_state_snapshots (
      store_key text primary key,
      snapshot jsonb not null,
      updated_at timestamptz not null default now()
    )
  `);
}

function shouldUseSsl(databaseUrl: string) {
  return /supabase\.co|render\.com|render\.internal/i.test(databaseUrl);
}
