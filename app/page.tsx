import { HomeView } from "@/components/home";
import { apiOrigin } from "@/lib/gateway";
import type { Equipment } from "@/lib/types";
export const dynamic = "force-dynamic";
export default async function Home() {
  let items: Equipment[] = [];
  let unavailable = false;
  try {
    const r = await fetch(apiOrigin() + "/api/equipment?featured=true", {
      cache: "no-store",
      signal: AbortSignal.timeout(7000),
    });
    if (!r.ok) throw new Error("Unavailable");
    items = (await r.json()).items;
  } catch {
    unavailable = true;
  }
  return <HomeView items={items} unavailable={unavailable} />;
}
