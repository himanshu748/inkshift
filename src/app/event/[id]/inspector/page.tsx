import { Inspector } from "@/components/sanity-live";
export default async function InspectorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <Inspector id={(await params).id} />;
}
