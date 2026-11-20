"use client";
import Link from "next/link";
import { safeReturnTo } from "@/lib/gateway-policy";
import { useSearchParams, useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { useToast } from "@/components/toast";
import { authClient } from "@/lib/auth-client";
import { RegistrationPhoto, type PhotoHandle, type PhotoState } from "@/components/registration-photo";
export function AuthForm({ register = false }: { register?: boolean }) {
  const params = useSearchParams(),
    router = useRouter(),
    [pending, setPending] = useState(false),
    [photo, setPhoto] = useState<PhotoState>({ url: null, busy: false }),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  // Synchronous guard: a double click must not send two sign-up requests before React re-renders.
  const submitting = useRef(false);
  const photoControl = useRef<PhotoHandle>(null);
  const notify = useToast();
  const raw = params.get("returnTo");
  const destination = safeReturnTo(raw);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting.current || photo.busy) return;
    setError("");
    setMessage("");
    const f = new FormData(e.currentTarget),
      email = String(f.get("email")),
      password = String(f.get("password"));
    if (register && !photo.url) {
      photoControl.current?.reveal();
      return;
    }
    submitting.current = true;
    setPending(true);
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
      const result = register
        ? await authClient.signUp.email({
            name: String(f.get("name")).trim(),
            email,
            password,
            image: photo.url!,
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
      return; // keep the form locked while navigating to the destination
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to sign in");
    }
    submitting.current = false;
    setPending(false);
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
              <RegistrationPhoto
                disabled={pending}
                handle={photoControl}
                onChange={setPhoto}
              />
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
            disabled={pending || photo.busy}
          >
            {pending ? "Please wait…" : register ? "Create account" : "Log in"}
          </button>
        </form>
        <div className="auth-divider">
          <span>or continue with</span>
        </div>
        <button
          className="btn btn-outline full-width"
          disabled={pending || photo.busy}
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
