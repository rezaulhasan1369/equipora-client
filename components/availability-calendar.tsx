"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { RentalPeriod } from "./rental-breakdown";
type Day = { date: string; remaining: number; available: boolean };
export function AvailabilityCalendar({
  id,
  period,
  onChange,
}: {
  id: string;
  period: RentalPeriod;
  onChange: (p: RentalPeriod) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [month, setMonth] = useState(today.slice(0, 7)),
    [mode, setMode] = useState<"start" | "end">("start"),
    [focused, setFocused] = useState(""),
    [revision, setRevision] = useState(0),
    [notice, setNotice] = useState("");
  const grid = useRef<HTMLDivElement>(null);
  const first = month + "-01",
    next =
      new Date(Date.parse(first) + 32 * 86400000).toISOString().slice(0, 7) +
      "-01";
  const from = first < today ? today : first,
    key = [id, from, next, period.quantity, revision].join("|");
  const [result, setResult] = useState<{
    key: string;
    days: Day[];
    error: string;
  }>({ key: "", days: [], error: "" });
  const validQuantity =
    Number.isInteger(period.quantity) &&
    period.quantity >= 1 &&
    period.quantity <= 10000;
  useEffect(() => {
    if (!validQuantity) return;
    let active = true;
    api<{ days: Day[] }>(
      `equipment/${id}/availability?start=${from}&end=${next}&quantity=${period.quantity}`,
    )
      .then((r) => {
        if (active) setResult({ key, days: r.days, error: "" });
      })
      .catch(() => {
        if (active)
          setResult({
            key,
            days: [],
            error: "Availability could not be loaded. Try again.",
          });
      });
    return () => {
      active = false;
    };
  }, [key, id, from, next, period.quantity, validQuantity]);
  const days = result.key === key ? result.days : [],
    loading = validQuantity && result.key !== key;
  const monthDays = Array.from(
    { length: Math.round((Date.parse(next) - Date.parse(first)) / 86400000) },
    (_, i) =>
      new Date(Date.parse(first) + i * 86400000).toISOString().slice(0, 10),
  );
  const enabled = (d: string) =>
    d >= today &&
    (mode === "end"
      ? !!period.start && d > period.start
      : !!days.find((x) => x.date === d)?.available);
  const activeDate =
    monthDays.includes(focused) && enabled(focused)
      ? focused
      : monthDays.find(enabled);
  function choose(d: string) {
    setNotice("");
    if (mode === "start") {
      onChange({ ...period, start: d, end: period.end > d ? period.end : "" });
      setMode("end");
      requestAnimationFrame(() =>
        grid.current
          ?.querySelector<HTMLButtonElement>("button:not([disabled])")
          ?.focus({ preventScroll: true }),
      );
    } else {
      if (
        days.some((x) => x.date >= period.start && x.date < d && !x.available)
      ) {
        setNotice(
          "This range includes dates unavailable for your quantity. Choose another range.",
        );
        return;
      }
      onChange({ ...period, end: d });
      setMode("start");
      requestAnimationFrame(() => {
        const start = grid.current?.querySelector<HTMLButtonElement>(
          `button[data-date="${period.start}"]:not([disabled])`,
        );
        (
          start ??
          grid.current?.querySelector<HTMLButtonElement>(
            "button:not([disabled])",
          )
        )?.focus({ preventScroll: true });
      });
    }
  }
  function moveMonth(step: number) {
    const d = new Date(first);
    d.setUTCMonth(d.getUTCMonth() + step);
    setMonth(d.toISOString().slice(0, 7));
    setNotice("");
  }
  return (
    <section
      className="rental-calendar"
      aria-label="Equipment availability calendar"
    >
      <div className="calendar-heading">
        <button
          type="button"
          className="btn btn-outline btn-sm"
          aria-label="Previous availability month"
          disabled={month <= today.slice(0, 7)}
          onClick={() => moveMonth(-1)}
        >
          Previous
        </button>
        <h3 aria-live="polite">
          {new Date(first).toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
            timeZone: "UTC",
          })}
        </h3>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          aria-label="Next availability month"
          disabled={month >= "9999-11"}
          onClick={() => moveMonth(1)}
        >
          Next
        </button>
      </div>
      <p className="small-print">
        Choose a start, then an exclusive end date. Quantity:{" "}
        {validQuantity ? period.quantity : "choose a valid quantity"}.
        Availability is a snapshot; checkout verifies stock again. Unshown dates
        are not guaranteed.
      </p>
      <div className="calendar-mode">
        <button
          type="button"
          className="btn btn-outline btn-sm"
          aria-pressed={mode === "start"}
          onClick={() => setMode("start")}
        >
          Select start
        </button>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          disabled={!period.start}
          aria-pressed={mode === "end"}
          onClick={() => setMode("end")}
        >
          Select end
        </button>
      </div>
      {!validQuantity ? (
        <p role="status">Enter a valid quantity to check dates.</p>
      ) : loading ? (
        <p role="status">Checking availability…</p>
      ) : result.error ? (
        <p role="alert">
          {result.error}
          <button
            type="button"
            className="text-link"
            onClick={() => setRevision((v) => v + 1)}
          >
            Retry availability
          </button>
        </p>
      ) : (
        <>
          <p className="small-print">
            Available / Full · The selected end day is not rented. Use arrow
            keys to move by day or week.
          </p>
          <div className="calendar-weekdays" aria-hidden="true">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div
            ref={grid}
            className="calendar-days"
            role="group"
            aria-label="Rental dates"
            onKeyDown={(e) => {
              const deltas: Record<string, number> = {
                ArrowLeft: -1,
                ArrowRight: 1,
                ArrowUp: -7,
                ArrowDown: 7,
              };
              if (!(e.key in deltas) && e.key !== "Home" && e.key !== "End")
                return;
              const current = (e.target as HTMLElement).dataset.date;
              if (!current) return;
              e.preventDefault();
              let n =
                e.key === "Home"
                  ? 0
                  : e.key === "End"
                    ? monthDays.length - 1
                    : monthDays.indexOf(current) + deltas[e.key];
              while (n >= 0 && n < monthDays.length && !enabled(monthDays[n]))
                n += e.key === "End" || deltas[e.key] < 0 ? -1 : 1;
              if (n >= 0 && n < monthDays.length)
                grid.current
                  ?.querySelector<HTMLButtonElement>(
                    `button[data-date="${monthDays[n]}"]`,
                  )
                  ?.focus();
            }}
          >
            {Array.from({ length: new Date(first).getUTCDay() }, (_, i) => (
              <span key={"blank" + i} aria-hidden="true" />
            ))}
            {monthDays.map((d) => {
              const day = days.find((x) => x.date === d),
                selected = period.start === d || period.end === d;
              return (
                <button
                  type="button"
                  key={d}
                  data-date={d}
                  disabled={!enabled(d)}
                  tabIndex={activeDate === d ? 0 : -1}
                  aria-describedby={"availability-" + id + "-" + d}
                  aria-pressed={selected}
                  onFocus={() => setFocused(d)}
                  onClick={() => choose(d)}
                  className={
                    day?.available ? "calendar-available" : "calendar-full"
                  }
                >
                  <strong>{Number(d.slice(-2))}</strong>{" "}
                  <small>
                    {d < today ? "Past" : day?.available ? "Available" : "Full"}
                  </small>
                  <span
                    className="sr-only"
                    aria-hidden="true"
                    id={"availability-" + id + "-" + d}
                  >
                    {d}, {day?.remaining ?? 0} remaining
                    {mode === "end" ? ", exclusive end date" : ""}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
      {notice && <p role="alert">{notice}</p>}
    </section>
  );
}
