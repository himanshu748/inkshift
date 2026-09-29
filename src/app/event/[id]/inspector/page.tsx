import { Inspector } from "@/components/sanity-live";
import { ids } from "@/lib/store";
export default async function InspectorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <Inspector id={id} publicProjectionId={ids.public(id)} />;
}
