import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
if (existsSync(".env.local")) loadEnvFile(".env.local");
const check = process.argv.includes("--check");
const result = spawnSync(
  process.execPath,
  [
    "node_modules/@sanity/workflow-cli/bin/run.js",
    "deploy",
    "--no-share-defs",
    ...(check ? ["--check"] : []),
  ],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      SANITY_AUTH_TOKEN:
        process.env.SANITY_API_TOKEN ?? process.env.SANITY_AUTH_TOKEN,
    },
  },
);
if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);
