"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useSession } from "./session";
type Notice = {
  id: string;
  bookingId: string;
  title: string;
  equipmentName: string;
  createdAt: string;
  readAt: string | null;
};
type Notices = {
  items: Notice[];
  total: number;
  unread: number;
  page: number;
  limit: number;
};
function useWorkspace<T>(path: string) {
  const { user, pending } = useSession();
  const [revision, setRevision] = useState(0);
  const enabled =
      !pending && !!user && ["customer", "owner"].includes(user.role),
    key = [user?.id, user?.role, path, revision].join("|");
  const [state, setState] = useState<{
    key: string;
    data: T | null;
    error: string;
  }>({ key: "", data: null, error: "" });
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    api<T>(path)
      .then((data) => {
        if (active) setState({ key, data, error: "" });
      })
      .catch((e) => {
        if (active)
          setState({
            key,
            data: null,
            error:
              e instanceof Error ? e.message : "The workspace is unavailable",
          });
      });
    return () => {
      active = false;
    };
  }, [path, key, enabled]);
  useEffect(() => {
    const refresh = () => setRevision((v) => v + 1);
    window.addEventListener("focus", refresh);
    window.addEventListener("equipora-notifications-read", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("equipora-notifications-read", refresh);
    };
  }, []);
  return {
    data: enabled && state.key === key ? state.data : null,
    error:
      !pending && !enabled
        ? "This feature is available to customers and owners."
        : state.key === key
          ? state.error
          : "",
    reload: () => setRevision((v) => v + 1),
  };
}
export function NotificationIndicator() {
  const path = usePathname(),
    { data } = useWorkspace<Notices>("notifications");
  return (
    <Link
      href="/dashboard/notifications"
      aria-current={path === "/dashboard/notifications" ? "page" : undefined}
    >
      Notifications{" "}
      {data && data.unread > 0 && (
        <span
          className="notification-count"
          aria-label={`${data.unread} unread notifications`}
        >
          {data.unread > 99 ? "99+" : data.unread}
        </span>
      )}
    </Link>
  );
}
function Feedback({
  error,
  loading,
  retry,
}: {
  error: string;
  loading: boolean;
  retry: () => void;
}) {
  return error ? (
    <p role="alert" className="alert alert-error">
      {error}{" "}
      <button className="text-link" type="button" onClick={retry}>
        Try again
      </button>
    </p>
  ) : loading ? (
    <p role="status">Loading your rental workspace…</p>
  ) : null;
}
export function NotificationCenter() {
  const [page, setPage] = useState(1),
    [busy, setBusy] = useState(""),
    [message, setMessage] = useState(""),
    { data, error, reload } = useWorkspace<Notices>(
      "notifications?page=" + page,
    );
  return (
    <>
      <p className="eyebrow">YOUR RENTAL UPDATES</p>
      <h1>Notifications</h1>
      <p className="lead">
        Recorded payment and rental status updates, just for your account.
      </p>
      <button type="button" className="btn btn-outline btn-sm" onClick={reload}>
        Refresh notifications
      </button>
      <Feedback error={error} loading={!data && !error} retry={reload} />
      {message && (
        <p role="status" className="alert">
          {message}
        </p>
      )}
      {data && (
        <>
          <p className="small-print">
            {data.unread} unread · {data.total} notifications
          </p>
          {data.items.length ? (
            <ul className="notification-list">
              {data.items.map((n) => (
                <li
                  key={n.id}
                  className={n.readAt ? "" : "notification-unread"}
                >
                  <div>
                    <h2>{n.title}</h2>
                    <p>{n.equipmentName}</p>
                    <time dateTime={n.createdAt}>
                      {new Date(n.createdAt).toLocaleString()}
                    </time>
                    <p>
                      <Link
                        className="text-link"
                        href={"/dashboard/rentals/" + n.bookingId}
                      >
                        View rental details
                      </Link>
                    </p>
                  </div>
                  {n.readAt ? (
                    <span className="small-print">Read</span>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      aria-label={`Mark as read: ${n.title}, ${n.equipmentName}`}
                      disabled={!!busy}
                      onClick={async () => {
                        setBusy(n.id);
                        setMessage("");
                        try {
                          await api(
                            "notifications/" + n.id + "/read",
                            "PATCH",
                            {},
                          );
                          setMessage("Notification marked as read.");
                          window.dispatchEvent(
                            new Event("equipora-notifications-read"),
                          );
                        } catch (e) {
                          setMessage(
                            e instanceof Error
                              ? e.message
                              : "Could not mark this notification as read.",
                          );
                        } finally {
                          setBusy("");
                        }
                      }}
                    >
                      {busy === n.id ? "Saving…" : "Mark as read"}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">
              No notifications yet. New recorded rental updates will appear
              here.
            </p>
          )}
          <nav className="pagination" aria-label="Notification pages">
            <button
              className="btn btn-outline btn-sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>
            <span>
              Page {page} of {Math.max(1, Math.ceil(data.total / data.limit))}
            </span>
            <button
              className="btn btn-outline btn-sm"
              disabled={page * data.limit >= data.total}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </nav>
        </>
      )}
    </>
  );
}
type Activity = {
  id: string;
  equipmentName: string;
  start: string;
  end: string;
  quantity: number;
  bookingStatus: string;
  paymentStatus: string;
  events: { kind: string; at: string; source: string }[];
};
const titles: Record<string, string> = {
  initiated: "Rental initiated",
  payment_confirmed: "Payment confirmed",
  ongoing: "Rental in progress",
  completed: "Rental completed",
  cancelled: "Rental cancelled",
};
export function RentalActivity({ id }: { id: string }) {
  const { data, error, reload } = useWorkspace<Activity>(
      "rentals/" + id + "/activity",
    ),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  async function download() {
    setBusy(true);
    setNotice("");
    try {
      const r = await api<{ html: string; filename: string }>(
        "rentals/" + id + "/receipt",
      );
      if (
        typeof r.html !== "string" ||
        r.html.length > 100000 ||
        !/^equipora-receipt-[a-f0-9]{24}\.html$/.test(r.filename)
      )
        throw Error("The receipt is unavailable");
      const url = URL.createObjectURL(
          new Blob([r.html], { type: "text/html;charset=utf-8" }),
        ),
        a = document.createElement("a");
      a.href = url;
      a.download = r.filename;
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice(
        "Receipt downloaded. Open the HTML file and use Print to save as PDF.",
      );
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Receipt download failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Link className="text-link" href="/dashboard/rentals">
        Back to rentals
      </Link>
      <p className="eyebrow">YOUR RENTAL RECORD</p>
      <h1>Rental details</h1>
      <Feedback error={error} loading={!data && !error} retry={reload} />
      {data && (
        <>
          <h2>{data.equipmentName}</h2>
          <p>
            {data.start} to {data.end} (end exclusive) · Quantity{" "}
            {data.quantity}
          </p>
          <p>
            Booking status: {data.bookingStatus} · Payment: {data.paymentStatus}
          </p>
          {data.paymentStatus === "paid" && (
            <>
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy}
                onClick={download}
              >
                {busy ? "Preparing receipt…" : "Download receipt"}
              </button>
              <p className="small-print">
                HTML receipt, printable as PDF. A matching successful payment
                must be verified by the server.
              </p>
            </>
          )}
          {notice && (
            <p role="status" className="alert">
              {notice}
            </p>
          )}
          <section
            className="rental-activity"
            aria-label="Rental activity timeline"
          >
            <h2>Rental activity</h2>
            <p className="small-print">
              Only recorded events and known stored timestamps are shown. Older
              history may be incomplete. Payment times indicate when
              confirmation was recorded.
            </p>
            {data.events.length ? (
              <ol className="rental-timeline">
                {data.events.map((e) => (
                  <li key={e.kind + e.at}>
                    <h3>{titles[e.kind] ?? "Recorded rental update"}</h3>
                    <time dateTime={e.at}>
                      {new Date(e.at).toLocaleString()}
                    </time>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="empty-state">
                No historical event timestamps were recorded for this rental.
              </p>
            )}
          </section>
        </>
      )}
    </>
  );
}
