"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useSession } from "./session";
import { api } from "@/lib/api";
import { money, type Equipment } from "@/lib/types";
import { Heart, MapPin, ShieldCheck, X } from "lucide-react";
import { CompareButton } from "./discovery";
import { EquipmentVisual } from "./equipment-visual";
import { EquipmentSharing } from "./equipment-sharing";
import { rememberEquipment } from "@/lib/discovery-store";
import {
  RentalBreakdown,
  useRentalEstimate,
  type RentalPeriod,
} from "./rental-breakdown";
export function Details({ id: requestedId }: { id: string }) {
  const id = requestedId.toLowerCase();
  const { user } = useSession(),
    [item, setItem] = useState<Equipment | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [modal, setModal] = useState(false),
    [busy, setBusy] = useState(false),
    [period, setPeriod] = useState<RentalPeriod>({
      start: "",
      end: "",
      quantity: 1,
    });
  const dialogRef = useRef<HTMLDialogElement>(null);
  const bookButton = useRef<HTMLButtonElement>(null);
  const [version, setVersion] = useState(0);
  const estimate = useRentalEstimate(id, item?.quantity ?? 0, period, modal);
  function closeBooking() {
    setModal(false);
    requestAnimationFrame(() => bookButton.current?.focus());
  }
  useEffect(() => {
    const d = dialogRef.current;
    if (modal && d && !d.open) {
      d.showModal();
      return () => {
        if (d.open) d.close();
      };
    }
  }, [modal]);
  useEffect(() => {
    let active = true;
    api<Equipment>("equipment/" + id)
      .then((value) => {
        if (active) {
          setItem(value);
          setError("");
          if (value.status === "approved") rememberEquipment(value.id);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [id, version]);
  async function book(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget);
    try {
      const r = await api<{ url: string }>("checkout", "POST", {
        equipmentId: id,
        start: form.get("start"),
        end: form.get("end"),
        quantity: Number(form.get("quantity")),
        phone: form.get("phone"),
        address: form.get("address"),
        notes: form.get("notes"),
      });
      const url = new URL(r.url);
      if (url.protocol !== "https:" || url.hostname !== "checkout.stripe.com")
        throw new Error("Unexpected checkout destination");
      window.location.assign(url.href);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Booking failed");
    } finally {
      setBusy(false);
    }
  }
  if (!item || item.id !== id)
    return (
      <div className="container section">
        {error ? (
          <div role="alert" className="alert alert-error">
            {error}
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => {
                setError("");
                setVersion((v) => v + 1);
              }}
            >
              Retry equipment
            </button>
          </div>
        ) : (
          <div
            className="discovery-skeleton"
            role="status"
            aria-label="Loading equipment"
          >
            <span />
            <span />
          </div>
        )}
      </div>
    );
  return (
    <div className="container section">
      <p className="eyebrow">{item.category}</p>
      <div className="detail-grid">
        <EquipmentVisual item={item} className="detail-image" />
        <div>
          <h1>{item.name}</h1>
          <p className="location">
            <MapPin size={17} />
            {item.location}
          </p>
          <p className="detail-price">
            {money(item.price * 100)} <small>/ {item.rentalType}</small>
          </p>
          <p>{item.description}</p>
          <dl className="detail-facts">
            <div>
              <dt>Available quantity</dt>
              <dd>{item.quantity}</dd>
            </div>
            <div>
              <dt>Condition</dt>
              <dd>{item.condition}</dd>
            </div>
            <div>
              <dt>Brand & model</dt>
              <dd>
                {item.brand} {item.model}
              </dd>
            </div>
            <div>
              <dt>Owner</dt>
              <dd>{item.ownerName}</dd>
            </div>
          </dl>
          {user?.role === "customer" && (
            <div className="detail-actions">
              <button
                className="btn btn-primary"
                ref={bookButton}
                disabled={item.quantity < 1}
                onClick={() => {
                  setPeriod({ start: "", end: "", quantity: 1 });
                  setError("");
                  setModal(true);
                }}
              >
                Book now
              </button>
              <button
                className="btn btn-outline"
                onClick={async () => {
                  try {
                    await api("favorites/" + id, "PUT");
                    setNotice("Equipment saved to your favorites.");
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                <Heart size={18} /> Save favorite
              </button>
            </div>
          )}
          {item.status === "approved" && (
            <>
              <CompareButton item={item} />
              <EquipmentSharing item={item} />
            </>
          )}
          {notice && (
            <p className="alert alert-success" role="status">
              {notice}
            </p>
          )}
          {error && !modal && (
            <p className="alert alert-error" role="alert">
              {error}
            </p>
          )}
          <p className="small-print">
            <ShieldCheck size={15} /> Secure Stripe checkout. No payment details
            are stored here.
          </p>
        </div>
      </div>
      <section className="terms">
        <h2>Rental terms & conditions</h2>
        <p>{item.terms}</p>
      </section>
      {modal && (
        <dialog
          ref={dialogRef}
          className="modal"
          aria-labelledby="booking-title"
          onCancel={closeBooking}
        >
          <div className="modal-box">
            <div className="booking-heading">
              <button
                className="btn btn-ghost modal-close"
                aria-label="Close booking"
                onClick={closeBooking}
              >
                <X />
              </button>
              <h2 id="booking-title">Plan your rental.</h2>
            </div>
            <p>{item.name}</p>
            <form
              onSubmit={book}
              onChange={(e) => {
                const target = e.nativeEvent.target;
                if (
                  !(target instanceof HTMLInputElement) ||
                  !["start", "end", "quantity"].includes(target.name)
                )
                  return;
                const form = new FormData(e.currentTarget);
                setPeriod({
                  start: String(form.get("start")),
                  end: String(form.get("end")),
                  quantity: Number(form.get("quantity")),
                });
              }}
            >
              <div className="form-grid">
                <label>
                  Start date
                  <input
                    className="input"
                    name="start"
                    type="date"
                    required
                    min={new Date().toISOString().slice(0, 10)}
                  />
                </label>
                <label>
                  End date
                  <input
                    className="input"
                    name="end"
                    type="date"
                    required
                    min={new Date().toISOString().slice(0, 10)}
                  />
                </label>
              </div>
              <label>
                Quantity
                <input
                  className="input"
                  type="number"
                  name="quantity"
                  min="1"
                  max={item.quantity}
                  defaultValue="1"
                  required
                />
              </label>
              <label>
                Contact number
                <input
                  className="input"
                  name="phone"
                  type="tel"
                  required
                  minLength={6}
                  maxLength={30}
                />
              </label>
              <label>
                Delivery address
                <textarea
                  className="textarea"
                  name="address"
                  required
                  minLength={5}
                  maxLength={300}
                />
              </label>
              <label>
                Additional notes
                <textarea className="textarea" name="notes" maxLength={1000} />
              </label>
              <RentalBreakdown
                item={item}
                period={period}
                estimate={estimate}
              />
              <p className="small-print">
                The end date is exclusive. Weekly and monthly periods round up;
                one month is 30 days. Final availability and price are verified
                at checkout.
              </p>
              {error && (
                <p className="alert alert-error" role="alert">
                  {error}
                </p>
              )}
              <button
                className="btn btn-primary full-width"
                disabled={busy || !estimate.quote}
              >
                {busy
                  ? "Checking availability…"
                  : "Continue to Stripe Checkout"}
              </button>
            </form>
          </div>
        </dialog>
      )}
    </div>
  );
}
