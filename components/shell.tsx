"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, X, ArrowUpRight, Hexagon } from "lucide-react";
import { Brand } from "./brand";
import { ThemeToggle } from "./theme-toggle";
import { useSession } from "./session";
import { authClient } from "@/lib/auth-client";
export function Header() {
  const { user, pending } = useSession(),
    [open, setOpen] = useState(false),
    [scrolled, setScrolled] = useState(false),
    path = usePathname(),
    router = useRouter(),
    header = useRef<HTMLElement>(null),
    toggle = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    let floating = false;
    let frame = 0;
    const update = () => {
      frame = 0;
      const next = floating ? window.scrollY > 80 : window.scrollY >= 112;
      if (next !== floating) {
        floating = next;
        setScrolled(next);
      }
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    return () => {
      window.removeEventListener("scroll", schedule);
      window.cancelAnimationFrame(frame);
    };
  }, []);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow,
      main = document.querySelector("main"),
      footer = document.querySelector("footer"),
      oldMain = main?.inert ?? false,
      oldFooter = footer?.inert ?? false;
    document.body.style.overflow = "hidden";
    if (main) main.inert = true;
    if (footer) footer.inert = true;
    const desktop = window.matchMedia("(min-width: 1101px)");
    const close = () => {
      if (desktop.matches) setOpen(false);
    };
    desktop.addEventListener("change", close);
    return () => {
      document.body.style.overflow = previous;
      if (main) main.inert = oldMain;
      if (footer) footer.inert = oldFooter;
      desktop.removeEventListener("change", close);
    };
  }, [open]);
  function close() {
    setOpen(false);
    toggle.current?.focus();
  }
  return (
    <header
      ref={header}
      data-catalog={path === "/equipment" ? "true" : undefined}
      data-equipment={
        path === "/equipment" || path.startsWith("/equipment/")
          ? "true"
          : undefined
      }
      className={
        "site-header premium-header " +
        (scrolled ? "is-scrolled " : "") +
        (path === "/" ? "over-hero " : "") +
        (open ? "menu-open" : "")
      }
      onKeyDown={(event) => {
        if (!open) return;
        if (event.key === "Escape") {
          event.preventDefault();
          close();
        }
        if (event.key === "Tab") {
          const elements = Array.from(
            header.current?.querySelectorAll<HTMLElement>(
              "a[href],button:not([disabled])",
            ) ?? [],
          ).filter((el) => el.getClientRects().length > 0);
          const first = elements[0],
            last = elements[elements.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }
      }}
    >
      <div className="container header-inner">
        <Link
          href="/"
          className="brand"

          onClick={() => setOpen(false)}
        >
          <Brand />
          <span className="sr-only"> home</span>
        </Link>
        <nav
          id="equipora-navigation"
          className={open ? "main-nav is-open" : "main-nav"}
          aria-label="Main navigation"
        >
          <div className="nav-links">
            <Link
              aria-current={path === "/" ? "page" : undefined}
              href="/"
              onClick={() => setOpen(false)}
            >
              Home
            </Link>
            <Link
              aria-current={path.startsWith("/equipment") ? "page" : undefined}
              href="/equipment"
              onClick={() => setOpen(false)}
            >
              All equipment
            </Link>
            <Link href="/#how-it-works" onClick={() => setOpen(false)}>
              How it works
            </Link>
          </div>
          <div className="nav-actions">
            {pending ? (
              <span className="muted">Checking session...</span>
            ) : user ? (
              <>
                <Link
                  aria-current={
                    path.startsWith("/dashboard") ? "page" : undefined
                  }
                  href="/dashboard"
                  onClick={() => setOpen(false)}
                >
                  Dashboard
                </Link>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={async () => {
                    await authClient.signOut();
                    setOpen(false);
                    router.push("/");
                    router.refresh();
                  }}
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setOpen(false)}>
                  Log in
                </Link>
                <Link
                  className="btn btn-primary btn-sm"
                  href="/register"
                  onClick={() => setOpen(false)}
                >
                  Register <ArrowUpRight size={16} />
                </Link>
              </>
            )}
          </div>
        </nav>
        <div className="header-controls">
          <ThemeToggle />
          <button
            ref={toggle}
            className="btn btn-ghost mobile-toggle"
            aria-label="Toggle navigation"
            aria-expanded={open}
            aria-controls="equipora-navigation"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X /> : <Menu />}
            <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
export function Footer() {
  return (
    <footer className="site-footer cinematic-footer">
      <div className="container footer-content">
        <div className="footer-grid">
          <div className="footer-brand-column">
            <Link href="/" className="brand">
              <Brand light />
              <span className="sr-only"> home</span>
            </Link>
            <p className="footer-tagline">
              Good equipment.
              <br />
              Greater possibilities.
            </p>
            <p>
              A thoughtfully built rental marketplace for your next great
              project.
            </p>
            <p className="footer-demo-note">
              Portfolio preview | synthetic inventory | test payments
            </p>
          </div>
          <nav className="footer-navigation" aria-label="Footer navigation">
            <div>
              <strong>Explore</strong>
              <Link href="/">Home</Link>
              <Link href="/equipment">All equipment</Link>
              <Link href="/#categories">Categories</Link>
              <Link href="/#how-it-works">How it works</Link>
            </div>
            <div>
              <strong>Customers &amp; owners</strong>
              <Link href="/dashboard">Dashboard</Link>
              <Link href="/register">Create an account</Link>
              <Link href="/login">Log in</Link>
            </div>
            <div>
              <strong>Company &amp; support</strong>
              <Link href="/privacy">Privacy &amp; demo data</Link>
              <Link href="/terms">Rental &amp; demo terms</Link>
              <Link href="/asset-credits">Image credits</Link>
              <p className="newsletter-note">
                Newsletter signup is not enabled in this demonstration.
              </p>
            </div>
          </nav>
          <div className="footer-connect">
            <strong>Connect</strong>
            <div
              className="footer-socials"
              role="group"
              aria-label="Demo social icons - return to home"
            >
              <Link
                className="footer-social"
                href="/"
                aria-label="GitHub demo - return to Equipora home"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M12 .75a11.25 11.25 0 0 0-3.56 21.92c.56.1.77-.24.77-.54v-2.1c-3.13.68-3.79-1.33-3.79-1.33-.51-1.3-1.25-1.65-1.25-1.65-1.02-.7.08-.69.08-.69 1.13.08 1.73 1.16 1.73 1.16 1 1.72 2.64 1.22 3.28.93.1-.73.39-1.22.71-1.5-2.5-.29-5.13-1.25-5.13-5.57 0-1.23.44-2.23 1.16-3.02-.12-.28-.5-1.43.11-2.98 0 0 .95-.3 3.1 1.15a10.8 10.8 0 0 1 5.64 0c2.15-1.45 3.1-1.15 3.1-1.15.61 1.55.23 2.7.11 2.98.72.79 1.16 1.79 1.16 3.02 0 4.33-2.64 5.28-5.15 5.56.4.35.76 1.03.76 2.08v3.11c0 .3.2.65.78.54A11.25 11.25 0 0 0 12 .75Z" />
                </svg>
              </Link>{" "}
              <Link
                className="footer-social footer-social-demo"
                href="/"
                aria-label="LinkedIn demo - return to Equipora home"
                title="Demo icon - return to Equipora home"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M20.45 2H3.55C2.69 2 2 2.68 2 3.52v16.96c0 .84.69 1.52 1.55 1.52h16.9c.86 0 1.55-.68 1.55-1.52V3.52c0-.84-.69-1.52-1.55-1.52ZM7.93 18.75H4.98V9.2h2.95v9.55ZM6.46 7.9a1.71 1.71 0 1 1 0-3.42 1.71 1.71 0 0 1 0 3.42Zm12.3 10.85H15.8V14.1c0-1.11-.02-2.54-1.55-2.54-1.55 0-1.79 1.21-1.79 2.46v4.73H9.5V9.2h2.84v1.3h.04c.4-.75 1.36-1.55 2.8-1.55 3 0 3.57 1.98 3.57 4.55v5.25Z" />
                </svg>
              </Link>
              <Link
                className="footer-social footer-social-demo"
                href="/"
                aria-label="Email demo - return to Equipora home"
                title="Demo icon - return to Equipora home"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="m3 6 9 7 9-7" />
                </svg>
              </Link>
            </div>
            <p className="footer-copyright">
              {"\u00a9"} {new Date().getFullYear()} Equipora
            </p>
            <p>
              Built for possibility.
              <br />
              Rent with clarity.
            </p>
          </div>
        </div>
        <div className="demo-partners">
          <p>ILLUSTRATIVE PARTNER MARKS | DEMO BRANDING, NO ENDORSEMENTS</p>
          <div>
            {["FIELD / FORM", "LUMEN WORKS", "NORTHLINE", "MAKER CO."].map(
              (name) => (
                <span key={name}>
                  <Hexagon size={17} />
                  {name}
                </span>
              ),
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
