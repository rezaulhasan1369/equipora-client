import { test } from "node:test";
import assert from "node:assert/strict";
import {
  backendOrigin,
  gatewayPath,
  safeReturnTo,
} from "../lib/gateway-policy.ts";
test("production backend origin fails closed and rejects credentials, cleartext and caller paths", () => {
  assert.equal(
    backendOrigin("https://api.mziae.com", true),
    "https://api.mziae.com",
  );
  assert.throws(() => backendOrigin(undefined, true));
  for (const url of [
    "http://api.example.com",
    "https://user:secret@example.com",
    "https://example.com/a",
    "https://example.com?q=1",
    "file:///tmp/a",
  ])
    assert.throws(() => backendOrigin(url, true));
  assert.equal(
    backendOrigin("http://127.0.0.1:5090", true, true),
    "http://127.0.0.1:5090",
  );
});
test("gateway excludes operator diagnostics, webhooks and arbitrary URLs", () => {
  assert.equal(gatewayPath(["equipment"], false), true);
  for (const parts of [
    ["health", "db"],
    ["payments", "webhook"],
    ["..", "me"],
    ["https:", "attacker.invalid"],
    ["equipment", "a/b"],
  ])
    assert.equal(gatewayPath(parts, false), false);
});
test("return destinations stay on the frontend", () => {
  assert.equal(safeReturnTo("/equipment/123"), "/equipment/123");
  for (const raw of [
    "https://attacker.invalid",
    "//attacker.invalid",
    "/" + String.fromCharCode(92) + "attacker.invalid",
    null,
  ])
    assert.equal(safeReturnTo(raw), "/dashboard");
});

test("control characters cannot normalize a return destination into an external URL", () => {
  for (const raw of [
    "/" + String.fromCharCode(10) + "/attacker.invalid",
    "/" + String.fromCharCode(9) + "/attacker.invalid",
  ])
    assert.equal(safeReturnTo(raw), "/dashboard");
});

import { allowedRedirect } from "../lib/gateway-policy.ts";
test("OAuth redirects require HTTPS and reject embedded credentials", () => {
  assert.equal(
    allowedRedirect(
      "https://accounts.google.com/o/oauth2/v2/auth",
      "http://localhost:3000",
    ),
    true,
  );
  assert.equal(allowedRedirect("/dashboard", "http://localhost:3000"), true);
  for (const url of [
    "http://accounts.google.com",
    "https://name:secret@accounts.google.com",
    "https://accounts.google.com.attacker.invalid",
  ])
    assert.equal(allowedRedirect(url, "http://localhost:3000"), false);
});
