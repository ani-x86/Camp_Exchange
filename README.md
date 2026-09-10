<div align="center">

```
        .  .
       /|  |\
      ( •‿• )     
     __)⎯⎯⎯(__
    /  ₹ TAG  \
   |  campX ♡  |
    \__________/
     |   |   |
     |   |   |
```

</div>

<h1 align="center">CampusXchange (CampX)</h1>

<p align="center">
  <img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=500&size=20&duration=2500&pause=800&color=3F6B3E&center=true&vCenter=true&width=460&lines=A+campus+thrift+board%2C+not+a+storefront.;Verified+students.+Real+items.+Real+trust.;List+it.+Tag+it.+Trade+it." alt="typing banner" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/stack-MERN-3F6B3E?style=flat-square" />
  <img src="https://img.shields.io/badge/status-in%20development-E0A72E?style=flat-square" />
  <img src="https://img.shields.io/badge/scope-3--month%20build-17181A?style=flat-square" />
</p>

> The typing line above is a live animated SVG (regenerates on every view) — the closest thing a Markdown README gets to real motion without embedding a GIF. If it doesn't render on your platform, it's `readme-typing-svg`, a well-known GitHub README trick.

---

## What this is

CampX is a **campus-only marketplace** where verified students buy and sell used items — books, electronics, furniture — with each other. The trust comes from identity verification (college email + PRN + ID card review), not from being another unverified listing site. Think secondhand bookstore / notice board, digitized.

## Docs — read in this order

| Doc | What's in it |
|---|---|
| [`prd.md`](./prd.md) | Requirements, user stories, scope, risks |
| [`architecture.md`](./architecture.md) | System design, data model, request flows |
| [`design.md`](./design.md) | Visual identity, tokens, micro-interaction spec |
| [`phases.md`](./phases.md) | 12-week build plan with exit criteria |
| [`rules.md`](./rules.md) | Always-apply rules for AI coding editors working in this repo |

## Stack

**Frontend** — React + Redux Toolkit + React Router + Tailwind CSS
**Backend** — Node.js + Express (REST)
**Database** — MongoDB (Atlas)
**Verification service** — Python + FastAPI (OCR-based PRN/ID matching)
**Images** — Cloudinary
**Payments** — Razorpay
**Email** — Nodemailer / SendGrid

## Core flow

```
sign up → email OTP → ID card + PRN check → verified
                                              │
                                              ▼
                              list an item (photo, category, price)
                                              │
                                              ▼
                            buyer finds it → cart → Razorpay checkout
                                              │
                                    webhook confirms payment
                                              │
                                              ▼
                          receipt + pickup details emailed to buyer
```

## Getting started

```bash
# clone and enter the repo
git clone <repo-url>
cd campusxchange

# frontend
cd client && npm install && npm run dev

# backend
cd server && npm install && npm run dev

# verification service
cd verification-service && pip install -r requirements.txt && uvicorn main:app --reload
```

Copy `.env.example` → `.env` in `client/`, `server/`, and `verification-service/`, and fill in:
`MONGODB_URI`, `JWT_SECRET`, `CLOUDINARY_*`, `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`, `SMTP_*`.

## Folder structure

```
/client                 → React app
/server                 → Express API
/verification-service   → FastAPI OCR service
/content/gif/account-login → post-auth celebration GIFs (see prompt-signin-signup.md)
```

## Design snapshot

Bone `#F2EFE6` · Ink `#17181A` · Moss `#3F6B3E` · Marigold `#E0A72E` · Clay `#C9C2B2` · Rust `#B5482A`
General Sans (headings) · Inter (body) · IBM Plex Mono (data only — prices, PRNs, order IDs)

Full spec, including the hover/click/icon motion rules, lives in [`design.md`](./design.md).

---

<div align="center">
<sub>built by students, for students — one price tag at a time 🏷️</sub>
</div>
