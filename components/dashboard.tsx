"use client";
import { equipmentImage } from "@/lib/equipment-image";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { api } from "@/lib/api";
import {
  categories,
  money,
  type Equipment,
  type User,
  type Role,
} from "@/lib/types";
import { useSession } from "./session";
import {
  ArrowUpRight,
  Package,
  Wallet,
  CalendarDays,
  Users,
} from "lucide-react";
type Row = Record<string, string | number | boolean | null>;
type Analytics = {
  users: number;
  equipment: number;
  bookings: number;
  pending: number;
  completed: number;
  revenueCents: number;
  monthlyBookings: { month: string; count: number }[];
  monthly: { month: string; totalCents: number; count: number }[];
};
function useData<T>(path: string) {
  const [version, setVersion] = useState(0);
  const key = path + "|" + version;
  const [result, setResult] = useState<{
    key: string;
    data: T | null;
    error: string;
  }>({ key: "", data: null, error: "" });
  useEffect(() => {
    let active = true;
    if (path)
      api<T>(path)
        .then((data) => {
          if (active) setResult({ key, data, error: "" });
        })
        .catch((e) => {
          if (active) setResult({ key, data: null, error: e.message });
        });
    return () => {
      active = false;
    };
  }, [path, key]);
  return {
    data: result.key === key ? result.data : null,
    error: result.key === key ? result.error : "",
    reload: () => setVersion((v) => v + 1),
  };
}
function State({ error, loading }: { error: string; loading: boolean }) {
  return error ? (
    <div role="alert" className="alert alert-error">
      {error}
    </div>
  ) : loading ? (
    <div className="loading-state" role="status">
      <span className="loading loading-spinner" />
      Loading your workspace…
    </div>
  ) : null;
}
function Gate({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user, pending } = useSession();
  if (pending) return <State error="" loading />;
  if (!user || !roles.includes(user.role))
    return (
      <div className="alert alert-error" role="alert">
        This workspace is not available for your role.
      </div>
    );
  return children;
}
export function Overview() {
  const { user, pending } = useSession();
  const { data, error } = useData<Analytics>(
    user && user.role !== "customer" ? "analytics" : "",
  );
  if (pending) return <State error="" loading />;
  return (
    <>
      <p className="eyebrow">YOUR EQUIPORA</p>
      <h1>Good to see you, {user?.name.split(" ")[0]}.</h1>
      <p className="lead">Here’s where your next project takes shape.</p>
      {user?.role === "customer" ? (
        <div className="overview-links">
          {[
            [
              "/equipment",
              "Find your next rental",
              "Explore approved equipment nearby.",
            ],
            [
              "/dashboard/rentals",
              "Your rental history",
              "Keep track of your confirmed bookings.",
            ],
            [
              "/dashboard/favorites",
              "Saved for later",
              "Return to the equipment you love.",
            ],
          ].map(([href, title, text]) => (
            <Link className="overview-card" href={href} key={href}>
              <ArrowUpRight />
              <h3>{title}</h3>
              <p>{text}</p>
            </Link>
          ))}
        </div>
      ) : (
        <>
          <State error={error} loading={!data && !error} />
          {data && (
            <>
              <div className="stat-grid">
                {[
                  [Package, "Equipment", data.equipment],
                  [CalendarDays, "Bookings", data.bookings],
                  [Wallet, "Revenue", money(data.revenueCents)],
                  [
                    Users,
                    user?.role === "admin" ? "Users" : "Completed rentals",
                    user?.role === "admin" ? data.users : data.completed,
                  ],
                ].map(([Icon, label, value]) => {
                  const I = Icon as typeof Package;
                  return (
                    <article className="stat-card" key={String(label)}>
                      <I size={22} />
                      <span>{String(label)}</span>
                      <strong>{String(value)}</strong>
                    </article>
                  );
                })}
              </div>
              <div className="analytics-panel">
                <h2>Monthly rental revenue</h2>
                <p>
                  {data.pending} equipment listing
                  {data.pending === 1 ? "" : "s"} awaiting approval ·{" "}
                  {data.completed} completed rental
                  {data.completed === 1 ? "" : "s"}
                </p>
                {!data.monthly.length ? (
                  <div className="empty-state">
                    <p>Your first paid rental will start the story here.</p>
                  </div>
                ) : (
                  <div
                    className="bar-chart"
                    role="img"
                    aria-label="Monthly rental revenue bar chart"
                  >
                    {data.monthly.slice(-12).map((m) => (
                      <div className="bar-column" key={m.month}>
                        <span>{money(m.totalCents)}</span>
                        <div
                          style={{
                            height: Math.max(
                              5,
                              (m.totalCents /
                                Math.max(
                                  ...data.monthly.map((x) => x.totalCents),
                                )) *
                                170,
                            ),
                          }}
                        />
                        <strong>{m.month}</strong>
                        <small>
                          {m.count} payment{m.count === 1 ? "" : "s"}
                        </small>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {user?.role === "admin" && (
                <section className="analytics-panel monthly-bookings">
                  <h2>Monthly booking statistics</h2>
                  {!data.monthlyBookings?.length ? (
                    <p>No confirmed booking history yet.</p>
                  ) : (
                    <div
                      className="bar-chart"
                      role="img"
                      aria-label="Monthly confirmed booking count"
                    >
                      {data.monthlyBookings.slice(-12).map((m) => (
                        <div className="bar-column" key={m.month}>
                          <span>{m.count} bookings</span>
                          <div
                            style={{
                              height: Math.max(
                                5,
                                (m.count /
                                  Math.max(
                                    ...data.monthlyBookings.map((x) => x.count),
                                  )) *
                                  150,
                              ),
                            }}
                          />
                          <strong>{m.month}</strong>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}
            </>
          )}
        </>
      )}
    </>
  );
}
function CheckoutHolds() {
  const { data, error, reload } = useData<{
    items: {
      id: string;
      equipmentName: string;
      start: string;
      end: string;
      totalCents: number;
    }[];
  }>("checkout/holds");
  const [notice, setNotice] = useState("");
  if (!data?.items.length && !error) return null;
  return (
    <section className="analytics-panel">
      <h2>Pending checkouts</h2>
      <p>
        These reservations hold equipment until checkout completes, expires, or
        is safely cancelled.
      </p>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {data?.items.map((r) => (
        <div className="pending-checkout" key={r.id}>
          <div>
            <strong>{r.equipmentName}</strong>
            <p>
              {r.start} to {r.end} · {money(r.totalCents)}
            </p>
          </div>
          <button
            className="btn btn-sm btn-outline"
            onClick={async () => {
              try {
                await api("checkout/" + r.id + "/cancel", "POST");
                setNotice("Checkout cancelled.");
                reload();
              } catch (e) {
                setNotice((e as Error).message);
              }
            }}
          >
            Cancel checkout
          </button>
        </div>
      ))}
    </section>
  );
}
export function Rentals() {
  const params = useSearchParams(),
    router = useRouter();
  const rawPage = Number(params.get("page") ?? 1);
  const page =
    Number.isInteger(rawPage) && rawPage > 0 && rawPage <= 10000 ? rawPage : 1;
  const setPage = (next: number) => {
    const query = new URLSearchParams(params.toString());
    query.set("page", String(next));
    router.push("/dashboard/rentals?" + query.toString());
  };
  const { user } = useSession(),
    [notice, setNotice] = useState("");
  const { data, error, reload } = useData<{
    items: Row[];
    total: number;
    limit: number;
  }>("rentals?page=" + page);
  return (
    <>
      <p className="eyebrow">KEEP THINGS MOVING</p>
      <h1>
        {user?.role === "admin"
          ? "All rentals"
          : user?.role === "owner"
            ? "Equipment rentals"
            : "My rentals"}
      </h1>
      <p className="lead">
        Your confirmed bookings and payment details, all together.
      </p>
      {user?.role === "customer" && <CheckoutHolds />}
      <State error={error} loading={!data && !error} />
      {notice && (
        <p className="alert" role="status">
          {notice}
        </p>
      )}
      {data && (
        <>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  {[
                    "Equipment",
                    ...(user?.role === "customer"
                      ? ["Rental start date", "Rental end date"]
                      : ["Rental period"]),
                    "Booking date",
                    "Quantity",
                    "Total",
                    "Payment",
                    "Status",
                    ...(user?.role !== "admin" ? ["Details"] : []),
                    ...(user?.role !== "customer" ? ["Customer"] : []),
                    ...(user?.role === "admin" ? ["Owner", "Manage"] : []),
                  ].map((h) => (
                    <th scope="col" key={h}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.items.map((r) => (
                  <tr key={String(r.id)}>
                    <td>{r.equipmentName}</td>
                    {user?.role === "customer" ? (
                      <>
                        <td>{r.start}</td>
                        <td>{r.end}</td>
                      </>
                    ) : (
                      <td>
                        {r.start}
                        <br />
                        to {r.end}
                      </td>
                    )}{" "}
                    <td>
                      {new Date(String(r.bookingDate)).toLocaleDateString()}
                    </td>
                    <td>{r.quantity}</td>
                    <td>{money(Number(r.totalCents))}</td>
                    <td>
                      <span className="status-pill approved">
                        {r.paymentStatus}
                      </span>
                    </td>
                    <td>{r.bookingStatus}</td>
                    {user?.role !== "admin" && (
                      <td>
                        <Link
                          className="text-link"
                          href={"/dashboard/rentals/" + r.id}
                        >
                          Rental details
                        </Link>
                      </td>
                    )}
                    {user?.role !== "customer" && (
                      <td>
                        {r.customerName}
                        <small className="table-secondary">
                          {r.customerEmail}
                          <br />
                          {r.phone}
                        </small>
                      </td>
                    )}
                    {user?.role === "admin" && (
                      <>
                        <td>{r.ownerName}</td>
                        <td>
                          <select
                            aria-label={"Booking status for " + r.equipmentName}
                            className="select select-sm"
                            value={String(r.bookingStatus)}
                            onChange={async (e) => {
                              try {
                                await api("admin/rentals/" + r.id, "PATCH", {
                                  status: e.target.value,
                                });
                                setNotice("Rental status updated.");
                                reload();
                              } catch (e) {
                                setNotice((e as Error).message);
                              }
                            }}
                          >
                            <option value="confirmed" disabled>
                              Confirmed
                            </option>
                            <option value="ongoing">Ongoing</option>
                            <option value="completed">Completed</option>
                          </select>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {!data.items.length && (
              <div className="empty-state">
                <CalendarDays />
                <h3>No confirmed rentals yet.</h3>
                <p>Completed payments will appear here after verification.</p>
                <Link href="/equipment" className="text-link">
                  Find equipment
                </Link>
              </div>
            )}
          </div>
          <nav className="pagination" aria-label="Rental history pages">
            <button
              className="btn btn-sm btn-outline"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </button>
            <span role="status" aria-live="polite">
              Page {page} of {Math.max(1, Math.ceil(data.total / data.limit))}
            </span>
            <button
              className="btn btn-sm btn-outline"
              disabled={page * data.limit >= data.total}
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </nav>
        </>
      )}
    </>
  );
}
export function Favorites() {
  const { data, error, reload } = useData<{ items: Equipment[] }>("favorites"),
    [notice, setNotice] = useState("");
  return (
    <Gate roles={["customer"]}>
      <p className="eyebrow">GOOD FINDS, SAVED</p>
      <h1>Your favorites.</h1>
      <State error={error} loading={!data && !error} />
      {notice && (
        <p role="status" className="alert">
          {notice}
        </p>
      )}
      {data && (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Equipment</th>
                <th>Category</th>
                <th>Rental price</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.category}</td>
                  <td>
                    {money(item.price * 100)} / {item.rentalType}
                  </td>
                  <td className="table-actions">
                    <Link
                      href={"/equipment/" + item.id}
                      className="btn btn-sm btn-outline"
                    >
                      View details
                    </Link>
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={async () => {
                        try {
                          await api("favorites/" + item.id, "DELETE");
                          setNotice("Favorite removed.");
                          reload();
                        } catch (e) {
                          setNotice((e as Error).message);
                        }
                      }}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.items.length && (
            <div className="empty-state">
              <h3>A little inspiration goes a long way.</h3>
              <p>Save equipment as you explore and find it here later.</p>
              <Link href="/equipment" className="btn btn-primary">
                Explore equipment
              </Link>
            </div>
          )}
        </div>
      )}
    </Gate>
  );
}
export function Profile() {
  const { data, error, reload } = useData<User>("me"),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const router = useRouter();
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setNotice("");
    const f = new FormData(e.currentTarget);
    try {
      await api("me", "PATCH", {
        name: f.get("name"),
        image: f.get("image"),
        phone: f.get("phone"),
        address: f.get("address"),
      });
      setNotice("Your profile has been updated.");
      reload();
      router.refresh();
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <p className="eyebrow">MAKE YOURSELF AT HOME</p>
      <h1>My profile.</h1>
      <State error={error} loading={!data && !error} />
      {notice && (
        <p className="alert" role="status">
          {notice}
        </p>
      )}
      {data && (
        <form className="workspace-form" onSubmit={submit}>
          <div className="profile-heading">
            {data.image ? (
              <Image
                unoptimized
                src={data.image}
                alt={data.name}
                width="80"
                height="80"
              />
            ) : (
              <span className="avatar-placeholder">
                {data.name.slice(0, 1)}
              </span>
            )}
            <div>
              <strong>{data.name}</strong>
              <p>{data.role}</p>
            </div>
          </div>
          <label>
            Full name
            <input
              className="input"
              name="name"
              required
              minLength={2}
              maxLength={100}
              defaultValue={data.name}
            />
          </label>
          <label>
            Email
            <input
              className="input"
              type="email"
              value={data.email}
              readOnly
              aria-readonly
            />
          </label>
          <p className="small-print">
            Sign-in email changes require reauthentication and verification of
            the new address. Email changes are not enabled in this demo.
          </p>
          <label>
            Profile image URL
            <input
              className="input"
              name="image"
              type="url"
              pattern="https://.*"
              defaultValue={data.image ?? ""}
            />
          </label>
          <label>
            Phone number
            <input
              className="input"
              name="phone"
              type="tel"
              maxLength={30}
              defaultValue={data.phone ?? ""}
            />
          </label>
          <label>
            Address
            <textarea
              className="textarea"
              name="address"
              maxLength={300}
              defaultValue={data.address ?? ""}
            />
          </label>
          <button className="btn btn-primary" disabled={busy}>
            {busy ? "Saving…" : "Save profile"}
          </button>
        </form>
      )}
    </>
  );
}
type ManagementResult<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
};
function ManagementPager({
  data,
  page,
  onChange,
}: {
  data: { total: number; limit: number };
  page: number;
  onChange: (page: number) => void;
}) {
  return (
    <div className="pagination">
      <button
        className="btn btn-sm btn-outline"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        Previous
      </button>
      <span>
        Page {page} of {Math.max(1, Math.ceil(data.total / data.limit))} ·{" "}
        {data.total} total
      </span>
      <button
        className="btn btn-sm btn-outline"
        disabled={page * data.limit >= data.total}
        onClick={() => onChange(page + 1)}
      >
        Next
      </button>
    </div>
  );
}
export function EquipmentManager() {
  const [page, setPage] = useState(1);
  const { user } = useSession(),
    [notice, setNotice] = useState("");
  const { data, error, reload } = useData<ManagementResult<Equipment>>(
    user?.role === "admin"
      ? "admin/equipment?page=" + page
      : user?.role === "owner"
        ? "owner/equipment?page=" + page
        : "",
  );
  async function remove(id: string) {
    if (
      !window.confirm(
        "Delete this equipment listing? Listings with active reservations cannot be deleted.",
      )
    )
      return;
    try {
      await api("equipment/" + id, "DELETE");
      setNotice("Equipment deleted.");
      reload();
    } catch (e) {
      setNotice((e as Error).message);
    }
  }
  return (
    <Gate roles={["owner", "admin"]}>
      <div className="section-heading">
        <div>
          <p className="eyebrow">YOUR EQUIPMENT WORKSPACE</p>
          <h1>{user?.role === "admin" ? "All equipment." : "My equipment."}</h1>
        </div>
        {user?.role === "owner" && (
          <Link href="/dashboard/add-equipment" className="btn btn-primary">
            Add equipment
          </Link>
        )}
      </div>
      <State error={error} loading={!data && !error} />
      {notice && (
        <p className="alert" role="status">
          {notice}
        </p>
      )}
      {data && (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                {[
                  "Equipment",
                  "Category",
                  "Rental price",
                  "Quantity",
                  "Status",
                  "Actions",
                ].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.category}</td>
                  <td>
                    {money(item.price * 100)} / {item.rentalType}
                  </td>
                  <td>{item.quantity}</td>
                  <td>
                    <span className={"status-pill " + item.status}>
                      {item.status}
                    </span>
                  </td>
                  <td>
                    <div className="table-actions">
                      <Link
                        href={"/equipment/" + item.id}
                        className="btn btn-sm btn-ghost"
                      >
                        Details
                      </Link>
                      <Link
                        href={"/dashboard/equipment/" + item.id + "/edit"}
                        className="btn btn-sm btn-outline"
                      >
                        Update
                      </Link>
                      <button
                        className="btn btn-sm btn-ghost"
                        onClick={() => remove(item.id)}
                      >
                        Delete
                      </button>
                      {user?.role === "admin" && (
                        <select
                          className="select select-sm"
                          aria-label={"Approval status for " + item.name}
                          value={item.status}
                          onChange={async (e) => {
                            try {
                              await api(
                                "admin/equipment/" + item.id + "/status",
                                "PATCH",
                                { status: e.target.value },
                              );
                              setNotice("Approval status updated.");
                              reload();
                            } catch (e) {
                              setNotice((e as Error).message);
                            }
                          }}
                        >
                          {["pending", "approved", "rejected"].map((v) => (
                            <option key={v}>{v}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.items.length && (
            <div className="empty-state">
              <Package />
              <h3>No equipment listings yet.</h3>
              <p>
                {user?.role === "owner"
                  ? "Add your first listing to get started."
                  : "Owner submissions will appear here for review."}
              </p>
            </div>
          )}
        </div>
      )}
      {data && <ManagementPager data={data} page={page} onChange={setPage} />}
    </Gate>
  );
}
export function UsersManager() {
  const [page, setPage] = useState(1);
  const { data, error, reload } = useData<ManagementResult<User>>(
      "admin/users?page=" + page,
    ),
    [notice, setNotice] = useState("");
  async function save(user: User, role: Role, disabled: boolean) {
    if (
      !window.confirm(
        "Update this user’s access? Their existing sessions will be revoked.",
      )
    )
      return;
    try {
      await api("admin/users/" + user.id, "PATCH", { role, disabled });
      setNotice("User access updated. Existing sessions were revoked.");
      reload();
    } catch (e) {
      setNotice((e as Error).message);
    }
  }
  return (
    <Gate roles={["admin"]}>
      <p className="eyebrow">COMMUNITY MANAGEMENT</p>
      <h1>All users.</h1>
      <State error={error} loading={!data && !error} />
      {notice && (
        <p className="alert" role="status">
          {notice}
        </p>
      )}
      {data && (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                {["Name", "Email", "Role", "Registered", "Access"].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.items.map((user) => (
                <tr key={user.id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>
                    <select
                      className="select select-sm"
                      aria-label={"Role for " + user.name}
                      value={user.role}
                      onChange={(e) =>
                        save(user, e.target.value as Role, !!user.disabled)
                      }
                    >
                      {["customer", "owner", "admin"].map((v) => (
                        <option key={v}>{v}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    {user.createdAt
                      ? new Date(user.createdAt).toLocaleDateString()
                      : "—"}
                  </td>
                  <td>
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => save(user, user.role, !user.disabled)}
                    >
                      {user.disabled ? "Enable" : "Disable"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && <ManagementPager data={data} page={page} onChange={setPage} />}
    </Gate>
  );
}
export function EquipmentForm({ id }: { id?: string }) {
  const { user } = useSession(),
    [existing, setExisting] = useState<Equipment | null>(null),
    [image, setImage] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    router = useRouter();
  useEffect(() => {
    if (id)
      api<Equipment>("equipment/" + id)
        .then((v) => {
          setExisting(v);
          setImage(v.image);
        })
        .catch((e) => setNotice(e.message));
  }, [id]);
  async function upload(file: File | undefined) {
    if (!file) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 2000000
    ) {
      setNotice("Use a JPG, PNG, or WebP image smaller than 2 MB.");
      return;
    }
    setBusy(true);
    try {
      const encoded = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result).split(",")[1]);
        r.onerror = reject;
        r.readAsDataURL(file);
      });
      const r = await api<{ url: string }>("uploads", "POST", {
        image: encoded,
      });
      setImage(r.url);
      setNotice("Image uploaded successfully.");
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!image) {
      setNotice("Upload an equipment image first.");
      return;
    }
    setBusy(true);
    const form = new FormData(e.currentTarget);
    const body = Object.fromEntries(form);
    try {
      await api("equipment" + (id ? "/" + id : ""), id ? "PATCH" : "POST", {
        ...body,
        price: Number(body.price),
        quantity: Number(body.quantity),
        image,
      });
      setNotice(
        id ? "Equipment updated." : "Equipment submitted for approval.",
      );
      setTimeout(() => router.push("/dashboard/equipment"), 700);
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Gate roles={id ? ["owner", "admin"] : ["owner"]}>
      <p className="eyebrow">MORE POSSIBILITIES START HERE</p>
      <h1>{id ? "Update equipment." : "Add equipment."}</h1>
      <p className="lead">
        {user?.role === "admin"
          ? "Review the listing details carefully."
          : "Your listing will be reviewed before it becomes public."}
      </p>
      {notice && (
        <p className="alert" role="status">
          {notice}
        </p>
      )}
      {id && !existing ? (
        <State error="" loading />
      ) : (
        <form
          className="workspace-form"
          onSubmit={submit}
          key={existing?.id ?? "new"}
        >
          <label>
            Equipment name
            <input
              className="input"
              name="name"
              required
              minLength={3}
              maxLength={120}
              defaultValue={existing?.name}
            />
          </label>
          <label>
            Description
            <textarea
              className="textarea"
              name="description"
              required
              minLength={20}
              maxLength={5000}
              rows={4}
              defaultValue={existing?.description}
            />
          </label>
          <div className="form-grid">
            <label>
              Category
              <select
                className="select"
                name="category"
                aria-label="Category"
                required
                defaultValue={existing?.category ?? ""}
              >
                <option value="" disabled>
                  Select a category
                </option>
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>
              Location
              <input
                className="input"
                name="location"
                required
                minLength={2}
                maxLength={160}
                defaultValue={existing?.location}
              />
            </label>
            <label>
              Rental price (USD)
              <input
                className="input"
                name="price"
                type="number"
                min="0.01"
                max="1000000"
                step="0.01"
                required
                defaultValue={existing?.price}
              />
            </label>
            <label>
              Rental type
              <select
                className="select"
                name="rentalType"
                aria-label="Rental type"
                defaultValue={existing?.rentalType ?? "daily"}
              >
                {["daily", "weekly", "monthly"].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label>
              Available quantity
              <input
                className="input"
                name="quantity"
                type="number"
                min="1"
                max="10000"
                required
                defaultValue={existing?.quantity ?? 1}
              />
            </label>
            <label>
              Condition
              <input
                className="input"
                name="condition"
                required
                minLength={2}
                maxLength={100}
                defaultValue={existing?.condition}
              />
            </label>
            <label>
              Brand
              <input
                className="input"
                name="brand"
                required
                maxLength={100}
                defaultValue={existing?.brand}
              />
            </label>
            <label>
              Model
              <input
                className="input"
                name="model"
                required
                maxLength={100}
                defaultValue={existing?.model}
              />
            </label>
          </div>
          <label>
            Equipment image (imgbb upload)
            <input
              className="file-input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => upload(e.target.files?.[0])}
              disabled={busy}
            />
          </label>
          {image && (
            <Image
              unoptimized
              className="upload-preview"
              src={
                existing && image === existing.image
                  ? equipmentImage(existing)
                  : image
              }
              alt="Equipment preview"
              width="260"
              height="180"
            />
          )}
          <label>
            Rental terms and conditions
            <textarea
              className="textarea"
              name="terms"
              required
              minLength={10}
              maxLength={3000}
              rows={4}
              defaultValue={existing?.terms}
            />
          </label>
          <div className="form-meta">
            <span>Owner: {user?.name}</span>
            <span>
              Status:{" "}
              {user?.role === "admin" && id
                ? existing?.status
                : "Pending approval"}
            </span>
          </div>
          <button className="btn btn-primary" disabled={busy}>
            {busy ? "Please wait…" : id ? "Save changes" : "Submit equipment"}
          </button>
        </form>
      )}
    </Gate>
  );
}
export function PaymentSuccess({ sessionId }: { sessionId: string }) {
  const { data, error, reload } = useData<{
    paid: boolean;
    transactionId: string | null;
  }>("payments/" + sessionId);
  return (
    <>
      <p className="eyebrow">YOUR NEXT PROJECT AWAITS</p>
      <h1>
        {data?.paid ? "Your rental is confirmed." : "Confirming your payment…"}
      </h1>
      <State error={error} loading={!data && !error} />
      {data && (
        <>
          {data.paid ? (
            <p className="alert alert-success" role="status">
              Payment verified. Transaction: {data.transactionId}
            </p>
          ) : (
            <>
              <p>
                Your payment is being verified securely. A redirect alone does
                not confirm a booking.
              </p>
              <button className="btn btn-outline" onClick={reload}>
                Check confirmation
              </button>
            </>
          )}
          <Link className="btn btn-primary" href="/dashboard/rentals">
            View my rentals
          </Link>
        </>
      )}
    </>
  );
}
