import { json } from "@/lib/http";
import { visionAvailable } from "@/lib/service";
import { getStore } from "@/lib/store";
export const dynamic = "force-dynamic";
export async function GET() {
  return json({
    storage: getStore().kind,
    visionAvailable: visionAvailable(),
    projectId: process.env.SANITY_PROJECT_ID ?? null,
  });
}
