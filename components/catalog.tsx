"use client";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, SlidersHorizontal } from "lucide-react";
import { api } from "@/lib/api";
import { categories, type Equipment } from "@/lib/types";
import { EquipmentCard } from "./equipment-card";
export function Catalog() {
  const search = useSearchParams(),
    router = useRouter();
  type Result = {
    items: Equipment[];
    total: number;
    page: number;
    limit: number;
  };
  const [version, setVersion] = useState(0);
  const query = search.toString(),
    key = query + "|" + version;
  const [result, setResult] = useState<{
    key: string;
    data: Result | null;
    error: string;
  }>({ key: "", data: null, error: "" });
  const data = result.key === key ? result.data : null,
    error = result.key === key ? result.error : "";
  useEffect(() => {
    let active = true;
    api<Result>("equipment?" + query, "GET", undefined, false)
      .then((v) => {
        if (active) setResult({ key, data: v, error: "" });
      })
      .catch((e) => {
        if (active) setResult({ key, data: null, error: e.message });
      });
    return () => {
      active = false;
    };
  }, [query, key]);
  function submit(form: FormData) {
    const p = new URLSearchParams();
    for (const [key, value] of form)
      if (String(value)) p.set(key, String(value));
    router.push("/equipment?" + p.toString());
  }
  function page(n: number) {
    const p = new URLSearchParams(query);
    p.set("page", String(n));
    router.push("/equipment?" + p.toString());
  }
  return (
    <div className="container section">
      <p className="eyebrow">THE RIGHT TOOL. THE RIGHT TIME.</p>
      <h1>Find your next possibility.</h1>
      <p className="demo-note">
        PORTFOLIO DEMONSTRATION | SYNTHETIC INVENTORY | USD TEST RATES
      </p>
      <p className="lead">
        Browse equipment, compare your options, and make it happen.
      </p>
      <form action={submit} className="filter-form" key={query}>
        <label className="search-field">
          <span>Search equipment or location</span>
          <div>
            <Search size={18} />
            <input
              className="input"
              name="search"
              defaultValue={search.get("search") ?? ""}
              placeholder="Camera, excavator, Dhaka…"
              maxLength={100}
            />
          </div>
        </label>
        <label>
          Category
          <select
            className="select"
            name="category"
            aria-label="Category"
            defaultValue={search.get("category") ?? ""}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          Rental type
          <select
            className="select"
            name="rentalType"
            aria-label="Rental type"
            defaultValue={search.get("rentalType") ?? ""}
          >
            <option value="">Any period</option>
            {["daily", "weekly", "monthly"].map((t) => (
              <option value={t} key={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label>
          Min price ($)
          <input
            className="input"
            name="min"
            type="number"
            min="0"
            step="0.01"
            defaultValue={search.get("min") ?? ""}
          />
        </label>
        <label>
          Max price ($)
          <input
            className="input"
            name="max"
            type="number"
            min="0"
            step="0.01"
            defaultValue={search.get("max") ?? ""}
          />
        </label>
        <label>
          Availability
          <select
            className="select"
            name="available"
            aria-label="Availability"
            defaultValue={search.get("available") ?? ""}
          >
            <option value="">All listings</option>
            <option value="true">Available</option>
            <option value="false">Unavailable</option>
          </select>
        </label>
        <label>
          Sort by
          <select
            className="select"
            name="sort"
            aria-label="Sort by"
            defaultValue={search.get("sort") ?? "recent"}
          >
            <option value="recent">Recently added</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
          </select>
        </label>
        <button className="btn btn-primary" type="submit">
          <SlidersHorizontal size={16} /> Apply filters
        </button>
      </form>
      {error ? (
        <div className="alert alert-error" role="alert">
          {error}
          <button
            className="btn btn-sm"
            onClick={() => setVersion((v) => v + 1)}
          >
            Try again
          </button>
        </div>
      ) : !data ? (
        <div className="loading-state" role="status">
          <span className="loading loading-spinner" /> Loading equipment…
        </div>
      ) : (
        <>
          <div className="results-heading">
            <strong>
              {data.total} equipment listing{data.total === 1 ? "" : "s"}
            </strong>
            <button
              className="text-link"
              onClick={() => router.push("/equipment")}
            >
              Clear filters
            </button>
          </div>
          <div className="equipment-grid">
            {data.items.map((item) => (
              <EquipmentCard item={item} key={item.id} comparison />
            ))}
          </div>
          {!data.items.length && (
            <div className="empty-state">
              <Search size={30} />
              <h2>No equipment matches yet.</h2>
              <p>Try another category, location, or price range.</p>
            </div>
          )}
          <nav className="pagination" aria-label="Equipment pages">
            <button
              className="btn btn-outline btn-sm"
              disabled={data.page <= 1}
              onClick={() => page(data.page - 1)}
            >
              Previous
            </button>
            <span role="status" aria-live="polite">
              Page {data.page} of{" "}
              {Math.max(1, Math.ceil(data.total / data.limit))}
            </span>
            <button
              className="btn btn-outline btn-sm"
              disabled={data.page * data.limit >= data.total}
              onClick={() => page(data.page + 1)}
            >
              Next
            </button>
          </nav>
        </>
      )}
    </div>
  );
}
