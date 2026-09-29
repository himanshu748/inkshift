import { createClient } from "@sanity/client";
import { migratePublicProjections } from "../src/lib/public-projection-migration";

const args = process.argv.slice(2);
if (args.some((arg) => arg !== "--apply" && !/^--limit=\d+$/.test(arg)))
  throw new Error("Usage: migrate-public-projections.ts [--apply] [--limit=200]");
const projectId = process.env.SANITY_PROJECT_ID;
const token = process.env.SANITY_API_TOKEN ?? process.env.SANITY_AUTH_TOKEN;
if (!projectId || !token) throw new Error("Set SANITY_PROJECT_ID and a server Sanity token.");
const client = createClient({
  projectId, token, dataset: process.env.SANITY_DATASET ?? "production",
  apiVersion: "2026-09-01", useCdn: false, perspective: "raw",
});
const report = await migratePublicProjections(client, {
  apply: args.includes("--apply"),
  limit: Number(args.find((arg) => arg.startsWith("--limit="))?.split("=")[1] ?? 200),
});
console.log(JSON.stringify(report, null, 2));
if (report.skipped || report.conflicts) process.exitCode = 2;
