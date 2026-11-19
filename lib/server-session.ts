import "server-only";
import { cookies } from "next/headers";
import { apiOrigin } from "./gateway";
import type { User } from "./types";
export async function serverSession() {
  const jar = await cookies();
  const response = await fetch(apiOrigin() + "/api/auth/get-session", {
    headers: { cookie: jar.toString() },
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("Session service unavailable");
  const body = await response.json();
  return body?.user as User | null;
}
