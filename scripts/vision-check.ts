import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import { createEvent, loadEvent } from "../src/lib/service";
import { getStore } from "../src/lib/store";
import { interpretPhoto } from "../src/lib/vision";
import { reconcile } from "../src/lib/reconcile";
const store = getStore();
const { event } = await createEvent(
  store,
  "sample",
  "2026-09-27",
  "Asia/Kolkata",
);
mkdirSync("docs/evidence", { recursive: true });
const results = [];
for (const name of ["original", "table-removed", "renamed"]) {
  const bytes = await sharp(readFileSync(`public/samples/${name}.svg`))
    .png()
    .toBuffer();
  const started = Date.now();
  try {
    const result = await interpretPhoto(
      `data:image/png;base64,${bytes.toString("base64")}`,
      await loadEvent(store, event.id),
    );
    const preview = reconcile(event, result.draft, `check-${name}`);
    results.push({
      sample: name,
      elapsedMs: Date.now() - started,
      model: result.model,
      draft: result.draft,
      changes: preview.changes,
      conflicts: preview.conflicts,
    });
    console.log(
      JSON.stringify({
        sample: name,
        elapsedMs: Date.now() - started,
        changes: preview.changes.map((c) => c.kind),
        conflicts: preview.conflicts.map((c) => c.message),
      }),
    );
  } catch (error) {
    results.push({ sample: name, error: (error as Error).message });
    console.log(
      JSON.stringify({ sample: name, error: (error as Error).message }),
    );
    break;
  }
}
writeFileSync(
  "docs/evidence/vision-samples.json",
  JSON.stringify(
    {
      checkedAt: new Date().toISOString(),
      inputType:
        "Programmatically rendered typed sample sheets; not real handwriting.",
      results,
    },
    null,
    2,
  ) + "\n",
);
