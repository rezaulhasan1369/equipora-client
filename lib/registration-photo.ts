// Client-side mirror of the backend sign-up photo rules (server/src/auth.ts) and the
// registration upload limits (server/src/marketplace.ts uploadImage). The backend stays authoritative.
export const PHOTO_URL_MAX = 2048;
export const PHOTO_FILE_MAX = 2_000_000;
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export type PhotoUrlResult =
  | { ok: true; url: string }
  | { ok: false; message: string };

export function validatePhotoUrl(raw: string): PhotoUrlResult {
  const value = raw.trim();
  if (!value) return { ok: false, message: "Paste an image URL or switch to Upload photo." };
  if (value.length > PHOTO_URL_MAX)
    return { ok: false, message: "That link is too long. Use a shorter image URL." };
  if (!URL.canParse(value))
    return { ok: false, message: "That doesn't look like a web address. It should start with https://" };
  const url = new URL(value);
  if (url.protocol !== "https:")
    return { ok: false, message: "Use a secure link that starts with https://" };
  if (url.username || url.password)
    return { ok: false, message: "Image links can't contain a username or password." };
  return { ok: true, url: url.href };
}

export function checkPhotoFile(file: { type: string; size: number }): string | null {
  if (!(PHOTO_TYPES as readonly string[]).includes(file.type))
    return "Choose a JPG, PNG or WebP image.";
  if (file.size > PHOTO_FILE_MAX) return "That photo is larger than 2 MB. Choose a smaller image.";
  if (file.size === 0) return "That file is empty. Choose another photo.";
  return null;
}

// Maps the upload endpoint's outcome to a message that tells the person what to do next.
export function uploadErrorMessage(status: number, serverMessage?: unknown): string {
  if (status === 429)
    return "Too many photo uploads right now. Paste an image URL instead, or try again later.";
  if (status === 503)
    return "Photo upload isn't available right now. Paste an image URL instead.";
  if (status === 400 && typeof serverMessage === "string" && serverMessage.length <= 120)
    return serverMessage.endsWith(".") ? serverMessage : serverMessage + ".";
  if (status === 413) return "That photo is larger than 2 MB. Choose a smaller image.";
  if (status === 0) return "We couldn't reach the upload service. Check your connection and try again.";
  return "The upload didn't finish. Try again, or paste an image URL instead.";
}

// Only an HTTPS URL without credentials returned by the upload endpoint is accepted.
export function uploadedUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const r = validatePhotoUrl(value);
  return r.ok ? r.url : null;
}
