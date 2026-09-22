import { ProductShell } from "@/components/product-shell";
import { NewGathering } from "@/components/new-gathering";
export const metadata = { title: "New gathering · INKSHIFT" };
export default function Page() {
  return (
    <ProductShell>
      <NewGathering />
    </ProductShell>
  );
}
