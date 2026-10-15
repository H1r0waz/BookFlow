import "dotenv/config";
import { spawn } from "node:child_process";
import assert from "node:assert/strict";
const origin = "https://bookflow.example.invalid";
const base = "http://127.0.0.1:3004";
const child = spawn(process.execPath, ["dist-server/index.js"], {
  env: {
    ...process.env,
    NODE_ENV: "production",
    APP_ORIGIN: origin,
    HOST: "127.0.0.1",
    PORT: "3004",
    PASSWORD_RESET_MODE: "disabled",
    TRUST_PROXY_HOPS: "1",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Production startup timeout")),
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
      reject(new Error("Production startup exited: " + code));
    });
  });
  assert.equal((await fetch(base + "/api/health")).status, 200);
  const page = await fetch(base + "/calendar");
  assert.equal(page.status, 200);
  assert.match(await page.text(), /BookFlow/);
  const headers = {
    "Content-Type": "application/json",
    Origin: origin,
    "X-Forwarded-Proto": "https",
  };
  const login = await fetch(base + "/api/auth/login", {
    method: "POST",
    headers,
    body: JSON.stringify({
      email: "demo@bookflow.example",
      password: "BookFlowDemo!2026",
    }),
  });
  assert.equal(login.status, 200);
  const cookie = login.headers.get("set-cookie");
  assert.ok(cookie);
  for (const flag of ["HttpOnly", "Secure", "SameSite=Lax", "Path=/"])
    assert.ok(cookie.includes(flag));
  const sessionCookie = cookie.split(";")[0];
  const { csrf } = await login.json();
  assert.equal(
    (await fetch(base + "/api/me", { headers: { Cookie: sessionCookie } }))
      .status,
    200,
  );
  const badOrigin = await fetch(base + "/api/auth/login", {
    method: "POST",
    headers: { ...headers, Origin: "https://untrusted.example.invalid" },
    body: "{}",
  });
  assert.equal(badOrigin.status, 403);
  assert.equal(badOrigin.headers.get("access-control-allow-origin"), null);
  assert.equal(
    (
      await fetch(base + "/api/appointments", {
        method: "POST",
        headers: { ...headers, Cookie: sessionCookie },
        body: "{}",
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await fetch(base + "/api/auth/forgot", {
        method: "POST",
        headers,
        body: JSON.stringify({ email: "demo@bookflow.example" }),
      })
    ).status,
    503,
  );
  assert.equal(
    (
      await fetch(base + "/api/auth/reset", {
        method: "POST",
        headers,
        body: "{}",
      })
    ).status,
    503,
  );
  assert.equal(
    (
      await fetch(base + "/api/logout", {
        method: "POST",
        headers: { ...headers, Cookie: sessionCookie, "X-CSRF-Token": csrf },
        body: "{}",
      })
    ).status,
    200,
  );
  assert.equal(
    (await fetch(base + "/api/me", { headers: { Cookie: sessionCookie } }))
      .status,
    401,
  );
  console.log(
    "Production-mode local smoke: PASS (SPA routes, health, Secure/HttpOnly/SameSite cookies, session, Origin/CSRF, disabled recovery, logout). TLS itself is NOT tested.",
  );
} finally {
  child.kill();
}
