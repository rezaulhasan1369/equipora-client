"use client";
import { cleanIds, restoredIds } from "./discovery-policy.mjs";
const empty: string[] = [];
function createStore(key: string, limit: number) {
  let current = empty;
  const listeners = new Set<() => void>();
  function update(next: string[]) {
    if (next.join(",") === current.join(",")) return;
    current = next;
    listeners.forEach((listener) => listener());
  }
  function restore() {
    try {
      update(restoredIds(localStorage.getItem(key), limit));
    } catch {
      /* Keep this tab's memory when storage is blocked. */
    }
  }
  function storage(event: StorageEvent) {
    if (event.key === key || event.key === null) restore();
  }
  return {
    restore,
    getSnapshot: () => current,
    getServerSnapshot: () => empty,
    subscribe(listener: () => void) {
      listeners.add(listener);
      if (listeners.size === 1) {
        window.addEventListener("storage", storage);
        restore();
      }
      return () => {
        listeners.delete(listener);
        if (!listeners.size) window.removeEventListener("storage", storage);
      };
    },
    set(ids: string[]) {
      if (typeof window === "undefined") return;
      const next = cleanIds(ids, limit);
      try {
        if (next.length) localStorage.setItem(key, JSON.stringify(next));
        else localStorage.removeItem(key);
      } catch {
        /* In-memory use remains available. */
      }
      update(next);
    },
  };
}
export const compareStore = createStore("equipora-compare-v1", 3);
