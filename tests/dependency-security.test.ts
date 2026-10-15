import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import { createServer, type Socket } from "node:net";
import { mkdtemp, writeFile, unlink, rmdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import nodemailer from "nodemailer";
import { loadConfigFromFile } from "@prisma/config";

const prismaRequire = createRequire(import.meta.resolve("@prisma/config"));
const { deepmerge } = prismaRequire("deepmerge-ts") as {
  deepmerge: (...values: any[]) => any;
};

describe("Patched dependency boundaries", () => {
  it("merges recursive and shared config graphs without stack exhaustion", () => {
    const shared = { name: "shared" };
    const first: any = { first: shared, second: shared };
    first.self = first;
    const result = deepmerge(first, { enabled: true });
    expect(result.self).toBe(result);
    expect(result.first).toBe(result.second);
    expect(result.enabled).toBe(true);
    expect(first.enabled).toBeUndefined();
  });

  it("does not pollute prototypes through parsed configuration keys", () => {
    const input = JSON.parse('{"__proto__":{"bookflowPolluted":true}}');
    const result = deepmerge({ safe: true }, input);
    expect(result.safe).toBe(true);
    expect(({} as Record<string, unknown>).bookflowPolluted).toBeUndefined();
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
    expect(result.bookflowPolluted).toBeUndefined();
  });

  it("loads explicit Prisma configuration through the overridden merger", async () => {
    const root = await mkdtemp(join(tmpdir(), "bookflow-prisma-config-"));
    const file = join(root, "prisma.config.mjs");
    try {
      await writeFile(file, 'export default { schema: "schema.prisma", migrations: { path: "migrations" } };');
      const loaded = await loadConfigFromFile({ configRoot: root, configFile: file });
      expect(loaded.error).toBeUndefined();
      expect(loaded.config?.schema).toBe(join(root, "schema.prisma"));
      expect(loaded.config?.migrations?.path).toBe(join(root, "migrations"));
    } finally {
      await unlink(file);
      await rmdir(root);
    }
  });

  it("sends a recovery-shaped message to loopback without EHLO command injection", async () => {
    const commands: string[] = [], messages: string[] = [];
    const sockets = new Set<Socket>();
    const server = createServer((socket) => {
      sockets.add(socket);
      socket.on("close", () => sockets.delete(socket));
      socket.write("220 localhost BookFlow test SMTP\r\n");
      let buffer = "", data = false, message = "";
      socket.on("data", (chunk) => {
        buffer += chunk.toString();
        let end: number;
        while ((end = buffer.indexOf("\r\n")) !== -1) {
          const line = buffer.slice(0, end);
          buffer = buffer.slice(end + 2);
          if (data) {
            if (line === ".") {
              data = false; messages.push(message); message = "";
              socket.write("250 Message accepted\r\n");
            } else message += line + "\r\n";
          } else {
            commands.push(line);
            if (line.startsWith("EHLO ") || line.startsWith("HELO ")) socket.write("250 localhost\r\n");
            else if (line === "DATA") { data = true; socket.write("354 Send message\r\n"); }
            else if (line === "QUIT") socket.end("221 Bye\r\n");
            else socket.write("250 OK\r\n");
          }
        }
      });
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Missing SMTP test port");
    const mail = {
      from: "BookFlow <no-reply@bookflow.example>",
      to: "visitor@bookflow.example",
      subject: "Reset your BookFlow password",
      text: "Reset your password within one hour: https://bookflow.example/reset?token=fictional",
    };
    try {
      const transport = nodemailer.createTransport(`smtp://127.0.0.1:${address.port}`);
      const sent = await transport.sendMail(mail);
      expect(sent.accepted).toContain(mail.to);
      expect(messages[0]).toContain("Subject: Reset your BookFlow password");
      expect(messages[0].replaceAll("=\r\n", "")).toContain("https://bookflow.example/reset?token=3Dfictional");
      const malicious = nodemailer.createTransport({
        host: "127.0.0.1", port: address.port,
        name: "bookflow\r\nMAIL FROM:<injected@attacker.example>",
        connectionTimeout: 2000, socketTimeout: 2000,
      });
      await malicious.sendMail(mail).catch(() => undefined);
      expect(commands).not.toContain("MAIL FROM:<injected@attacker.example>");
      expect(commands.filter((line) => line.startsWith("MAIL FROM:")).every(
        (line) => line === "MAIL FROM:<no-reply@bookflow.example>",
      )).toBe(true);
    } finally {
      for (const socket of sockets) socket.destroy();
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });
});
