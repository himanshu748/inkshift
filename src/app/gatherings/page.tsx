import { ProductShell } from "@/components/product-shell";
import { Gatherings } from "@/components/gatherings";
export const metadata = {
  title: "Your gatherings · INKSHIFT",
  robots: { index: false, follow: false },
};
export default function Page() {
  return (
    <ProductShell>
      <Gatherings />
    </ProductShell>
  );
}
