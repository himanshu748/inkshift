import { Workspace } from "@/components/workspace";
export default async function EventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <Workspace id={(await params).id} />;
}
