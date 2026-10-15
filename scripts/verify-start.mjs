import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
assert.equal(pkg.scripts.start, "node dist-server/index.js");
const child = spawn(process.execPath, ["dist-server/index.js"], {
  env: { ...process.env, PORT: "3002" },
  stdio: ["ignore", "pipe", "pipe"],
});
try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () =>
        reject(new Error("Compiled backend did not start within 10 seconds")),
      10000,
    );
    child.stdout.once("data", () => {
      clearTimeout(timer);
      resolve();
    });
    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once("exit", (code) => {
      clearTimeout(timer);
      reject(new Error("Compiled backend exited: " + code));
    });
  });
  const response = await fetch("http://127.0.0.1:3002/api/health");
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "ok" });
  console.log("Compiled backend start and database health: PASS");
} finally {
  child.kill();
}
