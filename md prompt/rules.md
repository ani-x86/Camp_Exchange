# CampusXchange (CampX) — Rules for AI Coding Editors

This file is context for AI coding assistants (Antigravity, Cursor, Windsurf, Copilot, etc.) working in this repo. Read `architecture.md`, `design.md`, and `phases.md` before generating code — this file is the condensed, always-apply version of those.

## What this project is
A campus-only marketplace (MERN) where verified students list used items and other students buy them. Trust comes from PRN + email verification, not from being a generic storefront. Keep that framing — this is not a generic e-commerce template.

## Stack — do not substitute
- Frontend: React + Redux Toolkit (RTK Query for data fetching) + React Router + Tailwind CSS
- Backend: Node.js + Express, REST (no GraphQL)
- DB: MongoDB + Mongoose
- Verification service: Python + FastAPI, separate from the Express API — never merge OCR/verification logic into the Node backend
- Images: Cloudinary (never store binary images in MongoDB or on local disk)
- Payments: Razorpay (Checkout + webhook), never a custom/manual "mark as paid" path
- Email: Nodemailer/SendGrid
- Auth: JWT (short-lived access + httpOnly refresh cookie) + bcrypt

If a task seems to need a different library or pattern than what's above, flag it and ask rather than silently introducing a new dependency.

## Folder structure — follow, don't reorganize
```
/client      → React app (src/pages, src/components, src/redux, src/api)
/server      → Express API (routes, controllers, models, middleware)
/verification-service → FastAPI OCR service
```
New files go in the matching folder for their layer. Don't create a new top-level folder without a reason stated in the commit/PR description.

## Non-negotiable rules

1. **Payment status is only ever set by the Razorpay webhook handler**, after signature verification. No route, script, or admin action should be able to set `paymentStatus: paid` any other way. If asked to build a "manual verify payment" button, push back and point to this rule.
2. **ID card images are private.** They go in a signed/authenticated Cloudinary folder, never the public product-image folder, and are never returned in any API response sent to the general frontend — only to the admin verification queue.
3. **Verification service stays Python, stays separate.** Don't inline OCR calls into Express controllers; Express calls the FastAPI service over HTTP.
4. **Category is a fixed enum** (`books | electronics | furniture | stationery | other`) selected by the seller. Don't add an ML auto-classifier unless the task explicitly says Phase 5 stretch goals are in scope.
5. **Passwords and secrets never get logged**, including in `console.log` debug statements. Don't print full user objects that include `passwordHash` or `idCardImageUrl`.
6. **Follow the phase order in `phases.md`.** Don't build a stretch-goal feature (chat, ratings, wishlist, PWA, Android) while any Phase 0–5 task is unchecked, unless explicitly told scope has changed.

## Design system — apply from `design.md`, don't reinvent
- Colors: Bone `#F2EFE6` background, Ink `#17181A` text, Moss `#3F6B3E` primary/verified, Marigold `#E0A72E` price/highlight, Clay `#C9C2B2` borders, Rust `#B5482A` errors only.
- Type: General Sans for headings, Inter for body/UI, IBM Plex Mono **only** for literal data (price, PRN, order ID, timestamps) — never use monospace decoratively.
- Layout: left-aligned, pinboard-style product grid with a tag-corner accent, not uniform rounded SaaS cards with drop shadows.
- Motion: animate only in response to a user action (click/hover/focus) — no scroll-triggered or page-load animation. Keep durations under ~400ms. Every interactive element needs a visible keyboard focus state. Respect `prefers-reduced-motion` (fall back to instant/opacity-only changes).
- Don't add hover effects to every element by default — check `design.md` §5 for which components actually get motion (buttons, product cards, wishlist icon, cart icon, nav icons, verification badge, form fields, toasts) and match the spec given there rather than inventing new ones.

## Code style
- JavaScript/React: functional components, hooks, no class components. Named exports for components unless a page requires a default export for routing.
- Async code: `async/await`, not `.then` chains. Every route handler wraps DB/external calls in try/catch and returns a consistent error shape: `{ error: string }`.
- Naming: REST routes are resource-based (`/api/products`, `/api/transactions`), not verb-based (`/api/getProducts`).
- No inline styles in React components — Tailwind utility classes only, matching the tokens above (don't hardcode a hex color that isn't in the palette).
- Write error and empty-state copy in the interface's voice: say what happened and what to do next, no apologies, no vague "something went wrong" without a next step.

## When generating a new feature
Before writing code, check: which phase (in `phases.md`) does this belong to, and does it depend on anything not yet built? If it's a stretch goal, say so explicitly rather than building it silently.
