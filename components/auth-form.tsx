"use client";
import Link from "next/link";
import { safeReturnTo } from "@/lib/gateway-policy";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useToast } from "@/components/toast";
import { authClient } from "@/lib/auth-client";
export function AuthForm({ register = false }: { register?: boolean }) {
  const params = useSearchParams(),
    router = useRouter(),
    [pending, setPending] = useState(false),
    [photo, setPhoto] = useState(""),
    [photoError, setPhotoError] = useState(""),
    [uploading, setUploading] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const notify = useToast();
  const raw = params.get("returnTo");
  const destination = safeReturnTo(raw);
  async function uploadPhoto(file: File | undefined) {
    if (!file) return;
    setPhotoError("");
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 2000000
    ) {
      setPhotoError("Use a JPG, PNG, or WebP image smaller than 2 MB.");
      return;
    }
    setUploading(true);
    try {
      const image = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const response = await fetch("/api/backend/registration-image", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ image }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Image upload failed");
      const url = new URL(result.url);
      if (url.protocol !== "https:" || url.username || url.password)
        throw new Error("Image upload failed");
      setPhoto(url.href);
    } catch (e) {
      setPhotoError(e instanceof Error ? e.message : "Image upload failed");
    } finally {
      setUploading(false);
    }
  }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (uploading) return;
    setError("");
    setMessage("");
    setPending(true);
    const f = new FormData(e.currentTarget),
      email = String(f.get("email")),
      password = String(f.get("password"));
    try {
      if (
        register &&
        (!/[A-Z]/.test(password) ||
          !/[a-z]/.test(password) ||
          password.length < 6)
      )
        throw new Error(
          "Use at least 6 characters, including uppercase and lowercase letters.",
        );
      if (register && !photo.trim()) {
        setPhotoError("Add a profile image URL or upload a photo.");
        return;
      }
      const result = register
        ? await authClient.signUp.email({
            name: String(f.get("name")),
            email,
            password,
            image: photo.trim(),
          })
        : await authClient.signIn.email({ email, password });
      if (result.error)
        throw new Error(result.error.message ?? "Please check your details");
      notify(
        register
          ? "Account created successfully. Welcome to Equipora!"
          : "You’re signed in. Welcome back!",
      );
      setTimeout(() => {
        router.push(destination);
        router.refresh();
      }, 700);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to sign in");
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="container auth-layout">
      <aside className="auth-story">
        <p className="eyebrow">YOUR NEXT PROJECT STARTS HERE</p>
        <h1>
          Make room
          <br />
          for possibility.
        </h1>
        <p>
          Find your equipment. Plan your rental.
          <br />
          Do something great.
        </p>
        <div className="auth-story-mark" aria-hidden="true">
          e.
        </div>
      </aside>
      <section className="auth-panel">
        <p className="eyebrow">
          {register ? "JOIN THE COMMUNITY" : "GOOD TO SEE YOU AGAIN"}
        </p>
        <h2>{register ? "Create your account." : "Welcome back."}</h2>
        <p>
          {register ? "Already have an account?" : "New to Equipora?"}{" "}
          <Link
            className="text-link"
            href={
              (register ? "/login" : "/register") +
              "?returnTo=" +
              encodeURIComponent(destination)
            }
          >
            {register ? "Log in" : "Create an account"}
          </Link>
        </p>
        <form onSubmit={submit}>
          {register && (
            <>
              <label>
                Full name
                <input
                  name="name"
                  className="input"
                  required
                  minLength={2}
                  maxLength={100}
                  autoComplete="name"
                />
              </label>
              <label>
                Profile image URL
                <input
                  name="image"
                  required
                  value={photo}
                  onChange={(e) => {
                    setPhoto(e.target.value);
                    setPhotoError("");
                  }}
                  onInvalid={() =>
                    setPhotoError(
                      "Add a valid HTTPS profile image URL or upload a photo.",
                    )
                  }
                  aria-invalid={Boolean(photoError)}
                  aria-describedby="registration-photo-help registration-photo-error"
                  maxLength={2048}
                  className="input"
                  type="url"
                  placeholder="https://…"
                  pattern="https://.*"
                />
              </label>
              <small id="registration-photo-help">
                Required for email registration. Paste an HTTPS image URL or
                upload a photo.
              </small>
              <label>
                Upload profile photo (ImgBB)
                <input
                  className="file-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={uploading || pending}
                  onChange={(e) => void uploadPhoto(e.target.files?.[0])}
                />
              </label>
              <p
                id="registration-photo-error"
                role={photoError ? "alert" : undefined}
              >
                {photoError}
              </p>
              {uploading && <p role="status">Uploading profile photo...</p>}
            </>
          )}
          <label>
            Email address
            <input
              className="input"
              name="email"
              type="email"
              required
              autoComplete="email"
            />
          </label>
          <label>
            Password
            <input
              className="input"
              name="password"
              type="password"
              required
              minLength={register ? 6 : 1}
              maxLength={128}
              autoComplete={register ? "new-password" : "current-password"}
              aria-describedby={register ? "password-help" : undefined}
            />
          </label>
          {register && (
            <small id="password-help">
              At least 6 characters, with uppercase and lowercase letters.
            </small>
          )}
          {error && (
            <p className="alert alert-error" role="alert">
              {error}
            </p>
          )}
          {message && (
            <p className="alert alert-success" role="status">
              {message}
            </p>
          )}
          <button
            className="btn btn-primary full-width"
            disabled={pending || uploading}
          >
            {pending ? "Please wait…" : register ? "Create account" : "Log in"}
          </button>
        </form>
        <div className="auth-divider">
          <span>or continue with</span>
        </div>
        <button
          className="btn btn-outline full-width"
          disabled={pending || uploading}
          onClick={async () => {
            setError("");
            setPending(true);
            try {
              const result = await authClient.signIn.social({
                provider: "google",
                callbackURL: destination,
              });
              if (result.error) throw new Error("Google unavailable");
            } catch {
              setError(
                "Google sign-in is currently unavailable. Please try again.",
              );
            } finally {
              setPending(false);
            }
          }}
        >
          Google
        </button>
        <p className="small-print">
          New accounts start as Customers. Owner access is managed by an
          administrator.
        </p>
      </section>
    </div>
  );
}
