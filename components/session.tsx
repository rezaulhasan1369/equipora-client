"use client";
import { createContext, useContext, type ReactNode } from "react";
import { authClient } from "@/lib/auth-client";
import type { User } from "@/lib/types";
const Context = createContext<{ user: User | null; pending: boolean }>({
  user: null,
  pending: true,
});
export function SessionProvider({ children }: { children: ReactNode }) {
  const { data, isPending } = authClient.useSession();
  const raw = data?.user;
  let user: User | null = null;
  if (
    raw &&
    "role" in raw &&
    ["customer", "owner", "admin"].includes(String(raw.role))
  )
    user = {
      id: raw.id,
      name: raw.name,
      email: raw.email,
      image: raw.image ?? undefined,
      role: raw.role as User["role"],
    };
  return <Context value={{ user, pending: isPending }}>{children}</Context>;
}
export const useSession = () => useContext(Context);
