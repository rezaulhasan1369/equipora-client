"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { money, type Equipment } from "@/lib/types";
export type RentalPeriod = { start: string; end: string; quantity: number };
type Estimate = RentalPeriod & {
  equipmentId: string;
  days: number;
  units: number;
  unitPriceCents: number;
  rentalType: string;
  totalCents: number;
  subtotalCents: number;
  estimate: true;
};
export function useRentalEstimate(
  id: string,
  available: number,
  period: RentalPeriod,
  enabled: boolean,
) {
  const [attempt, retry] = useState(0);
  const { start, end, quantity } = period;
  const valid =
    enabled &&
    /^\d{4}-\d{2}-\d{2}$/.test(start) &&
    /^\d{4}-\d{2}-\d{2}$/.test(end) &&
    end > start &&
    Number.isInteger(quantity) &&
    quantity > 0 &&
    quantity <= available;
  const key = [id, start, end, quantity, attempt, enabled].join("|");
  const [result, setResult] = useState<{
    key: string;
    quote: Estimate | null;
    error: string;
  }>({ key: "", quote: null, error: "" });
  useEffect(() => {
    if (!valid) return;
    let active = true;
    const timer = setTimeout(() => {
      api<Estimate>(`equipment/${id}/quote`, "POST", { start, end, quantity })
        .then((quote) => {
          if (
            quote.equipmentId !== id ||
            quote.start !== start ||
            quote.end !== end ||
            quote.quantity !== quantity ||
            !Number.isSafeInteger(quote.totalCents) ||
            quote.totalCents < 0 ||
            quote.subtotalCents !== quote.totalCents
          )
            throw new Error(
              "We couldn’t verify this estimate. Please try again.",
            );
          if (active) setResult({ key, quote, error: "" });
        })
        .catch((error) => {
          if (active)
            setResult({
              key,
              quote: null,
              error:
                error instanceof Error ? error.message : "Estimate unavailable",
            });
        });
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [valid, id, start, end, quantity, key]);
  return {
    quote: valid && result.key === key ? result.quote : null,
    error: valid && result.key === key ? result.error : "",
    loading: valid && result.key !== key,
    retry: () => retry((v) => v + 1),
  };
}
export function RentalBreakdown({
  item,
  period,
  estimate,
}: {
  item: Equipment;
  period: RentalPeriod;
  estimate: ReturnType<typeof useRentalEstimate>;
}) {
  const { quote, loading, error, retry } = estimate;
  return (
    <section className="rental-breakdown" aria-labelledby="breakdown-title">
      <h3 id="breakdown-title">Your rental, clearly.</h3>
      <dl>
        <div>
          <dt>Equipment</dt>
          <dd>{item.name}</dd>
        </div>
        <div>
          <dt>Rental dates</dt>
          <dd>
            {period.start && period.end
              ? `${period.start} → ${period.end}`
              : "Choose your dates"}
          </dd>
        </div>
        <div>
          <dt>Duration</dt>
          <dd>
            {quote
              ? `${quote.days} day${quote.days === 1 ? "" : "s"} · ${quote.units} ${quote.rentalType} billing period${quote.units === 1 ? "" : "s"}`
              : "Calculated by the server"}
          </dd>
        </div>
        <div>
          <dt>Required quantity</dt>
          <dd>
            {Number.isFinite(period.quantity) && period.quantity > 0
              ? period.quantity
              : "Choose a quantity"}
          </dd>
        </div>
        <div>
          <dt>Unit rental price</dt>
          <dd>
            {money(quote?.unitPriceCents ?? Math.round(item.price * 100))} /{" "}
            {quote?.rentalType ?? item.rentalType}
          </dd>
        </div>
        <div>
          <dt>Rental subtotal</dt>
          <dd>{quote ? money(quote.subtotalCents) : "—"}</dd>
        </div>
      </dl>
      <p className="quote" role="status">
        Estimated total <strong>{quote ? money(quote.totalCents) : "—"}</strong>
      </p>
      {loading && (
        <p className="small-print" role="status">
          Refreshing the server estimate…
        </p>
      )}
      {!quote && !loading && !error && (
        <p className="small-print">
          Choose valid dates and a quantity within the listed availability.
        </p>
      )}
      {error && (
        <p className="alert alert-error" role="alert">
          {error}
          <button type="button" className="text-link" onClick={retry}>
            Retry estimate
          </button>
        </p>
      )}
      <p className="small-print">
        Server-calculated estimate, not an availability guarantee. Final
        availability and total are validated at Stripe Checkout. No additional
        charges are included.
      </p>
    </section>
  );
}
