import { tap } from "node:test/reporters";
import { finished } from "node:stream/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { run } from "node:test";

const entries = process.argv.slice(2);

async function main() {
  if (entries.length === 0) {
    return;
  }

  for (const entry of entries) {
    const absolutePath = resolve(process.cwd(), entry);
    await import(pathToFileURL(absolutePath).href);
  }

  let failed = false;
  const stream = run();
  stream.on("test:fail", () => {
    failed = true;
  });

  stream.compose(tap).pipe(process.stdout);
  await finished(stream);

  if (failed) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
