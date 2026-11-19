# Equipora — Equipment Rental Platform

Next.js App Router, React and TypeScript frontend for Programming Hero Assignment 9, Category 003.

## Status and live URLs

- Accepted backend infrastructure: https://api.mziae.com (E8).
- Frontend live URL: not published; Vercel publication requires owner approval.
- F1 marketplace/auth APIs are local changes and have not replaced E8. Pointing this frontend at E8 alone will not provide marketplace functionality yet.

## Features

Responsive public home and equipment catalog; server-side search/filter/sort/pagination; protected details, favorites and booking form; email/Google auth integration; customer, owner and admin workspaces; equipment creation/edit/moderation; profiles; rental tables; database-derived analytics; payment confirmation; loading/error/empty/success states.

The four home review cards are explicitly illustrative, not verified testimonials. Local fixture listings are never production inventory. F2 verified Google login, real imgbb upload and Stripe sandbox Checkout/webhooks locally with private configuration and disposable data. Hosted provider configuration and acceptance remain pending.

## Local setup

Use Node 22.23.5 or a compatible supported 22.x runtime.

1. Start the sibling server using its isolated-development instructions, not its production environment.
2. Install with `npm ci`.
3. Copy `.env.example` to a private local environment file and set the server-only `API_BASE_URL`.
4. Run `npm run dev`; use http://localhost:3000 consistently for local cookies.

The isolated API runs on port 5090. For production-build local acceptance only, set `API_BASE_URL=http://127.0.0.1:5090` and `LOCAL_INTEGRATION_TEST=1` in the process environment. Never set the integration-test switch on Vercel.

## Checks

- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
- `npm run test:browser` against a running local production build and isolated fixture API; Chrome must be available.

## Architecture and security

The browser uses same-origin `/api/auth/*` and `/api/backend/*` gateways. They forward only to the configured backend origin, reject diagnostic/webhook proxying and foreign mutation origins, limit request size, reject unexpected redirects, and never read MongoDB, diagnostic or Stripe secrets. Better Auth cookies stay HttpOnly and host-only; JWTs are obtained per API request and are not saved to browser storage. Private layouts check the server session before rendering, so a reload does not discard the session.

Backend `AUTH_PUBLIC_URL` must be the frontend origin for the proxied OAuth callback and host-only cookie flow. Do not connect business/auth flows to production until the F1 backend release and exact frontend origin are approved.

## Packages

Next.js, React, TypeScript, Better Auth, Framer Motion, DaisyUI/Tailwind CSS and Lucide icons; ESLint, Prettier, Playwright and axe-core for development and verification. Lockfiles are retained. No paid service is required for local development.

## Deployment

See the sibling server's `docs/F1-deployment-readiness.md` for coordinated release, required environment names, acceptance and rollback. The independent equipora-client repository uses root `/`, framework Next.js, build `npm run build`, and Node 22.x. Do not configure static export.

## F3 acceptance and release gates

Final local QA covers Customer/Owner/Admin workflows, four viewport sizes, WCAG label/contrast checks, production builds and security scans. The complete assignment matrix, QA results and approval-gated deployment/rollback plan are prepared in the sibling server repository under `docs/F3-requirements-matrix.md`, `docs/F3-qa-report.md` and `docs/F3-release-plan.md` (publish those alongside the approved server source).

The current client history has one meaningful foundation commit; the assignment requires at least twenty. No history was fabricated. Final frontend URL, approved hosted business API, provider callbacks/webhook, disclosed illustrative review acceptance, secure production Admin provisioning and owner visual acceptance remain release/submission gates.

For local provider testing use the server's masked encrypted helper; do not put secrets in this repository or NEXT_PUBLIC variables. Hosted Checkout needs no frontend Stripe key. The CLI claimable sandbox is temporary unless claimed; the hosted assignment demo must use an approved persistent owner-controlled test environment. Do not enable live payments or copy the CLI webhook secret to hosting.
## F5 visual preview

The sibling server docs/F5-implementation-and-QA.md records the visual acceptance guide, test scope and remaining limitations. Optional --catalog=f5 isolated backend mode supplies 30 disclosed synthetic listings; default baseline browser tests retain six fixtures. Artwork, motion posters and licensed equipment-image credits are local assets. This checkpoint is ready for owner visual review, not production publication.


## F6.4 release candidate

The owner-confirmed F6.3 photo requirement is preserved: email/password registration requires a valid direct HTTPS image URL or ImgBB upload. Existing validation, accessible feedback and Google OAuth registration behavior remain unchanged. Thirty synthetic fixtures, six featured items, supplied WebM media, accepted floating/full-width navbar and three footer home destinations remain unchanged. For expanded browser acceptance run the sibling isolated server with `--catalog=f5`, then set process-only `EQUIPORA_TEST_F5=1` before `npm run test:browser`. Without that flag the original six-record test expectations remain intact. Use localhost:3000 with the isolated loopback API, never production data.

Production frontend configuration needs server-only `API_BASE_URL=https://api.mziae.com`; do not set LOCAL_INTEGRATION_TEST or put MongoDB, diagnostic, Google, Stripe or ImgBB secrets in browser/public configuration. The final frontend URL and approved backend/provider configuration are pending; no live URL is invented.

See sibling server `docs/F6.4-report.md`, `docs/F6.4-commit-plan.json` and `docs/F6.4-release-plan.md` for the actual blockers, genuine staged-snapshot review order, hosted acceptance and coordinated rollback. Commit/push/publication, production writes and operational mail/cron activation require separate approval.
