# Project Requirement Document — CampusXchange (CampX)

Companion docs: `architecture.md` (system design), `design.md` (visual/interaction spec), `phases.md` (build timeline), `rules.md` (AI-editor coding rules).

## 1. Summary

CampX is a campus-only marketplace where students buy and sell used items (books, electronics, furniture) with each other. Trust is established through identity verification (college email + PRN + ID card review) rather than relying on a generic, unverified listing platform. It functions as a digital thrift store for the campus community.

## 2. Problem statement

Students accumulate items they no longer need (textbooks, furniture, electronics) at the end of a semester or when they graduate, while other students need those same items at low cost. Existing options — generic marketplaces (OLX, Facebook Marketplace), WhatsApp groups, physical noticeboards — have no identity verification, no campus-specific filtering, and no structured transaction record, which creates friction and trust risk for peer-to-peer trades among students who don't know each other.

## 3. Goals

- Let a verified student list an item in under 2 minutes (photo + name + description + category + price).
- Let a buyer find and purchase an item with confidence the seller is a real, verified student at the same institution.
- Produce a reliable transaction record: payment confirmation, receipt, and pickup information, without relying on manual trust between strangers.
- Ship a working, deployed version within 3 months.

## 4. Non-goals (out of scope for this build)

- Not a general public marketplace — restricted to verified students of the target institution.
- Not shipping a native Android/iOS app in this cycle (responsive web only — see `phases.md` stretch goals).
- Not building a custom ML classifier for ID card verification or product categorization in the MVP (see §7 and `architecture.md` §2.3 for the OCR + human-review approach actually used).
- Not handling shipping/delivery — all handoffs are in-person, on campus.
- Not acting as a payment escrow/marketplace-of-record in the legal sense — see §7.3 for the realistic payment model.

## 5. Target users

- **Sellers**: students who want to sell items they no longer need (graduating students, end-of-semester book sellers, students upgrading electronics).
- **Buyers**: students looking for cheaper, campus-local alternatives to new items.
- **Admin**: a small team (project owners) reviewing flagged verifications and disputes — not a full-time moderation staff, so admin workload must stay low.

## 6. User stories

| As a... | I want to... | So that... |
|---|---|---|
| New user | sign up with my college email and PRN | prove I'm a real student before I can transact |
| New user | verify my identity by uploading my ID card | the platform can confirm I am who I say I am |
| Verified user | list an item with photos, a name, description, category, and price | other students can find and buy it |
| Buyer | browse/search/filter listings by category | find items relevant to me quickly |
| Buyer | add an item to a cart and pay through the platform | complete a purchase without exchanging personal payment details in the dark |
| Buyer | receive a receipt and pickup details after paying | know what to do next to actually get the item |
| Seller | see when my item is sold and get pickup coordination info | complete the handoff without confusion |
| Admin | review flagged verifications and approve/reject them | keep the platform to real, verified students without needing an institutional API |

## 7. Functional requirements

### 7.1 Authentication & verification
- Signup requires: name, college email, PRN, password.
- Email OTP confirms control of the college email address before the account is usable.
- ID card photo upload + typed PRN are cross-checked via OCR (Tesseract) + fuzzy match; low-confidence matches route to a manual admin review queue rather than auto-rejecting.
- Account states: `pending → verified` or `pending_review → verified/rejected`.
- Unverified accounts can browse but cannot list items or buy.

### 7.2 Listings
- Required fields: title, short description, category (fixed enum: Books / Electronics / Furniture / Stationery / Other), price, at least one photo.
- Seller can edit, delete, or mark a listing sold/reserved manually.
- Browse page supports category filter and text search.

### 7.3 Cart & payment
- Buyer adds items to a cart, proceeds to checkout.
- Payment is processed via Razorpay Checkout; **the transaction is only marked `paid` when Razorpay's webhook confirms it with a verified signature** — there is no manual "seller/admin marks payment as verified" path in the trusted flow, since that step can't actually be enforced (see `architecture.md` §2.6).
- **Realistic settlement model:** given a student project can't obtain a marketplace/Route payment-aggregator license in 3 months, Razorpay collects payment to the platform's own account for MVP; payout-to-seller reconciliation is a manual/batch process outside the app for now, or (simpler v1) the in-app payment functions as a commitment/reservation while the actual cash/UPI exchange happens at pickup. **Decision needed before Phase 3 starts** — this determines what the checkout screen actually says to the buyer.

### 7.4 Transaction completion
- On payment confirmation: product status → `sold`, buyer receives a receipt email with item details and seller-provided pickup location/time window, seller receives a sale notification.

### 7.5 Admin
- Queue of accounts flagged `pending_review` with approve/reject actions.
- Basic reported-listing/dispute view.

## 8. Non-functional requirements

- **Privacy**: ID card images stored in a private, signed-URL-only storage location, never exposed in public API responses. See `architecture.md` §5 and `rules.md` rule 2.
- **Security**: bcrypt password hashing, JWT with short-lived access tokens, rate-limited auth/OTP endpoints, verified webhook signatures on all payment callbacks.
- **Performance**: page loads usable on a typical campus wifi/mobile-data connection; images served via Cloudinary CDN, not the app server.
- **Accessibility**: visible keyboard focus states, no color-only status signals, animations respect `prefers-reduced-motion` (see `design.md` §6).
- **Cost**: entire stack runs on free/sandbox tiers (Atlas, Vercel/Render, Cloudinary, Razorpay test mode) for the build/demo phase.

## 9. Success metrics (for the 3-month build, not long-term growth)

- End-to-end flow (signup → verify → list → buy → receipt) completes without manual intervention for a normal-confidence case.
- Admin review queue handles the low-confidence/edge cases without blocking the core flow.
- Deployed, publicly reachable URL by end of Phase 5.
- At least one real test transaction completed by real test users (not just internal QA) before final demo.

## 10. Risks & open questions

| Risk | Mitigation |
|---|---|
| OCR match accuracy on poor-quality ID photos | Human-in-the-loop review queue absorbs failures — see §7.1 |
| Payment settlement/legal model unclear | Must be decided before Phase 3 (§7.3) — affects checkout copy and admin payout process |
| Scope creep toward stretch goals (chat, ratings, ML categorization) | `phases.md` explicitly blocks starting stretch goals until Phase 0–5 tasks are complete |
| Small admin team can't keep up with review queue at scale | Acceptable for campus-scale/demo use; would need real institutional verification API to scale further |

## 11. Assumptions

- The institution does not currently expose an API to verify PRNs directly — if one becomes available, §7.1 verification should shift from OCR+review to a direct lookup.
- Users primarily access the platform via mobile browser, not desktop.
- Initial launch is scoped to a single institution/campus.
