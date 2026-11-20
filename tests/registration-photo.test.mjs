import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validatePhotoUrl,
  checkPhotoFile,
  uploadErrorMessage,
  uploadedUrl,
  PHOTO_FILE_MAX,
} from "../lib/registration-photo.ts";

test("photo URL accepts only credential-free HTTPS links within the backend limit", () => {
  assert.deepEqual(validatePhotoUrl("  https://i.ibb.co/abc/me.png  "), { ok: true, url: "https://i.ibb.co/abc/me.png" });
  for (const bad of [
    "",
    "   ",
    "http://example.test/me.png",
    "ftp://example.test/me.png",
    "javascript:alert(1)",
    "data:image/png;base64,AAAA",
    "//example.test/me.png",
    "example.test/me.png",
    "https://user:pass@example.test/me.png",
    "https://user@example.test/me.png",
    "https://example.test/" + "a".repeat(2048),
  ]) {
    const r = validatePhotoUrl(bad);
    assert.equal(r.ok, false, bad.slice(0, 40));
    assert.ok(!r.ok && r.message.length > 10);
  }
});

test("photo file check mirrors the upload endpoint's types and 2 MB limit", () => {
  assert.equal(checkPhotoFile({ type: "image/png", size: 1000 }), null);
  assert.equal(checkPhotoFile({ type: "image/jpeg", size: PHOTO_FILE_MAX }), null);
  assert.equal(checkPhotoFile({ type: "image/webp", size: 10 }), null);
  assert.match(checkPhotoFile({ type: "image/gif", size: 10 }), /JPG, PNG or WebP/);
  assert.match(checkPhotoFile({ type: "image/svg+xml", size: 10 }), /JPG, PNG or WebP/);
  assert.match(checkPhotoFile({ type: "image/png", size: PHOTO_FILE_MAX + 1 }), /2 MB/);
  assert.match(checkPhotoFile({ type: "image/png", size: 0 }), /empty/);
});

test("upload failures become actionable messages that never echo unexpected server text", () => {
  assert.match(uploadErrorMessage(429), /paste an image URL/i);
  assert.match(uploadErrorMessage(503), /isn't available/);
  assert.match(uploadErrorMessage(0), /connection/);
  assert.match(uploadErrorMessage(413), /2 MB/);
  assert.equal(uploadErrorMessage(400, "Use a JPG, PNG, or WebP image smaller than 2 MB"), "Use a JPG, PNG, or WebP image smaller than 2 MB.");
  assert.match(uploadErrorMessage(400, "x".repeat(500)), /didn't finish/);
  assert.match(uploadErrorMessage(400, { nested: "object" }), /didn't finish/);
  assert.match(uploadErrorMessage(502, "internal stack trace"), /didn't finish/);
});

test("only an HTTPS URL returned by the upload endpoint is used", () => {
  assert.equal(uploadedUrl("https://i.ibb.co/x/y.png"), "https://i.ibb.co/x/y.png");
  for (const bad of [undefined, null, 42, "", "http://i.ibb.co/x.png", "https://a:b@i.ibb.co/x.png", "javascript:alert(1)"])
    assert.equal(uploadedUrl(bad), null);
});
