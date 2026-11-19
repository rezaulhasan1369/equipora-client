import { redirect } from "next/navigation";
import { serverSession } from "@/lib/server-session";
import { PaymentSuccess } from "@/components/dashboard";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  if (!(await serverSession())) redirect("/login?returnTo=/dashboard/rentals");
  const { session_id } = await searchParams;
  if (!session_id || !/^cs_[a-zA-Z0-9_]+$/.test(session_id))
    redirect("/dashboard/rentals");
  return (
    <div className="container section">
      <PaymentSuccess sessionId={session_id} />
    </div>
  );
}
