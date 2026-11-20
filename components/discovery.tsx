"use client";
import Link from "next/link";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { Scale, X } from "lucide-react";
import { api } from "@/lib/api";
import type { Equipment } from "@/lib/types";
import { compareStore } from "@/lib/discovery-store";

export function useApprovedSelection(ids: string[]) {
  const [revision, retry] = useState(0);
  const idKey = ids.join(","),
    key = idKey + "|" + revision;
  const [result, setResult] = useState<{
    key: string;
    items: Equipment[];
    error: string;
  }>({ key: "", items: [], error: "" });
  useEffect(() => {
    if (!idKey) return;
    let active = true;
    api<{ items: Equipment[] }>(
      "equipment/selection?ids=" + idKey,
      "GET",
      undefined,
      false,
    )
      .then((data) => {
        if (active)
          setResult({
            key,
            items: data.items.filter(
              (item) =>
                item.status === "approved" &&
                idKey.split(",").includes(item.id),
            ),
            error: "",
          });
      })
      .catch(() => {
        if (active)
          setResult({
            key,
            items: [],
            error: "We couldn’t refresh these listings. Please try again.",
          });
      });
    return () => {
      active = false;
    };
  }, [idKey, key]);
  useEffect(() => {
    const refresh = () => retry((v) => v + 1);
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);
  return {
    items: !idKey || result.key !== key ? [] : result.items,
    loading: Boolean(idKey) && result.key !== key,
    error: result.key === key ? result.error : "",
    retry: () => retry((v) => v + 1),
  };
}
type Discovery = {
  ids: string[];
  items: Equipment[];
  loading: boolean;
  error: string;
  message: string;
  toggle: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
  retry: () => void;
};
const Context = createContext<Discovery | null>(null);
export function useDiscovery() {
  const value = useContext(Context);
  if (!value) throw new Error("Comparison provider is missing");
  return value;
}
export function DiscoveryProvider({ children }: { children: ReactNode }) {
  const ids = useSyncExternalStore(
    compareStore.subscribe,
    compareStore.getSnapshot,
    compareStore.getServerSnapshot,
  );
  const selection = useApprovedSelection(ids);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!selection.loading && !selection.error && ids.length) {
      const approved = new Set(selection.items.map((item) => item.id));
      compareStore.set(ids.filter((id) => approved.has(id)));
    }
  }, [ids, selection.items, selection.loading, selection.error]);
  const value = useMemo<Discovery>(
    () => ({
      ids,
      ...selection,
      message,
      toggle(id) {
        const selected = compareStore.getSnapshot();
        if (selected.includes(id)) {
          compareStore.set(selected.filter((value) => value !== id));
          setMessage("Equipment removed from comparison.");
        } else if (selected.length >= 3)
          setMessage(
            "Compare up to three items. Remove one before adding another.",
          );
        else {
          compareStore.set([...selected, id]);
          setMessage("Equipment added to comparison.");
        }
      },
      remove(id) {
        compareStore.set(
          compareStore.getSnapshot().filter((value) => value !== id),
        );
        setMessage("Equipment removed from comparison.");
      },
      clear() {
        compareStore.set([]);
        setMessage("");
      },
    }),
    [ids, selection, message],
  );
  return (
    <Context value={value}>
      {children}
      <ComparisonTray />
    </Context>
  );
}
export function CompareButton({ item }: { item: Equipment }) {
  const { ids, toggle } = useDiscovery();
  const selected = ids.includes(item.id);
  return (
    <button
      type="button"
      className="compare-button"
      aria-label={`Compare ${item.name}`}
      aria-pressed={selected}
      onClick={() => toggle(item.id)}
    >
      <Scale size={16} aria-hidden="true" />
      {selected ? "Selected" : "Compare"}
    </button>
  );
}
function ComparisonTray() {
  const { ids, items, remove, clear, message } = useDiscovery();
  if (!ids.length) return null;
  return (
    <>
      <div className="comparison-reserve" aria-hidden="true" />
      <aside
        className="comparison-tray"
        aria-label="Selected equipment comparison"
      >
        <div>
          <strong>
            <Scale size={18} aria-hidden="true" /> Compare {ids.length} of 3
          </strong>
          <p role="status" className="comparison-message">
            {message || "Your selection stays on this device."}
          </p>
        </div>
        <ul>
          {ids.map((id, index) => {
            const name =
              items.find((item) => item.id === id)?.name ?? `Item ${index + 1}`;
            return (
              <li key={id}>
                <span>{name}</span>
                <button
                  type="button"
                  onClick={() => remove(id)}
                  aria-label={`Remove ${name} from comparison`}
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
        <div className="comparison-tray-actions">
          <Link className="btn btn-primary btn-sm" href="/compare">
            Compare items
          </Link>
          <button type="button" className="text-link" onClick={clear}>
            Clear comparison
          </button>
        </div>
      </aside>
    </>
  );
}
