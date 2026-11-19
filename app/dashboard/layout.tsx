import { redirect } from "next/navigation";
import { serverSession } from "@/lib/server-session";
import { DashboardShell } from "@/components/dashboard-shell";
import type { ReactNode } from "react";
export const dynamic = "force-dynamic";
export default async function Layout({ children }: { children: ReactNode }) {
  const user = await serverSession();
  if (!user) redirect("/login?returnTo=/dashboard");
  return <DashboardShell user={user}>{children}</DashboardShell>;
}
