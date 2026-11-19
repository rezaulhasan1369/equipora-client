import "server-only";
import { NextRequest } from "next/server";
import { backendOrigin, gatewayPath, allowedRedirect } from "./gateway-policy";
export function apiOrigin() {
  return backendOrigin(
    process.env.API_BASE_URL,
    process.env.NODE_ENV === "production",
    process.env.LOCAL_INTEGRATION_TEST === "1",
  );
}
export async function gateway(
  req: NextRequest,
  parts: string[],
  auth: boolean,
) {
  try {
    if (!gatewayPath(parts, auth))
      return Response.json({ error: "Not found" }, { status: 404 });
    if (
      !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      req.headers.get("origin") !== req.nextUrl.origin
    )
      return Response.json(
        { error: "Request origin is not allowed" },
        { status: 403 },
      );
    const limit = auth ? 32768 : 3000000;
    if (Number(req.headers.get("content-length") ?? 0) > limit)
      return Response.json({ error: "Request too large" }, { status: 413 });
    const chunks: Uint8Array[] = [];
    let size = 0;
    if (req.body) {
      const reader = req.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > limit) {
          await reader.cancel();
          return Response.json({ error: "Request too large" }, { status: 413 });
        }
        chunks.push(value);
      }
    }
    const body = chunks.length ? Buffer.concat(chunks) : undefined;
    const headers = new Headers();
    for (const name of ["content-type", "cookie", "authorization", "origin"]) {
      const value = req.headers.get(name);
      if (value) headers.set(name, value);
    }
    const upstream = await fetch(
      apiOrigin() +
        "/api/" +
        (auth ? "auth/" : "") +
        parts.join("/") +
        req.nextUrl.search,
      {
        method: req.method,
        headers,
        body,
        redirect: "manual",
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      },
    );
    const responseHeaders = new Headers({ "Cache-Control": "no-store" });
    const type = upstream.headers.get("content-type");
    if (type) responseHeaders.set("content-type", type);
    for (const cookie of upstream.headers.getSetCookie())
      responseHeaders.append("set-cookie", cookie);
    const location = upstream.headers.get("location");
    if (location) {
      const u = new URL(location, req.url);
      if (!allowedRedirect(location, req.url))
        return Response.json({ error: "Unexpected redirect" }, { status: 502 });
      responseHeaders.set("location", u.href);
    }
    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch {
    return Response.json(
      { error: "The service is temporarily unavailable. Please try again." },
      { status: 503 },
    );
  }
}
