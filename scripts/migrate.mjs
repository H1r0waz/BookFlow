import "dotenv/config";
import { spawnSync } from "node:child_process";
const result = spawnSync(
  process.execPath,
  ["node_modules/prisma/build/index.js", "migrate", "deploy"],
  {
    env: {
      ...process.env,
      DATABASE_URL: process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL,
    },
    stdio: "inherit",
  },
);
if (result.error) throw result.error;
process.exit(result.status ?? 1);
