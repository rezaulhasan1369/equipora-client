"use client";
import { authClient } from "./auth-client";
export async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
  protectedRoute = true,
): Promise<T> {
  const headers: Record<string, string> = {};
  if (body) headers["content-type"] = "application/json";
  if (protectedRoute) {
    const token = await authClient.token();
    if (token.error || !token.data?.token)
      throw new Error("Please sign in to continue");
    headers.authorization = "Bearer " + token.data.token;
  }
  const response = await fetch("/api/backend/" + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  const data = await response
    .json()
    .catch(() => ({ error: "The service is unavailable" }));
  if (!response.ok)
    throw new Error(data.error ?? "The request could not be completed");
  return data;
}
