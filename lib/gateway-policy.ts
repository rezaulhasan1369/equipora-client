export function backendOrigin(
  raw: string | undefined,
  production: boolean,
  localTest = false,
) {
  if (!raw) {
    if (!production) return "http://localhost:5000";
    throw new Error("API is not configured");
  }
  const u = new URL(raw);
  if (
    u.username ||
    u.password ||
    u.search ||
    u.hash ||
    u.pathname !== "/" ||
    (u.protocol !== "https:" &&
      !(
        (!production || localTest) &&
        u.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(u.hostname)
      ))
  )
    throw new Error("Invalid API configuration");
  return u.origin;
}
export function safeReturnTo(raw: string | null) {
  if (
    !raw ||
    !raw.startsWith("/") ||
    raw.startsWith("//") ||
    raw.includes(String.fromCharCode(92)) ||
    Array.from(raw).some(
      (c) => c.charCodeAt(0) <= 32 || c.charCodeAt(0) === 127,
    )
  )
    return "/dashboard";
  try {
    const url = new URL(raw, "https://return.invalid");
    return url.origin === "https://return.invalid"
      ? url.pathname + url.search + url.hash
      : "/dashboard";
  } catch {
    return "/dashboard";
  }
}
export function gatewayPath(parts: string[], auth: boolean) {
  if (
    !parts.length ||
    parts.some(
      (p) => !p || p === "." || p === ".." || !/^[a-zA-Z0-9_-]+$/.test(p),
    )
  )
    return false;
  if (auth) return true;
  if (
    ![
      "equipment",
      "me",
      "favorites",
      "owner",
      "admin",
      "rentals",
      "checkout",
      "payments",
      "analytics",
      "uploads",
      "registration-image",
    ].includes(parts[0])
  )
    return false;
  return (
    parts[0] !== "payments" || (parts.length === 2 && parts[1] !== "webhook")
  );
}

export function allowedRedirect(location: string, frontend: string) {
  try {
    const base = new URL(frontend),
      url = new URL(location, base);
    if (url.username || url.password) return false;
    return (
      url.origin === base.origin ||
      (url.protocol === "https:" &&
        ["accounts.google.com", "www.google.com"].includes(url.hostname))
    );
  } catch {
    return false;
  }
}
