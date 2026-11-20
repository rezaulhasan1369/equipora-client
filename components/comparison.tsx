"use client";
import Link from "next/link";
import { money, type Equipment } from "@/lib/types";
import { useDiscovery } from "./discovery";
import { EquipmentVisual } from "./equipment-visual";
const fields: { label: string; value: (item: Equipment) => string }[] = [
  { label: "Category", value: (i) => i.category },
  {
    label: "Rental rate",
    value: (i) => `${money(i.price * 100)} / ${i.rentalType}`,
  },
  { label: "Location", value: (i) => i.location },
  {
    label: "Availability",
    value: (i) =>
      i.quantity > 0 ? `${i.quantity} available` : "Currently unavailable",
  },
  { label: "Condition", value: (i) => i.condition || "Not provided" },
  { label: "Brand", value: (i) => i.brand || "Not provided" },
  { label: "Model", value: (i) => i.model || "Not provided" },
  { label: "Rental terms", value: (i) => i.terms || "Not provided" },
];
export function Comparison() {
  const { items, ids, loading, error, remove, clear, retry } = useDiscovery();
  return (
    <div className="container section discovery-page">
      <p className="eyebrow">A CLEARER CHOICE</p>
      <h1>Find your best fit.</h1>
      <p className="lead">
        Compare current approved listings side by side. Choose what works for
        your project.
      </p>
      <div className="discovery-toolbar">
        <Link className="text-link" href="/equipment">
          Back to all equipment
        </Link>
        {ids.length > 0 && (
          <button className="text-link" onClick={clear}>
            Clear all items
          </button>
        )}
      </div>
      <p className="discovery-note">
        Daily, weekly and monthly rates use different billing periods. A lower
        displayed price does not mean a lower cost for the same rental period.
      </p>
      {loading ? (
        <div
          className="discovery-skeleton"
          role="status"
          aria-label="Refreshing comparison"
        >
          <span />
          <span />
          <span />
        </div>
      ) : error ? (
        <div className="alert alert-error" role="alert">
          {error}
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={retry}
          >
            Retry comparison
          </button>
        </div>
      ) : !items.length ? (
        <div className="empty-state">
          <h2>Your comparison starts here.</h2>
          <p>
            Select up to three items from the catalog. Deleted or unapproved
            listings are removed when refreshed.
          </p>
          <Link href="/equipment" className="btn btn-primary">
            Explore equipment
          </Link>
        </div>
      ) : (
        <>
          <div className="comparison-desktop">
            <table className="comparison-table">
              <caption>Current approved equipment comparison</caption>
              <thead>
                <tr>
                  <th scope="col">What matters</th>
                  {items.map((item) => (
                    <th key={item.id} scope="col">
                      <EquipmentVisual
                        item={item}
                        className="comparison-image"
                      />
                      <Link href={`/equipment/${item.id}`}>{item.name}</Link>
                      <button
                        className="text-link"
                        onClick={() => remove(item.id)}
                        aria-label={`Remove ${item.name}`}
                      >
                        Remove
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fields.map((field) => (
                  <tr key={field.label}>
                    <th scope="row">{field.label}</th>
                    {items.map((item) => (
                      <td key={item.id}>{field.value(item)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="comparison-mobile">
            {items.map((item) => (
              <article key={item.id} className="comparison-card">
                <EquipmentVisual item={item} className="comparison-image" />
                <h2>
                  <Link href={`/equipment/${item.id}`}>{item.name}</Link>
                </h2>
                <dl>
                  {fields.map((field) => (
                    <div key={field.label}>
                      <dt>{field.label}</dt>
                      <dd>{field.value(item)}</dd>
                    </div>
                  ))}
                </dl>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => remove(item.id)}
                >
                  Remove {item.name}
                </button>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
