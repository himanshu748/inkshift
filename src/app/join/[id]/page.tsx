import { Join } from "@/components/join";
export default async function JoinPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <Join id={(await params).id} />;
}
