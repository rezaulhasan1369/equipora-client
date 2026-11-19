import { Suspense } from "react";
import { Catalog } from "@/components/catalog";
export const metadata = { title: "All equipment" };
export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="container section" role="status">
          Loading equipment…
        </div>
      }
    >
      <Catalog />
    </Suspense>
  );
}
