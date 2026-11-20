"use client";
import { useEffect, useSyncExternalStore } from "react";
import { recentStore } from "@/lib/discovery-store";
import { useApprovedSelection } from "./discovery";
import { EquipmentCard } from "./equipment-card";
export function RecentlyViewed() {
  const ids = useSyncExternalStore(
    recentStore.subscribe,
    recentStore.getSnapshot,
    recentStore.getServerSnapshot,
  );
  const { items, loading, error, retry } = useApprovedSelection(ids);
  useEffect(() => {
    if (!loading && !error && ids.length) {
      const approved = new Set(items.map((item) => item.id));
      recentStore.set(ids.filter((id) => approved.has(id)));
    }
  }, [ids, items, loading, error]);
  return (
    <section className="recently-viewed" aria-labelledby="recent-title">
      <div className="results-heading">
        <div>
          <p className="eyebrow">PICK UP WHERE YOU LEFT OFF</p>
          <h2 id="recent-title">Recently viewed.</h2>
        </div>
        {ids.length > 0 && (
          <button className="text-link" onClick={() => recentStore.set([])}>
            Clear history
          </button>
        )}
      </div>
      <p className="small-print">
        Up to eight listings, saved only on this device. Availability is
        refreshed.
      </p>
      {loading ? (
        <div
          className="discovery-skeleton"
          role="status"
          aria-label="Loading recently viewed equipment"
        >
          <span />
          <span />
        </div>
      ) : error ? (
        <div role="alert" className="alert alert-error">
          {error}
          <button className="btn btn-outline btn-sm" onClick={retry}>
            Retry history
          </button>
        </div>
      ) : items.length ? (
        <div className="recent-grid">
          {items.map((item) => (
            <EquipmentCard key={item.id} item={item} comparison />
          ))}
        </div>
      ) : (
        <p className="recent-empty">
          Equipment you open will appear here. Your browsing history is never
          saved to your account.
        </p>
      )}
    </section>
  );
}
