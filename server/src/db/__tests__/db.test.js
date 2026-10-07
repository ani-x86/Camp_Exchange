/**
 * CampX — Database layer tests.
 * database.md §9
 *
 * Run against DATABASE_URL_TEST (must end in _test).
 * Uses Node's built-in test runner (node:test).
 *
 * Covers all 10 test groups from §9.
 */

import 'dotenv/config';
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';

// ─── Guard: never run against the production/real database ──────────────────

const TEST_DB = process.env.DATABASE_URL_TEST;
if (!TEST_DB) {
  console.error('DATABASE_URL_TEST is not set. Aborting tests.');
  process.exit(1);
}
if (!TEST_DB.includes('_test')) {
  console.error(
    'DATABASE_URL_TEST does not end in "_test". Refusing to run against non-test database.'
  );
  process.exit(1);
}

// Point the pool at the test DB
process.env.DATABASE_URL = TEST_DB;

import { getPool, connectDB, disconnectDB } from '../pool.js';
import {
  createUser, findUserById, getAuthRecordByEmail, toPublicUser,
  getPendingReviewUsers,
} from '../repositories/users.js';
import {
  createProduct, findProductById, assertSellerVerified,
} from '../repositories/products.js';
import {
  createTransaction, markTransactionPaid, findTransactionByOrderId,
} from '../repositories/transactions.js';
import {
  createOtp, findValidOtp, purgeExpiredOtps,
} from '../repositories/otps.js';
import {
  addToWishlist,
} from '../repositories/wishlists.js';
import {
  createReport,
} from '../repositories/reports.js';
import {
  CATEGORIES, CONDITIONS, PRODUCT_STATUS, VERIFICATION_STATUS,
  ROLES, PAYMENT_STATUS, OTP_PURPOSES, REPORT_STATUS, REPORT_REASONS,
} from '../constants.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PWD_HASH = await bcrypt.hash('TestPass@123', 4);

let _emailSeq = 0;
function uniqueEmail() {
  return `test_${Date.now()}_${++_emailSeq}@college.edu`;
}
let _prnSeq = 90000000;
function uniquePrn() { return String(++_prnSeq); }

async function makeUser(overrides = {}) {
  return createUser({
    name: 'Test User',
    collegeEmail: uniqueEmail(),
    passwordHash: PWD_HASH,
    prn: uniquePrn(),
    campus: 'ABC College',
    ...overrides,
  });
}

async function makeVerifiedUser(overrides = {}) {
  const u = await makeUser(overrides);
  await getPool().query(
    "UPDATE users SET verification_status = 'verified', verified_at = now() WHERE id = $1",
    [u.id]
  );
  return findUserById(u.id);
}

const GOOD_IMAGE = {
  url: 'https://res.cloudinary.com/campx-demo/image/upload/v1/campx/products/test.jpg',
  publicId: 'campx/products/test',
};

async function makeProduct(sellerId, overrides = {}) {
  return createProduct({
    sellerId,
    title: 'Test Product Title',
    description: 'A valid test description here.',
    category: 'books',
    price: 100,
    images: [GOOD_IMAGE],
    ...overrides,
  });
}

async function truncateAll() {
  await getPool().query(`
    TRUNCATE TABLE
      messages, conversations, reports, wishlists,
      refresh_tokens, transactions, products, otps, users
    RESTART IDENTITY CASCADE
  `);
}

// ─── Setup ────────────────────────────────────────────────────────────────────

before(async () => {
  await connectDB();
});

beforeEach(async () => {
  await truncateAll();
});

after(async () => {
  await disconnectDB();
});

// ─── Test 1: Duplicate college_email or prn rejected ─────────────────────────

test('duplicate college_email is rejected', async () => {
  const email = uniqueEmail();
  await makeUser({ collegeEmail: email });
  await assert.rejects(
    () => makeUser({ collegeEmail: email }),
    (err) => {
      assert.match(err.message, /already exists/i);
      return true;
    }
  );
});

test('duplicate prn is rejected', async () => {
  const prn = uniquePrn();
  await makeUser({ prn });
  await assert.rejects(
    () => makeUser({ prn }),
    (err) => {
      assert.match(err.message, /already exists/i);
      return true;
    }
  );
});

// ─── Test 2: toPublicUser never leaks password or id-card, verified boolean ───

test('toPublicUser strips passwordHash, idCardImagePublicId, adds verified boolean', () => {
  const raw = {
    id: 'abc',
    name: 'Test',
    college_email: 'x@college.edu',
    prn: '12345',
    campus: 'ABC College',
    password_hash: 'SHOULD_NOT_APPEAR',
    id_card_image_public_id: 'SHOULD_NOT_APPEAR',
    verification_status: 'verified',
    role: 'student',
    created_at: new Date(),
    updated_at: new Date(),
  };
  const pub = toPublicUser(raw);
  assert.equal(pub.passwordHash, undefined);
  assert.equal(pub.idCardImagePublicId, undefined);
  assert.equal(pub.verified, true);

  const raw2 = { ...raw, verification_status: 'pending' };
  const pub2 = toPublicUser(raw2);
  assert.equal(pub2.verified, false);
});

test('public repo queries do not return passwordHash or idCardImagePublicId', async () => {
  const u = await makeUser();
  const fetched = await findUserById(u.id);
  assert.equal(fetched.passwordHash, undefined);
  assert.equal(fetched.idCardImagePublicId, undefined);
  assert.equal(typeof fetched.verified, 'boolean');
});

// ─── Test 3: Product image validation ────────────────────────────────────────

test('product with 0 images fails', async () => {
  const seller = await makeVerifiedUser();
  await assert.rejects(
    () => makeProduct(seller.id, { images: [] }),
    (err) => { assert.match(err.message, /image/i); return true; }
  );
});

test('product with 7 images fails', async () => {
  const seller = await makeVerifiedUser();
  const imgs = Array(7).fill(GOOD_IMAGE);
  await assert.rejects(
    () => makeProduct(seller.id, { images: imgs }),
    (err) => { assert.match(err.message, /image/i); return true; }
  );
});

test('product with data: image URL fails', async () => {
  const seller = await makeVerifiedUser();
  await assert.rejects(
    () => makeProduct(seller.id, {
      images: [{ url: 'data:image/png;base64,abc', publicId: 'test' }],
    }),
    (err) => { assert.match(err.message, /cloudinary|data:/i); return true; }
  );
});

// ─── Test 4: Price validation ─────────────────────────────────────────────────

test('price 0 fails', async () => {
  const seller = await makeVerifiedUser();
  await assert.rejects(
    () => makeProduct(seller.id, { price: 0 }),
    (err) => { assert.match(err.message, /validation|price/i); return true; }
  );
});

test('price 100001 fails', async () => {
  const seller = await makeVerifiedUser();
  await assert.rejects(
    () => makeProduct(seller.id, { price: 100001 }),
    (err) => { assert.match(err.message, /validation|price/i); return true; }
  );
});

test('price 49.5 (decimal) fails via CHECK in DB', async () => {
  // Note: the DB CHECK only enforces INTEGER type via the application layer
  // The repo passes price as-is; a decimal still violates pg's integer type
  const seller = await makeVerifiedUser();
  // We test at the DB level — the CHECK price BETWEEN 1 AND 100000 only applies
  // to integers. We directly test the constraint:
  await assert.rejects(
    () => getPool().query(
      `INSERT INTO products (seller_id, title, description, category, price, images, status)
       VALUES ($1, 'Test', 'A valid description here.', 'books', 49.5, $2, 'available')`,
      [seller.id, JSON.stringify([GOOD_IMAGE])]
    ),
    // PostgreSQL will round or error depending on the type;
    // our repo converts to int, but a direct fractional insert should be caught
    () => true
  );
});

test('price 1 passes', async () => {
  const seller = await makeVerifiedUser();
  const p = await makeProduct(seller.id, { price: 1 });
  assert.equal(p.price, 1);
});

test('price 100000 passes', async () => {
  const seller = await makeVerifiedUser();
  const p = await makeProduct(seller.id, { price: 100000 });
  assert.equal(p.price, 100000);
});

// ─── Test 5: Buyer equals seller fails ───────────────────────────────────────

test('transaction where buyer equals seller is rejected by DB constraint', async () => {
  const user = await makeVerifiedUser();
  const p    = await makeProduct(user.id);

  await assert.rejects(
    () => createTransaction({
      productId: p.id,
      buyerId: user.id,
      sellerId: user.id,
      amount: 100,
      productTitle: p.title,
      productImageUrl: GOOD_IMAGE.url,
      razorpayOrderId: `order_test_${Date.now()}`,
    }),
    (err) => {
      // DB CHECK chk_transactions_buyer_ne_seller fires
      assert.match(err.message, /different|seller|buyer|constraint/i);
      return true;
    }
  );
});

// ─── Test 6: markTransactionPaid idempotency ──────────────────────────────────

test('markTransactionPaid called twice leaves one consistent result', async () => {
  const buyer  = await makeVerifiedUser();
  const seller = await makeVerifiedUser();
  const p      = await makeProduct(seller.id);

  const orderId = `order_idem_${Date.now()}`;
  const payId   = `pay_idem_${Date.now()}`;

  await createTransaction({
    productId: p.id,
    buyerId: buyer.id,
    sellerId: seller.id,
    amount: p.price,
    productTitle: p.title,
    productImageUrl: GOOD_IMAGE.url,
    razorpayOrderId: orderId,
  });

  const r1 = await markTransactionPaid(orderId, payId);
  const r2 = await markTransactionPaid(orderId, payId); // second call — idempotent

  assert.equal(r1.transaction.paymentStatus, 'paid');
  assert.equal(r2.transaction.paymentStatus, 'paid');

  // Product must be 'sold' with soldAt set
  const updated = await findProductById(p.id);
  assert.equal(updated.status, 'sold');
  assert.ok(updated.soldAt);
});

test('second paid transaction for the same product fails', async () => {
  const buyer  = await makeVerifiedUser();
  const buyer2 = await makeVerifiedUser();
  const seller = await makeVerifiedUser();
  const p      = await makeProduct(seller.id);

  const orderId1 = `order_conflict_1_${Date.now()}`;
  const orderId2 = `order_conflict_2_${Date.now()}`;

  await createTransaction({ productId: p.id, buyerId: buyer.id, sellerId: seller.id, amount: p.price, productTitle: p.title, productImageUrl: GOOD_IMAGE.url, razorpayOrderId: orderId1 });
  await createTransaction({ productId: p.id, buyerId: buyer2.id, sellerId: seller.id, amount: p.price, productTitle: p.title, productImageUrl: GOOD_IMAGE.url, razorpayOrderId: orderId2 });

  await markTransactionPaid(orderId1, `pay_c1_${Date.now()}`);

  await assert.rejects(
    () => markTransactionPaid(orderId2, `pay_c2_${Date.now()}`),
    (err) => { assert.match(err.message, /paid|conflict/i); return true; }
  );
});

// ─── Test 7: Illegal status move rejected by DB trigger ──────────────────────

test('paid → created status transition is rejected by DB trigger', async () => {
  const buyer  = await makeVerifiedUser();
  const seller = await makeVerifiedUser();
  const p      = await makeProduct(seller.id);
  const orderId = `order_trigger_${Date.now()}`;

  await createTransaction({ productId: p.id, buyerId: buyer.id, sellerId: seller.id, amount: p.price, productTitle: p.title, productImageUrl: GOOD_IMAGE.url, razorpayOrderId: orderId });
  const tx = await findTransactionByOrderId(orderId);
  await markTransactionPaid(orderId, `pay_trigger_${Date.now()}`);

  await assert.rejects(
    () => getPool().query(
      "UPDATE transactions SET payment_status = 'created' WHERE id = $1",
      [tx.id]
    ),
    (err) => {
      assert.match(err.message, /illegal|transition|created/i);
      return true;
    }
  );
});

// ─── Test 8: Duplicate wishlist and report entries rejected ───────────────────

test('duplicate wishlist entry is rejected', async () => {
  const user = await makeVerifiedUser();
  const seller = await makeVerifiedUser();
  const p = await makeProduct(seller.id);

  await addToWishlist(user.id, p.id);
  // ON CONFLICT DO NOTHING — should not throw
  await assert.doesNotReject(() => addToWishlist(user.id, p.id));

  // Direct INSERT (bypassing ON CONFLICT) should fail with unique violation
  await assert.rejects(
    () => getPool().query(
      'INSERT INTO wishlists (user_id, product_id) VALUES ($1,$2)',
      [user.id, p.id]
    ),
    (err) => { assert.equal(err.code, '23505'); return true; }
  );
});

test('duplicate report entry is rejected', async () => {
  const reporter = await makeVerifiedUser();
  const seller   = await makeVerifiedUser();
  const p        = await makeProduct(seller.id);

  await createReport({ reporterId: reporter.id, productId: p.id, reason: 'spam' });

  await assert.rejects(
    () => createReport({ reporterId: reporter.id, productId: p.id, reason: 'misleading' }),
    (err) => { assert.match(err.message, /already reported/i); return true; }
  );
});

// ─── Test 9: Expired OTP ignored and purged ───────────────────────────────────

test('expired OTP is ignored by findValidOtp', async () => {
  const email = uniqueEmail();
  // Insert with past expiry directly into DB
  await getPool().query(
    `INSERT INTO otps (email, code_hash, purpose, expires_at)
     VALUES ($1, $2, 'signup', now() - interval '1 minute')`,
    [email, 'hash']
  );

  const found = await findValidOtp(email, 'signup');
  assert.equal(found, null);
});

test('purgeExpiredOtps removes expired rows', async () => {
  const email = uniqueEmail();
  await getPool().query(
    `INSERT INTO otps (email, code_hash, purpose, expires_at)
     VALUES ($1, $2, 'signup', now() - interval '5 minutes')`,
    [email, 'hash']
  );

  const before = (await getPool().query(
    'SELECT COUNT(*)::int AS n FROM otps WHERE email = $1', [email]
  )).rows[0].n;
  assert.equal(before, 1);

  await purgeExpiredOtps();

  const after = (await getPool().query(
    'SELECT COUNT(*)::int AS n FROM otps WHERE email = $1', [email]
  )).rows[0].n;
  assert.equal(after, 0);
});

// ─── Test 10: CHECK constraint parity with constants.js ──────────────────────

test('DB CHECK constraints match constants.js enum arrays', async () => {
  // Read the CHECK definitions from pg_constraint
  const { rows } = await getPool().query(`
    SELECT conname, pg_get_constraintdef(oid) AS def
    FROM pg_constraint
    WHERE contype = 'c'
      AND conrelid::regclass::text IN
        ('users','products','transactions','otps','reports')
    ORDER BY conname
  `);

  const defs = Object.fromEntries(rows.map((r) => [r.conname, r.def]));

  // Helper: extract IN (...) values from a CHECK def string
  function extractValues(def) {
    const match = def.match(/IN \(([^)]+)\)/i);
    if (!match) return null;
    return match[1]
      .split(',')
      .map((s) => s.trim().replace(/^'|'$/g, ''));
  }

  // Spot-check key constraints
  const catDef = defs['chk_products_category'];
  assert.ok(catDef, 'chk_products_category CHECK constraint must exist');
  const catValues = extractValues(catDef);
  assert.deepEqual(
    catValues?.sort(),
    [...CATEGORIES].sort(),
    'DB category CHECK must match CATEGORIES constant'
  );

  const statusDef = defs['chk_products_status'];
  assert.ok(statusDef);
  assert.deepEqual(extractValues(statusDef)?.sort(), [...PRODUCT_STATUS].sort());

  const vstDef = defs['chk_users_verification_status'];
  assert.ok(vstDef);
  assert.deepEqual(extractValues(vstDef)?.sort(), [...VERIFICATION_STATUS].sort());

  const roleDef = defs['chk_users_role'];
  assert.ok(roleDef);
  assert.deepEqual(extractValues(roleDef)?.sort(), [...ROLES].sort());

  const payDef = defs['chk_transactions_payment_status'];
  assert.ok(payDef);
  assert.deepEqual(extractValues(payDef)?.sort(), [...PAYMENT_STATUS].sort());

  const purposeDef = defs['chk_otps_purpose'];
  assert.ok(purposeDef);
  assert.deepEqual(extractValues(purposeDef)?.sort(), [...OTP_PURPOSES].sort());

  const reasonDef = defs['chk_reports_reason'];
  assert.ok(reasonDef);
  assert.deepEqual(extractValues(reasonDef)?.sort(), [...REPORT_REASONS].sort());

  const reportStatusDef = defs['chk_reports_status'];
  assert.ok(reportStatusDef);
  assert.deepEqual(extractValues(reportStatusDef)?.sort(), [...REPORT_STATUS].sort());
});
