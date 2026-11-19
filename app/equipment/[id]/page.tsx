import { redirect } from "next/navigation";
import { serverSession } from "@/lib/server-session";
import { Details } from "@/components/details";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[a-f0-9]{24}$/i.test(id)) redirect("/equipment");
  if (!(await serverSession()))
    redirect("/login?returnTo=" + encodeURIComponent("/equipment/" + id));
  return <Details id={id} />;
}
