# CampX — MongoDB Database Build Prompt

> Paste or attach this file in **Antigravity IDE** to build the CampX database layer.
> Read `prd.md`, `architecture.md` and `listing.md` first. If anything here conflicts with them, stop and list the conflict instead of guessing.

---

## 1. Your Task

You are a senior backend engineer. Build the complete **MongoDB data layer** for CampX, a campus-only marketplace where verified students buy and sell used items.

Deliver:

1. Mongoose models for every collection in section 4.
2. All indexes in section 5 (declared on the schemas).
3. A shared constants module (categories, statuses, limits) used by both schemas and validators.
4. A database connection module with sensible production settings.
5. A seed script that creates realistic demo data.
6. A short `README` section explaining setup and how to run the seed.
7. Basic tests for the riskiest rules (listed in section 9).

Do **not** build routes, controllers, auth logic, payment calls or frontend code. This task is the database layer only. Design the models so those can be added without schema changes.

---

## 2. Tech Stack and Constraints

- Database: **MongoDB Atlas** (free tier), accessed through **Mongoose 8**.
- Runtime: Node 20, Express backend (`/server` folder). Use TypeScript if the backend repo already uses it, otherwise modern JavaScript with ES modules.
- Config through environment variables only. Never hardcode URIs or secrets. Provide `.env.example`.
- No new dependencies beyond: `mongoose`, `dotenv`, `bcrypt` (seed only), and the repo's existing test runner.
- Free-tier friendly: avoid unbounded arrays, avoid large documents, keep indexes to those listed.

Suggested layout:

```text
server/src/db/
  connect.ts
  constants.ts
  models/
    User.ts
    Product.ts
    Transaction.ts
    Otp.ts
    Wishlist.ts
    Report.ts
    RefreshToken.ts
  seed/
    seed.ts
    data.ts
  __tests__/
    models.test.ts
```

---

## 3. Shared Constants (single source of truth)

Define once in `constants.ts`, import everywhere. Never retype these strings in schemas.

```ts
CATEGORIES = ['books','electronics','lab-equipment','stationery','furniture','clothing','sports','other']
CONDITIONS = ['new','like-new','good','fair']
PRODUCT_STATUS = ['available','reserved','sold']
VERIFICATION_STATUS = ['pending','pending_review','verified','rejected']
ROLES = ['student','admin']
PAYMENT_STATUS = ['created','paid','failed']
OTP_PURPOSES = ['signup','reset']
REPORT_STATUS = ['open','reviewed','dismissed','actioned']

LIMITS = {
  TITLE: [3, 80],
  DESCRIPTION: [10, 500],
  PRICE: [1, 100000],        // whole rupees
  BIO_MAX: 300,
  MAX_IMAGES: 6,
  OTP_TTL_MINUTES: 10,
}
```

> **Known discrepancy:** `prd.md` and `architecture.md` list five categories (books, electronics, furniture, stationery, other). The frontend specs (`listing.md`, search filters) use eight. Use the eight above, stored as lowercase slugs, and keep the list only in `constants.ts` so it is trivial to trim. Also, `listing.md` mock data uses status `active`; in the database that maps to `available`.

---

## 4. Collections

For every schema: `timestamps: true`, `strict: true`, explicit types, `required` and `trim` where relevant, and clear validation error messages. Use `versionKey: false` unless needed.

### 4.1 `users`

| Field | Type | Rules |
|---|---|---|
| `name` | String | required, trim, 2 to 80 chars |
| `collegeEmail` | String | required, **unique**, lowercase, trim, must match the college domain pattern (configurable via env `COLLEGE_EMAIL_DOMAIN`) |
| `passwordHash` | String | required, `select: false` |
| `prn` | String | required, **unique**, trim, digits only |
| `mobileNumber` | String | optional, normalized E.164-style (e.g. `+919876543210`) |
| `department` | String | optional (profile page: Branch / Department) |
| `academicYear` | String | optional (e.g. `3rd Year (Sem 5)`) |
| `campusAddress` | String | optional (e.g. `Hostel Block B, Room 314`) |
| `campus` | String | required, default from env `CAMPUS_NAME` (e.g. `ABC College`) |
| `bio` | String | optional, max 300 chars |
| `avatarUrl` | String | optional, Cloudinary URL |
| `idCardImagePublicId` | String | optional, `select: false`. Store the **Cloudinary public ID of the private asset**, not a public URL |
| `verificationStatus` | String | enum `VERIFICATION_STATUS`, default `pending` |
| `verificationConfidence` | Number | optional, 0 to 1, OCR match score |
| `verifiedAt` | Date | optional |
| `role` | String | enum `ROLES`, default `student` |
| `createdAt` / `updatedAt` | Date | automatic |

Rules:

- Add a `toJSON` transform that **always strips** `passwordHash`, `idCardImagePublicId` and `__v`.
- Add a virtual `verified` (boolean) = `verificationStatus === 'verified'`. This is what the profile page and Add Item page read.
- Fields the student must **not** be able to change themselves (name, prn, department, academicYear, campusAddress, verificationStatus, role) should be listed in an exported `LOCKED_USER_FIELDS` array so the future profile-update route can whitelist editable fields (`collegeEmail`, `mobileNumber`, `bio`, `avatarUrl`).

### 4.2 `products`

| Field | Type | Rules |
|---|---|---|
| `sellerId` | ObjectId → User | required, indexed |
| `title` | String | required, trim, 3 to 80 |
| `description` | String | required, trim, 10 to 500 |
| `category` | String | required, enum `CATEGORIES` |
| `condition` | String | optional, enum `CONDITIONS` |
| `price` | Number | required, integer, 1 to 100000 |
| `images` | Array of `{ url, publicId }` | required, 1 to 6 items. **First item is the primary image.** Validate the length in a schema validator |
| `status` | String | enum `PRODUCT_STATUS`, default `available` |
| `reservedFor` | ObjectId → User | optional, set only while `status = reserved` |
| `pickup` | `{ location, timeWindow }` | optional, strings, set by seller |
| `viewCount` | Number | default 0, min 0 |
| `soldAt` | Date | optional |
| `createdAt` / `updatedAt` | Date | automatic |

Rules:

- Images accept only Cloudinary URLs (validate with a URL pattern from env `CLOUDINARY_CLOUD_NAME`). Reject `data:` URLs. (`listing.md` mock data uses data URLs; the real database must not.)
- Add a pre-save check that `sellerId` refers to a **verified** user, or leave this to the service layer but export a helper `assertSellerVerified(userId)`.
- Do not store seller name or verified status on the product. Populate it from `users` at read time, so it never goes stale.

### 4.3 `transactions`

| Field | Type | Rules |
|---|---|---|
| `productId` | ObjectId → Product | required |
| `buyerId` | ObjectId → User | required |
| `sellerId` | ObjectId → User | required |
| `amount` | Number | required, integer, copied from the product price at checkout (**snapshot**, never recomputed) |
| `productSnapshot` | `{ title, imageUrl }` | required, so receipts survive product edits or deletion |
| `paymentStatus` | String | enum `PAYMENT_STATUS`, default `created` |
| `razorpayOrderId` | String | required, **unique** |
| `razorpayPaymentId` | String | optional, **unique sparse** |
| `paidAt` | Date | optional |
| `pickupDetails` | `{ location, timeWindow }` | optional |
| `receiptSentAt` | Date | optional |
| `createdAt` / `updatedAt` | Date | automatic |

Rules:

- `buyerId` must not equal `sellerId` (schema validator).
- `paymentStatus` may only move `created → paid` or `created → failed`. Export a `markTransactionPaid(orderId, paymentId)` static that is **idempotent** (calling it twice with the same webhook must not double-apply or error). This is the only code path allowed to set `paid`.
- A paid transaction must also set the product to `sold` and `soldAt`. Do this in a **MongoDB transaction/session** so both succeed or both fail. (Atlas free tier supports this on replica sets.)

### 4.4 `otps`

| Field | Type | Rules |
|---|---|---|
| `email` | String | required, lowercase, indexed |
| `codeHash` | String | required. **Store a hash of the OTP, never the plain code** |
| `purpose` | String | enum `OTP_PURPOSES` |
| `attempts` | Number | default 0, max 5 |
| `expiresAt` | Date | required |
| `createdAt` | Date | automatic |

- TTL index on `expiresAt` with `expireAfterSeconds: 0` so expired codes delete themselves.

### 4.5 `wishlists`

The existing frontend has a wishlist context, so persist it.

| Field | Type | Rules |
|---|---|---|
| `userId` | ObjectId → User | required |
| `productId` | ObjectId → Product | required |
| `createdAt` | Date | automatic |

- One document per saved item (not an array on the user), with a **unique compound index** on `(userId, productId)`.

### 4.6 `reports`

Supports the admin "reported listing / dispute" view in the PRD.

| Field | Type | Rules |
|---|---|---|
| `reporterId` | ObjectId → User | required |
| `productId` | ObjectId → Product | required |
| `reason` | String | enum: `spam`, `prohibited-item`, `misleading`, `harassment`, `other` |
| `details` | String | optional, max 300 chars |
| `status` | String | enum `REPORT_STATUS`, default `open` |
| `reviewedBy` | ObjectId → User | optional (admin) |
| `reviewedAt` | Date | optional |

- Unique compound index on `(reporterId, productId)` to stop duplicate reports.

### 4.7 `refreshtokens`

Supports the 7 day httpOnly refresh cookie in `architecture.md`.

| Field | Type | Rules |
|---|---|---|
| `userId` | ObjectId → User | required, indexed |
| `tokenHash` | String | required, **unique**. Store only a hash |
| `expiresAt` | Date | required |
| `revokedAt` | Date | optional |

- TTL index on `expiresAt`.

### Cart

The architecture says the cart is **client-side until checkout**. Do **not** create a cart collection. Checkout will read product IDs from the request and re-validate them against `products`.

---

## 5. Indexes

Declare on the schemas (not in a separate script). Add a one-line comment above each saying which query it serves.

| Collection | Index | Purpose |
|---|---|---|
| users | `{ collegeEmail: 1 }` unique | login, duplicate signup |
| users | `{ prn: 1 }` unique | duplicate registration number |
| users | `{ verificationStatus: 1, createdAt: 1 }` | admin review queue |
| products | `{ title: 'text', description: 'text' }` with weights (title 10, description 2) | search bar |
| products | `{ status: 1, category: 1, price: 1 }` | browse with category and price filters |
| products | `{ status: 1, createdAt: -1 }` | newest first feed, dashboard featured |
| products | `{ sellerId: 1, createdAt: -1 }` | seller dashboard, My Listings |
| transactions | `{ razorpayOrderId: 1 }` unique | webhook lookup |
| transactions | `{ razorpayPaymentId: 1 }` unique sparse | duplicate webhook protection |
| transactions | `{ buyerId: 1, createdAt: -1 }` | order history |
| transactions | `{ sellerId: 1, createdAt: -1 }` | seller sales |
| otps | `{ expiresAt: 1 }` TTL | auto cleanup |
| otps | `{ email: 1, purpose: 1, createdAt: -1 }` | latest OTP lookup |
| wishlists | `{ userId: 1, productId: 1 }` unique | no duplicates |
| reports | `{ status: 1, createdAt: 1 }` | admin queue |
| reports | `{ reporterId: 1, productId: 1 }` unique | no duplicate reports |
| refreshtokens | `{ expiresAt: 1 }` TTL, `{ tokenHash: 1 }` unique | cleanup, lookup |

Set `autoIndex` to `true` in development and `false` in production, and export a `syncAllIndexes()` function for deployments.

---

## 6. Connection Module

`connect.ts` must:

- Read `MONGODB_URI` and `MONGODB_DB_NAME` from env; throw a clear error if missing.
- Use `serverSelectionTimeoutMS: 5000`, `maxPoolSize: 10`.
- Log connect, disconnect and error events (no credentials in logs).
- Export `connectDB()` and `disconnectDB()`.
- Handle `SIGINT` / `SIGTERM` by closing the connection cleanly.
- Be safe to call twice (return the existing connection).

`.env.example`:

```text
MONGODB_URI=
MONGODB_DB_NAME=campx
COLLEGE_EMAIL_DOMAIN=college.edu
CAMPUS_NAME=ABC College
CLOUDINARY_CLOUD_NAME=
```

---

## 7. Seed Script

`npm run seed` should:

- Refuse to run when `NODE_ENV === 'production'`.
- Accept a `--reset` flag to drop the seeded collections first (ask nothing, but print what was dropped).
- Create:
  - 1 admin user.
  - 8 students, including **Aarav Sharma** (PRN `12210456`, Computer Engineering, `3rd Year (Sem 5)`, `Hostel Block B, Room 314`, verified), plus at least one `pending`, one `pending_review` and one `rejected` user to exercise every state.
  - 24 products spread across all 8 categories and all 3 statuses, with prices from 50 to 5000, realistic campus titles (textbooks, calculators, lab coats, desk lamps, study tables), 1 to 4 placeholder Cloudinary-style image URLs each.
  - 3 transactions (one `paid`, one `created`, one `failed`) with matching product states.
  - A few wishlist entries and 2 reports.
- Hash all seed passwords with bcrypt. Use one documented demo password, printed to the console.
- Be idempotent when run without `--reset` (skip existing records by email or PRN, do not duplicate).
- Print a summary of counts per collection.

---

## 8. Quality Rules

- No unbounded arrays. No sensitive data in `toJSON`.
- Every enum comes from `constants.ts`.
- Money is stored as an integer in whole rupees.
- Use `Schema.Types.ObjectId` refs consistently and add `lean()`-friendly field names.
- Use clear, human-readable validation messages (they will surface in the UI).
- Comment **why** for non-obvious decisions (snapshots, hashing, idempotency), not what.
- Keep each model file under about 150 lines.

---

## 9. Tests

Write tests for at least:

1. A duplicate `collegeEmail` or `prn` is rejected.
2. `passwordHash` and `idCardImagePublicId` never appear in `toJSON()`.
3. A product with 0 images, 7 images, or a `data:` image URL fails validation.
4. Price `0`, `100001`, `49.5` fail; `1` and `100000` pass.
5. A transaction where buyer equals seller fails.
6. `markTransactionPaid` called twice with the same payment ID leaves one consistent result.
7. A duplicate wishlist entry and a duplicate report are rejected.
8. An OTP with a past `expiresAt` is picked up by the TTL index definition (assert the index exists with `expireAfterSeconds: 0`).

Use `mongodb-memory-server` only if it is already in the repo; otherwise test against a local or Atlas test database named `campx_test`, never the real one.

---

## 10. Acceptance Criteria

- [ ] All 7 models exist and compile, and the app connects to Atlas with the provided URI.
- [ ] `constants.ts` is the only place enums and limits are defined.
- [ ] All indexes in section 5 exist after `syncAllIndexes()`.
- [ ] `users` JSON output never includes password hashes or ID card references, and exposes a `verified` boolean.
- [ ] Products enforce 1 to 6 Cloudinary images, integer price 1 to 100000, and the 8 category slugs.
- [ ] Marking a transaction paid is idempotent and updates the product to `sold` atomically.
- [ ] OTPs and refresh tokens are stored hashed and expire automatically.
- [ ] `npm run seed` produces a working demo dataset including Aarav Sharma, every verification state, and every product status.
- [ ] No secrets in the repo; `.env.example` is present.
- [ ] Tests from section 9 pass.

---

## 11. When Something Is Unclear

Do not invent business rules. If you hit a question the docs do not answer (for example the payment settlement model that `prd.md` §7.3 marks as undecided), pick the simplest option, write it as a `TODO(decision):` comment on the relevant field, and list all such TODOs at the end of your reply.
