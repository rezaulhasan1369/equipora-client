import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
export const metadata = { title: "Log in" };
export default function Page() {
  return (
    <Suspense fallback={<div className="container section">Loading…</div>}>
      <AuthForm register={false} />
    </Suspense>
  );
}
