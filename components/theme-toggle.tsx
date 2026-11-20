"use client";
import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
function subscribe(update: () => void) {
  window.addEventListener("equipora-theme", update);
  const storage = (e: StorageEvent) => {
    if (e.key !== "equipora-theme" && e.key !== null) return;
    const valid = e.newValue === "light" || e.newValue === "dark";
    document.documentElement.dataset.themePreference = valid
      ? "explicit"
      : "default";
    document.documentElement.dataset.theme = valid ? e.newValue! : "light";
    update();
  };
  window.addEventListener("storage", storage);
  return () => {
    window.removeEventListener("equipora-theme", update);
    window.removeEventListener("storage", storage);
  };
}
function snapshot() {
  return document.documentElement.dataset.theme === "dark";
}
export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, snapshot, () => false);
  return (
    <button
      className="btn btn-outline theme-toggle"
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      title={dark ? "Switch to light theme" : "Switch to dark theme"}
      aria-pressed={dark}
      onClick={() => {
        const theme = dark ? "light" : "dark";
        document.documentElement.dataset.theme = theme;
        document.documentElement.dataset.themePreference = "explicit";
        try {
          localStorage.setItem("equipora-theme", theme);
        } catch {
          /* Theme still works when browser storage is unavailable. */
        }
        window.dispatchEvent(new Event("equipora-theme"));
      }}
    >
      {dark ? (
        <Sun size={18} aria-hidden="true" />
      ) : (
        <Moon size={18} aria-hidden="true" />
      )}
      <span className="sr-only">{dark ? "Light theme" : "Dark theme"}</span>
    </button>
  );
}
