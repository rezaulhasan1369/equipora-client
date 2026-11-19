"use client";
import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
function subscribe(update: () => void) {
  window.addEventListener("equipora-theme", update);
  const media = matchMedia("(prefers-color-scheme: dark)");
  const system = () => {
    if (document.documentElement.dataset.themePreference !== "explicit") {
      document.documentElement.dataset.theme = media.matches ? "dark" : "light";
      update();
    }
  };
  const storage = (e: StorageEvent) => {
    if (e.key !== "equipora-theme") return;
    const valid = e.newValue === "light" || e.newValue === "dark";
    document.documentElement.dataset.themePreference = valid
      ? "explicit"
      : "system";
    document.documentElement.dataset.theme = valid
      ? e.newValue!
      : media.matches
        ? "dark"
        : "light";
    update();
  };
  window.addEventListener("storage", storage);
  media.addEventListener("change", system);
  return () => {
    window.removeEventListener("equipora-theme", update);
    window.removeEventListener("storage", storage);
    media.removeEventListener("change", system);
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
      {dark ? <Sun size={16} /> : <Moon size={16} />}{" "}
      {dark ? "Light theme" : "Dark theme"}
    </button>
  );
}
