# Equipora — Equipment Rental Platform

Next.js App Router frontend for **Equipora**, a marketplace where equipment owners list construction, photography,
vehicle, agriculture, electronics and event equipment and customers rent it by the day, week or month
(Programming Hero Assignment 9, Category 003).

| | |
|---|---|
| Live site | https://equipora-client.vercel.app |
| Live API | https://api.mziae.com |
| Frontend repository | https://github.com/rezaulhasan1369/equipora-client |
| Backend repository | https://github.com/rezaulhasan1369/equipora-server |
| Hosting | Vercel (production branch `main`, automatic deployments) |

## Features

- **Home** — animated hero (Framer Motion), six featured approved items, six categories, Why Choose Us,
  How It Works, owner call-to-action and (disclosed, illustrative) reviews.
- **Catalog** — server-side search, category/rental-type/price/availability filters, sorting, pagination,
  comparison of up to three items, Recently Viewed (device-only).
- **Equipment details** (private) — owner info, terms, availability calendar, share/copy link, Book Now modal with
  a server-calculated price estimate and Stripe Checkout (test mode).
- **Authentication** — registration with name, email, profile photo (paste an HTTPS image URL *or* upload through
  ImgBB) and a validated password; login; Google sign-in; success toasts; sessions persist across reloads.
- **Dashboards** — Customer (rentals with timeline/receipts, favorites, notifications, profile), Owner (add/edit/delete
  equipment with ImgBB upload, own rentals, earnings analytics), Admin (users and roles, equipment moderation,
  all rentals, platform analytics with charts).
- **Quality** — responsive from 320 px to 2560 px, persisted light/dark theme, loading/empty/error states,
  keyboard- and screen-reader-friendly forms (axe-checked), custom 404 and error pages.

## Architecture and security

The browser only talks to same-origin route handlers: `/api/auth/*` (Better Auth) and `/api/backend/*` (business
API). They forward to the server-only `API_BASE_URL`, allow-list paths, reject cross-origin mutations, limit body
size, block unexpected redirects and mark every response `no-store`. Session cookies are `__Secure-`, HttpOnly,
Secure, SameSite=Lax and host-only. A short-lived JWT is fetched per API call and never stored. Private layouts check
the session on the server, so protected pages survive reloads. No secret is ever exposed as `NEXT_PUBLIC_*`.

## Environment variables (names only)

| Name | Where | Value |
|---|---|---|
| `API_BASE_URL` | Vercel **Production** (server-only) | `https://api.mziae.com` |
| `LOCAL_INTEGRATION_TEST` | local production-build tests only | never set on Vercel |

Preview deployments deliberately have no `API_BASE_URL`, so they cannot write to production data.

## Local development

Node 22.x. Start the backend's isolated mode first (`npm run dev:isolated` in the server repository, port 5090), then:

```powershell
npm ci
npm run dev          # http://localhost:3000 (use localhost consistently for cookies)
```

## Validation

```powershell
npm run typecheck
npm run lint
npm test             # unit tests (gateway policy, image rules, registration photo rules)
npm run build
npm run test:browser # Playwright + axe; needs a local production build on :3000 and the isolated API
```

The browser suite (166 tests) covers all roles, responsive layouts, accessibility, theme, navigation, booking,
rental experience and registration-photo flows using disposable local fixtures only.

## Packages

next, react, react-dom, better-auth, framer-motion, daisyui, tailwindcss, lucide-react. Development: typescript,
eslint, Playwright, @axe-core/playwright.

## Deployment

Vercel project `equipora-client`: framework Next.js, root `/`, install `npm ci`, build `npm run build`, Node 22.x.
Pushing to `main` deploys production. Roll back by promoting the previous deployment in Vercel.

Full requirement matrix, test evidence and the production report live in the server repository's `docs/`
(see `docs/F14-final-report.md`).
