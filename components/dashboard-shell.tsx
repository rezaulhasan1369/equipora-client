"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import type { User } from "@/lib/types";
export function DashboardShell({
  user,
  children,
}: {
  user: User;
  children: ReactNode;
}) {
  const path = usePathname();
  const links =
    user.role === "admin"
      ? [
          ["/dashboard", "Overview"],
          ["/dashboard/users", "All users"],
          ["/dashboard/equipment", "All equipment"],
          ["/dashboard/rentals", "All rentals"],
        ]
      : user.role === "owner"
        ? [
            ["/dashboard", "Overview"],
            ["/dashboard/add-equipment", "Add equipment"],
            ["/dashboard/equipment", "My equipment"],
            ["/dashboard/rentals", "Equipment rentals"],
          ]
        : [
            ["/dashboard", "Overview"],
            ["/dashboard/rentals", "My rentals"],
            ["/dashboard/favorites", "Favorites"],
          ];
  return (
    <div className="dashboard-layout">
      <aside className="dashboard-sidebar">
        <p className="eyebrow">YOUR WORKSPACE</p>
        <div className="sidebar-user">
          <span className="avatar-placeholder">{user.name.slice(0, 1)}</span>
          <div>
            <strong>{user.name}</strong>
            <small>{user.role}</small>
          </div>
        </div>
        <nav aria-label="Dashboard navigation">
          {[...links, ["/dashboard/profile", "My profile"]].map(
            ([href, label]) => (
              <Link
                key={href}
                href={href}
                aria-current={path === href ? "page" : undefined}
              >
                {label}
              </Link>
            ),
          )}
        </nav>
        <Link href="/equipment" className="text-link">
          ← Back to equipment
        </Link>
      </aside>
      <section className="dashboard-content">{children}</section>
    </div>
  );
}
