"use client";
import { useEffect, useId, useImperativeHandle, useRef, useState, type Ref } from "react";
import { ImageUp, Link2, LoaderCircle, X } from "lucide-react";
import {
  checkPhotoFile,
  uploadErrorMessage,
  uploadedUrl,
  validatePhotoUrl,
} from "@/lib/registration-photo";

export type PhotoState = { url: string | null; busy: boolean };
export type PhotoHandle = { reveal: () => void };
type Mode = "url" | "upload";
type Preview = "idle" | "loading" | "ok" | "error";

// Registration photo: either a pasted HTTPS image URL or an ImgBB upload through the
// backend's fixed, origin-checked /api/registration-image endpoint. Both produce one HTTPS URL.
export function RegistrationPhoto({
  disabled,
  handle,
  onChange,
}: {
  disabled: boolean;
  handle: Ref<PhotoHandle>;
  onChange: (state: PhotoState) => void;
}) {
  const id = useId();
  const [mode, setMode] = useState<Mode>("url");
  const [urlInput, setUrlInput] = useState("");
  const [urlTouched, setUrlTouched] = useState(false);
  // The preview result belongs to one exact URL; editing the link makes it stale automatically.
  const [checked, setChecked] = useState<{ src: string; status: Preview }>({ src: "", status: "idle" });
  const [uploaded, setUploaded] = useState<{ url: string; name: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [requiredShown, setRequiredShown] = useState(false);
  const urlRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadAbort = useRef<AbortController | null>(null);

  const urlCheck = validatePhotoUrl(urlInput);
  const checkedUrl = urlCheck.ok ? urlCheck.url : "";
  const preview: Preview = checkedUrl && checked.src === checkedUrl ? checked.status : "idle";
  const previewSrc = preview === "idle" ? "" : checked.src;
  const effective =
    mode === "url" ? (checkedUrl && preview !== "error" ? checkedUrl : null) : (uploaded?.url ?? null);

  useEffect(() => {
    onChange({ url: effective, busy: uploading });
  }, [effective, uploading, onChange]);

  // Debounced preview of a pasted link, so a broken or non-image URL is caught before sign-up.
  // A slow host never blocks submission; only a confirmed load failure does.
  useEffect(() => {
    if (!checkedUrl) return;
    const t = setTimeout(() => setChecked({ src: checkedUrl, status: "loading" }), 350);
    return () => clearTimeout(t);
  }, [checkedUrl]);

  // A submit with no usable photo reveals the relevant message and moves focus to the control.
  useImperativeHandle(
    handle,
    () => ({
      reveal() {
        setRequiredShown(true);
        setUrlTouched(true);
        if (mode === "url") urlRef.current?.focus();
        else fileRef.current?.focus();
      },
    }),
    [mode],
  );

  useEffect(() => () => uploadAbort.current?.abort(), []);

  // Records a load result only if it is still for the link currently being checked.
  function settle(src: string, status: "ok" | "error") {
    setChecked((c) => (c.src === src ? { src, status } : c));
  }

  function chooseMode(next: Mode) {
    if (next === mode) return;
    if (uploading) {
      uploadAbort.current?.abort();
      setUploading(false);
    }
    setUploadError("");
    setMode(next);
  }

  async function upload(file: File | undefined) {
    if (!file) return;
    setUploadError("");
    const problem = checkPhotoFile(file);
    if (problem) {
      setUploadError(problem);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    uploadAbort.current?.abort();
    const controller = new AbortController();
    uploadAbort.current = controller;
    const timeout = setTimeout(() => controller.abort(), 30000);
    setUploading(true);
    try {
      const image = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
        reader.onerror = () => reject(new Error("read"));
        reader.readAsDataURL(file);
      });
      let response: Response;
      try {
        response = await fetch("/api/backend/registration-image", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ image }),
          signal: controller.signal,
        });
      } catch {
        if (controller.signal.aborted && uploadAbort.current !== controller) return; // superseded or mode switched
        throw Object.assign(new Error("network"), { status: controller.signal.aborted ? -1 : 0 });
      }
      const body: { url?: unknown; error?: unknown } = await response.json().catch(() => ({}));
      if (uploadAbort.current !== controller) return;
      if (!response.ok) throw Object.assign(new Error("upload"), { status: response.status, server: body.error });
      const url = uploadedUrl(body.url);
      if (!url) throw Object.assign(new Error("upload"), { status: 502 });
      setUploaded({ url, name: file.name });
      setRequiredShown(false);
    } catch (e) {
      if (uploadAbort.current !== controller) return;
      const err = e as { status?: number; server?: unknown; message?: string };
      setUploadError(
        err.status === -1
          ? "The upload took too long. Try again, or paste an image URL instead."
          : err.message === "read"
            ? "We couldn't read that file. Choose another photo."
            : uploadErrorMessage(err.status ?? 502, err.server),
      );
    } finally {
      clearTimeout(timeout);
      if (uploadAbort.current === controller) {
        uploadAbort.current = null;
        setUploading(false);
        if (fileRef.current) fileRef.current.value = "";
      }
    }
  }

  const urlMessage =
    mode !== "url"
      ? ""
      : !urlInput.trim()
        ? requiredShown
          ? "Add a profile photo: paste an image URL or switch to Upload photo."
          : ""
        : urlTouched && !urlCheck.ok
          ? urlCheck.message
          : preview === "error"
            ? "We couldn't load an image from that link. Check the address, or upload a photo instead."
            : "";
  const uploadMessage =
    mode !== "upload"
      ? ""
      : uploadError || (requiredShown && !uploaded && !uploading ? "Add a profile photo: choose an image to upload or paste an image URL." : "");
  const message = urlMessage || uploadMessage;
  const errorId = `${id}-photo-error`;
  const shownSrc = mode === "url" ? (preview === "ok" || preview === "loading" ? previewSrc : "") : (uploaded?.url ?? "");

  return (
    <fieldset className="photo-field" disabled={disabled} aria-describedby={`${id}-photo-help`}>
      <legend>
        Profile photo <span className="required-mark" aria-hidden="true">*</span>
        <span className="sr-only"> (required)</span>
      </legend>
      <div className="photo-modes" role="radiogroup" aria-label="How would you like to add your photo?">
        <label className={"photo-mode" + (mode === "url" ? " is-active" : "")}>
          <input type="radio" name={`${id}-mode`} value="url" checked={mode === "url"} onChange={() => chooseMode("url")} />
          <Link2 size={16} aria-hidden="true" />
          Paste image URL
        </label>
        <label className={"photo-mode" + (mode === "upload" ? " is-active" : "")}>
          <input type="radio" name={`${id}-mode`} value="upload" checked={mode === "upload"} onChange={() => chooseMode("upload")} />
          <ImageUp size={16} aria-hidden="true" />
          Upload photo
        </label>
      </div>

      {mode === "url" ? (
        <>
          <label>
            Image URL
            <input
              ref={urlRef}
              name="image"
              className="input"
              type="url"
              inputMode="url"
              required
              pattern="https://.*"
              maxLength={2048}
              placeholder="https://example.com/your-photo.jpg"
              autoComplete="photo"
              value={urlInput}
              aria-invalid={Boolean(urlMessage)}
              aria-describedby={`${id}-photo-help ${errorId}`}
              onChange={(e) => setUrlInput(e.target.value)}
              onBlur={() => setUrlTouched(true)}
              onInvalid={(e) => {
                e.preventDefault();
                setUrlTouched(true);
                setRequiredShown(true);
                urlRef.current?.focus();
              }}
            />
          </label>
          <small id={`${id}-photo-help`}>A direct link to a JPG, PNG or WebP image, starting with https://</small>
        </>
      ) : (
        <>
          <label className={"photo-drop" + (uploading ? " is-busy" : "")}>
            {uploaded ? "Choose a different photo" : "Choose a photo"}
            <input
              ref={fileRef}
              className="file-input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={uploading}
              aria-invalid={Boolean(uploadMessage)}
              aria-describedby={`${id}-photo-help ${errorId}`}
              onChange={(e) => void upload(e.target.files?.[0])}
            />
          </label>
          <small id={`${id}-photo-help`}>JPG, PNG or WebP, up to 2 MB. Your photo is stored with ImgBB.</small>
        </>
      )}

      {(shownSrc || uploading) && (
        <div className="photo-preview" aria-live="polite">
          {shownSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={shownSrc}
              src={shownSrc}
              alt="Profile photo preview"
              referrerPolicy="no-referrer"
              hidden={mode === "url" && preview !== "ok"}
              onLoad={() => mode === "url" && settle(shownSrc, "ok")}
              onError={() => mode === "url" && settle(shownSrc, "error")}
            />
          ) : null}
          <span className="photo-preview-status" role="status">
            {uploading ? (
              <>
                <LoaderCircle className="animate-spin motion-reduce:animate-none" size={16} aria-hidden="true" /> Uploading photo…
              </>
            ) : mode === "url" ? (
              preview === "ok" ? "Image found" : "Checking image…"
            ) : uploaded ? (
              <>Uploaded {uploaded.name}</>
            ) : null}
          </span>
          {mode === "upload" && uploaded && !uploading && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setUploaded(null);
                fileRef.current?.focus();
              }}
            >
              <X size={14} aria-hidden="true" /> Remove
            </button>
          )}
        </div>
      )}

      <p id={errorId} className="photo-error" role={message ? "alert" : undefined}>
        {message}
      </p>
    </fieldset>
  );
}
