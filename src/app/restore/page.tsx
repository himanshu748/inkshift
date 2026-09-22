import { ProductShell } from "@/components/product-shell";
import { RestoreAccess } from "@/components/organizer-access";
export const metadata = {
  title: "Restore organizer access · INKSHIFT",
  robots: { index: false, follow: false },
};
export default function Page() {
  return (
    <ProductShell>
      <RestoreAccess />
    </ProductShell>
  );
}
