import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

test("параллельные процессы применяют миграции к пустой БД", async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), "silk-migrations-"));
  const script = path.join(temp, "migrate.mjs");
  await writeFile(script, `const {db} = await import(${JSON.stringify(pathToFileURL(path.join(process.cwd(), "lib/db.ts")).href)}); db.$client.close();`);
  try {
    const results = await Promise.all(Array.from({ length: 6 }, () => new Promise<{ code: number | null; output: string }>((resolve) => {
      const child = spawn(process.execPath, ["--import", "tsx", script], {
        cwd: process.cwd(),
        env: { ...process.env, TURSO_DATABASE_URL: `file:${path.join(temp, "app.db")}`, TURSO_AUTH_TOKEN: "" },
      });
      let output = "";
      child.stdout.on("data", (chunk) => { output += chunk; });
      child.stderr.on("data", (chunk) => { output += chunk; });
      child.on("close", (code) => resolve({ code, output }));
    })));
    for (const result of results) assert.equal(result.code, 0, result.output);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});
