# CampusXchange (CampX) — System Architecture

## 1. Overview

CampX is a campus-only marketplace where verified students list used items (books, electronics, furniture) and other students buy them. The system has four main concerns: **identity verification**, **listings**, **payments**, and **notifications**. Each is built as a distinct module so it can be developed, tested, and deployed independently.

```
                         ┌─────────────────────┐
                         │   React Frontend     │
                         │ (Vercel/Netlify)     │
                         └──────────┬───────────┘
                                    │ HTTPS/REST (JWT auth)
                                    ▼
                         ┌─────────────────────┐
                         │  Node/Express API    │
                         │  (Render/Railway)    │
                         └───┬─────────┬────────┘
              ┌──────────────┘         └───────────────┐
              ▼                                          ▼
   ┌─────────────────────┐                   ┌─────────────────────┐
   │ Python/FastAPI       │                   │  Razorpay             │
   │ OCR/Verification svc │                   │  Payment Gateway       │
   └──────────┬───────────┘                   └──────────┬─────────┘
              │                                            │ webhook
              ▼                                            ▼
   ┌─────────────────────┐                   ┌─────────────────────┐
   │  MongoDB Atlas        │◄──────────────────┤  Express Webhook      │
   │  (Users, Products,    │                   │  Handler                │
   │   Transactions, OTPs) │                   └─────────────────────┘
   └──────────┬───────────┘
              │
              ▼
   ┌─────────────────────┐        ┌─────────────────────┐
   │  Cloudinary           │        │  Nodemailer/SendGrid  │
   │  (product & ID images)│        │  (OTP, receipts, alerts)│
   └─────────────────────┘        └─────────────────────┘
```

## 2. Components

### 2.1 Frontend — React + Redux Toolkit
- **Pages**: Signup/Login, Verification status, Browse/Search, Product detail, Create listing, Cart, Checkout, Order history, Seller dashboard, Admin dashboard.
- **State**: Redux Toolkit slices — `authSlice`, `productSlice`, `cartSlice`, `transactionSlice`. RTK Query for data fetching/caching so components don't hand-roll loading/error state.
- **Routing**: React Router, with a `ProtectedRoute` wrapper that checks JWT + verification status (unverified users can browse but not list/buy).
- **Styling**: Tailwind CSS, mobile-first (most students will use this on a phone browser).

### 2.2 Backend API — Node/Express
Organized by resource, each with its own router/controller/model:
- `/api/auth` — signup, login, OTP verification, refresh token
- `/api/verification` — ID card upload, PRN check, admin review actions
- `/api/products` — CRUD for listings, search/filter
- `/api/cart` — cart operations (or handled client-side only, synced at checkout)
- `/api/transactions` — checkout, payment webhook receiver, receipt trigger
- `/api/admin` — verification queue, dispute/report review

**Auth**: JWT access token (short-lived, ~15 min) + refresh token (httpOnly cookie, ~7 days). Passwords hashed with bcrypt. Middleware checks token + `verificationStatus === 'verified'` on routes that require it (listing, buying).

### 2.3 Verification microservice — Python/FastAPI
Kept as a **separate service** from the main Express API, not bolted on, because:
- OCR (Tesseract/pytesseract) and any future ML work lives naturally in Python.
- It can be scaled, redeployed, or swapped out independently of the main API.
- Express calls it over an internal HTTP endpoint (e.g. `POST /verify-id`) with the image URL and the student-entered PRN, and gets back a match confidence score + extracted text.
- If confidence is below a threshold, Express flags the account `pending_review` instead of `verified` and it lands in the admin queue.

### 2.4 Database — MongoDB Atlas
See §3 for schema detail. Free-tier Atlas cluster is sufficient for a campus-scale project (hundreds to low thousands of users).

### 2.5 Image storage — Cloudinary
- Product photos: uploaded directly from the browser via a signed upload preset, public URLs stored on the `Product` document.
- ID card photos: uploaded to a **separate, private** Cloudinary folder (authenticated delivery / signed URLs only), never exposed to the frontend product feed. Referenced only by the verification service and admin dashboard.

### 2.6 Payments — Razorpay
- Frontend triggers Razorpay Checkout at payment time.
- Razorpay sends a webhook to `POST /api/transactions/webhook` on payment success/failure.
- Express verifies the webhook signature (Razorpay secret), then updates the `Transaction` document — this is the **only** thing that marks a transaction as paid; there is no manual "seller confirms" step in the trusted path.
- Once marked paid, a queued job (or direct call) triggers the receipt/thank-you email.

### 2.7 Notifications — Nodemailer / SendGrid
Three email flows, each its own template:
- Signup OTP
- Verification status update (approved/rejected/needs review)
- Purchase receipt + seller pickup details + thank-you note

## 3. Data model

```
User
 ├─ _id
 ├─ name
 ├─ collegeEmail (unique)
 ├─ passwordHash
 ├─ prn
 ├─ idCardImageUrl (private)
 ├─ verificationStatus: pending | verified | rejected
 ├─ role: student | admin
 └─ createdAt

Product
 ├─ _id
 ├─ sellerId → User
 ├─ title
 ├─ description
 ├─ category: books | electronics | furniture | stationery | other
 ├─ price
 ├─ images: [url]
 ├─ status: available | reserved | sold
 └─ createdAt

Transaction
 ├─ _id
 ├─ productId → Product
 ├─ buyerId → User
 ├─ sellerId → User
 ├─ amount
 ├─ paymentStatus: created | paid | failed
 ├─ razorpayOrderId / razorpayPaymentId
 ├─ pickupDetails: { location, timeWindow }
 └─ createdAt

OTP
 ├─ _id
 ├─ email
 ├─ code
 ├─ purpose: signup | reset
 ├─ expiresAt
 └─ createdAt
```

## 4. Request flow examples

**Signup & verification**
1. Student submits name, PRN, college email, password → `POST /api/auth/signup` → OTP emailed.
2. Student enters OTP → `POST /api/auth/verify-otp` → account created, `verificationStatus: pending`.
3. Student uploads ID card photo → `POST /api/verification/upload` → Express forwards image + PRN to FastAPI service.
4. FastAPI returns match result → Express sets `verified` or `pending_review`.
5. If `pending_review`, appears in admin dashboard for manual approve/reject.

**Listing an item**
1. Verified user submits title, description, category, price, photos → images go to Cloudinary from the browser → `POST /api/products` with the returned URLs.

**Purchase**
1. Buyer adds to cart (client-side) → checkout → `POST /api/transactions` creates a `Transaction` with `paymentStatus: created` and a Razorpay order.
2. Razorpay Checkout opens client-side, buyer pays.
3. Razorpay webhook hits `POST /api/transactions/webhook` → signature verified → `paymentStatus: paid` → product `status: sold`.
4. Receipt + pickup-info email sent to buyer; notification sent to seller.

## 5. Security notes
- ID card images: private Cloudinary folder, signed/expiring URLs only, never served to the general product feed. Consider auto-deletion after verification is finalized.
- Passwords: bcrypt, never logged.
- JWT secrets, Razorpay keys, email credentials: environment variables, never committed.
- Webhook endpoint: verify Razorpay's signature header on every call — this is the only integrity check standing between "payment happened" and someone forging a request.
- Rate-limit OTP requests and login attempts (e.g. `express-rate-limit`) to prevent abuse.

## 6. Deployment
- Frontend → Vercel or Netlify (static build, env var for API base URL).
- Express API → Render or Railway free tier.
- FastAPI verification service → Render free tier (separate service).
- MongoDB → Atlas free-tier cluster.
- Cloudinary, Razorpay, SendGrid/Gmail SMTP → free/sandbox tiers for development, upgrade only if the project goes beyond a class demo.
