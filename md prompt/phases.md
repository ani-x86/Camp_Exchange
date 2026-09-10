# CampusXchange (CampX) — Project Phases

Context doc for tracking where the build stands. Pairs with `architecture.md` (system design) and `design.md` (visual/interaction spec). Update the status column as work lands.

**Timeline:** 12 weeks. **Scope discipline:** anything not in Phase 0–5 is a stretch goal (see bottom) — don't pull it forward until its phase is done.

---

## Phase 0 — Foundations (Weeks 1–2)
**Goal:** a running skeleton, nothing user-facing yet.

| Task | Depends on | Status |
|---|---|---|
| Repo structure (client/server/verification-service) | — | ☐ |
| Express server + MongoDB Atlas connection | — | ☐ |
| React app scaffold + Redux Toolkit store | — | ☐ |
| React Router base routes | React scaffold | ☐ |
| Tailwind + design tokens from `design.md` wired in | design.md | ☐ |
| Env var setup (JWT secret, DB URI, Cloudinary, Razorpay, SMTP) | — | ☐ |

**Exit criteria:** frontend and backend run locally and talk to each other; empty pages exist for every route in the sitemap.

---

## Phase 1 — Auth & Verification (Weeks 3–4)
**Goal:** a student can create an account and get verified end to end.

| Task | Depends on | Status |
|---|---|---|
| Signup form (name, PRN, college email, password) | Phase 0 | ☐ |
| Email OTP send + confirm (Nodemailer) | Phase 0 | ☐ |
| Login + JWT issue/refresh, bcrypt password hashing | OTP flow | ☐ |
| ID card upload → private Cloudinary folder | Phase 0 | ☐ |
| FastAPI OCR service: extract text, fuzzy-match PRN | ID upload | ☐ |
| Verification status states (pending/verified/pending_review/rejected) | OCR service | ☐ |
| Admin review queue (basic list + approve/reject) | Verification states | ☐ |
| `ProtectedRoute` gating listing/buying on verified status | Auth + status | ☐ |

**Exit criteria:** a real signup → OTP → ID upload → verified (or flagged for review) → admin can approve — works end to end for one test account.

---

## Phase 2 — Listings (Weeks 5–6)
**Goal:** verified users can list and browse items.

| Task | Depends on | Status |
|---|---|---|
| Create-listing form (title, description, category dropdown, price, photos) | Phase 1 | ☐ |
| Product image upload to Cloudinary (public folder) | Phase 0 | ☐ |
| Product model + `POST /api/products` | Phase 0 | ☐ |
| Browse/search page with category filter | Product model | ☐ |
| Product detail page | Product model | ☐ |
| Seller's "my listings" view (edit/delete/mark status) | Product model | ☐ |

**Exit criteria:** a verified user lists an item with photos, and another user can find and open it from the browse page.

---

## Phase 3 — Cart & Checkout UI (Weeks 7–8)
**Goal:** a buyer can go from "interested" to "paying."

| Task | Depends on | Status |
|---|---|---|
| Cart state (Redux) | Phase 2 | ☐ |
| Checkout page UI | Cart state | ☐ |
| Razorpay Checkout integration (sandbox keys) | Checkout page | ☐ |
| `Transaction` model + `POST /api/transactions` (creates order, status `created`) | Cart state | ☐ |
| Webhook endpoint `POST /api/transactions/webhook` + signature verification | Transaction model | ☐ |

**Exit criteria:** a sandbox payment completes and the webhook correctly flips a transaction to `paid` — no manual step in between.

---

## Phase 4 — Transactions & Notifications (Weeks 9–10)
**Goal:** payment success turns into a finished, communicated transaction.

| Task | Depends on | Status |
|---|---|---|
| Product `status` flips to `sold` on payment success | Phase 3 webhook | ☐ |
| Pickup details captured (location/time window) | Phase 3 | ☐ |
| Receipt email (buyer): item info + pickup details + thank-you | Webhook | ☐ |
| Seller notification email on sale | Webhook | ☐ |
| Order history page (buyer) / sales page (seller) | Transaction model | ☐ |

**Exit criteria:** completing a sandbox purchase results in both parties getting the right email, and both can see the order in their dashboard.

---

## Phase 5 — Admin, Polish, Deploy (Weeks 11–12)
**Goal:** ship it.

| Task | Depends on | Status |
|---|---|---|
| Admin dashboard: verification queue + reported listings | Phase 1, 2 | ☐ |
| Responsive pass (mobile-first check across all pages) | All UI phases | ☐ |
| Rate limiting on auth/OTP endpoints | Phase 1 | ☐ |
| End-to-end test pass (signup → verify → list → buy → receipt) | All phases | ☐ |
| Deploy: frontend (Vercel), API (Render), verification service (Render), DB (Atlas) | All phases | ☐ |
| Project report / demo script | Deploy | ☐ |

**Exit criteria:** a stranger can go to the live URL, sign up with a test account, and complete a full purchase without you touching anything.

---

## Stretch goals (only if a phase above finishes early)
- In-app buyer/seller chat (Socket.io)
- Auto category suggestion from photo (MobileNet transfer learning)
- Seller ratings/reviews
- Wishlist + saved-search email alerts
- Meet-up time/location scheduling UI
- PWA support (installable, offline shell)
- Android app

Do not start a stretch goal while any Phase 0–5 task above is still unchecked.
