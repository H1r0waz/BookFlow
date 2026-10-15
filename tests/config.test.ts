import { describe, it, expect } from "vitest";
import { readConfig } from "../server/config.js";
const production = {
  NODE_ENV: "production",
  APP_ORIGIN: "https://bookflow.example.invalid",
  DATABASE_URL:
    "postgresql://runtime:placeholder@db.invalid/bookflow?sslmode=require",
};
describe("Deployment configuration", () => {
  it("starts a same-origin public demo with secure defaults and no SMTP", () => {
    expect(readConfig(production)).toMatchObject({
      production: true,
      host: "0.0.0.0",
      port: 3001,
      recovery: "disabled",
      proxyHops: 0,
    });
  });
  it("keeps development loopback and local recovery", () => {
    expect(readConfig({})).toMatchObject({
      host: "127.0.0.1",
      origin: "http://127.0.0.1:5173",
      recovery: "local",
    });
  });
  it.each([
    "",
    "http://demo.invalid",
    "https://demo.invalid/path",
    "https://demo.invalid/",
    "https://user:pass@demo.invalid",
  ])("rejects unsafe production origins: %s", (origin) => {
    expect(() => readConfig({ ...production, APP_ORIGIN: origin })).toThrow();
  });
  it("restricts proxy trust and dynamic port values", () => {
    expect(
      readConfig({ ...production, PORT: "10000", TRUST_PROXY_HOPS: "1" }),
    ).toMatchObject({ port: 10000, proxyHops: 1 });
    for (const value of ["-1", "2", "true"])
      expect(() =>
        readConfig({ ...production, TRUST_PROXY_HOPS: value }),
      ).toThrow();
    for (const value of ["0", "65536", "hello"])
      expect(() => readConfig({ ...production, PORT: value })).toThrow();
  });
  it("never writes production recovery links to local files", () => {
    expect(() =>
      readConfig({ ...production, PASSWORD_RESET_MODE: "local" }),
    ).toThrow();
  });
  it("requires explicit SMTP configuration and database", () => {
    expect(() =>
      readConfig({ ...production, PASSWORD_RESET_MODE: "smtp" }),
    ).toThrow();
    expect(() => readConfig({ ...production, DATABASE_URL: "" })).toThrow();
  });
});
