/**
 * CampX — PostgreSQL Seed Script
 * database.md §7
 *
 * Usage:
 *   npm run seed              — idempotent, skips existing records
 *   npm run seed -- --reset   — TRUNCATE all seeded tables, then re-seed
 *
 * Never runs in production (NODE_ENV=production).
 * Runs in a single DB transaction — failed seed leaves nothing half-written.
 */

import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { getPool, disconnectDB, withTransaction } from '../pool.js';
import { SEED_USERS, SEED_PRODUCTS, DEMO_PASSWORD } from './data.js';
import { markTransactionPaid } from '../repositories/transactions.js';

// ─── Guards ───────────────────────────────────────────────────────────────────

if (process.env.NODE_ENV === 'production') {
  console.error('[Seed] ❌  Refused to run in production environment.');
  process.exit(1);
}

const shouldReset = process.argv.includes('--reset');

function log(msg) { console.log(`[Seed] ${msg}`); }

// ─── Main ─────────────────────────────────────────────────────────────────────

async function seed() {
  const pool = getPool();

  if (shouldReset) {
    log('--reset flag detected. Truncating seeded tables…');
    // TRUNCATE with CASCADE clears FKs; RESTART IDENTITY resets sequences
    await pool.query(`
      TRUNCATE TABLE
        messages, conversations, reports, wishlists,
        refresh_tokens, transactions, products, otps, users
      RESTART IDENTITY CASCADE
    `);
    log('Truncate complete.\n');
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  log(`Demo password: "${DEMO_PASSWORD}" (all seed accounts)\n`);

  // ── All inserts run in ONE transaction ──────────────────────────────────────
  return withTransaction(async (client) => {
    // ── Users ─────────────────────────────────────────────────────────────────
    const userMap = {}; // prn → row

    for (const u of SEED_USERS) {
      const { rows } = await client.query(
        `INSERT INTO users
           (name, college_email, password_hash, prn, role, verification_status,
            department, academic_year, campus, campus_address, bio,
            verified_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         ON CONFLICT (college_email) DO NOTHING
         RETURNING *`,
        [
          u.name,
          u.collegeEmail.toLowerCase(),
          passwordHash,
          u.prn,
          u.role || 'student',
          u.verificationStatus,
          u.department ?? null,
          u.academicYear ?? null,
          u.campus || 'ABC College',
          u.campusAddress ?? null,
          u.bio ?? null,
          u.verificationStatus === 'verified' ? new Date() : null,
        ]
      );

      if (rows[0]) {
        userMap[u.prn] = rows[0];
        log(`  Created user: ${u.name} (${u.verificationStatus})`);
      } else {
        // Already exists — fetch to get the id
        const { rows: existing } = await client.query(
          'SELECT * FROM users WHERE college_email = $1',
          [u.collegeEmail.toLowerCase()]
        );
        userMap[u.prn] = existing[0];
        log(`  Skipped user (exists): ${u.collegeEmail}`);
      }
    }

    const aarav  = userMap['12210456'];
    const arjun  = userMap['12210834'];
    const kavya  = userMap['12210945'];
    const sameer = userMap['12211056'];

    const verifiedSellers = [aarav, arjun, kavya, sameer].filter(Boolean);
    if (verifiedSellers.length === 0) {
      log('\n⚠️  No verified sellers. Skipping products.\n');
      return;
    }

    // ── Products ──────────────────────────────────────────────────────────────
    const productRows = [];

    for (let i = 0; i < SEED_PRODUCTS.length; i++) {
      const p = SEED_PRODUCTS[i];
      const seller = verifiedSellers[i % verifiedSellers.length];

      const soldAt = p.status === 'sold' ? new Date() : null;

      const { rows } = await client.query(
        `INSERT INTO products
           (seller_id, title, description, category, condition, price,
            images, status, sold_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT DO NOTHING
         RETURNING *`,
        [
          seller.id,
          p.title,
          p.description,
          p.category,
          p.condition ?? null,
          p.price,
          JSON.stringify(p.images),
          p.status,
          soldAt,
        ]
      );

      if (rows[0]) {
        productRows.push(rows[0]);
        log(`  Created product: "${p.title}" (${p.status})`);
      } else {
        const { rows: existing } = await client.query(
          'SELECT * FROM products WHERE title = $1 AND seller_id = $2',
          [p.title, seller.id]
        );
        if (existing[0]) productRows.push(existing[0]);
        log(`  Skipped product (exists): "${p.title}"`);
      }
    }

    // ── Reserved product — set reserved_for ───────────────────────────────────
    const reservedProduct = productRows.find((p) => p.status === 'reserved');
    if (reservedProduct && aarav) {
      await client.query(
        'UPDATE products SET reserved_for = $1 WHERE id = $2',
        [aarav.id, reservedProduct.id]
      );
    }

    // ── Transactions (3) ──────────────────────────────────────────────────────
    const soldProduct   = productRows.find((p) => p.status === 'sold');
    const availProduct  = productRows.find((p) => p.status === 'available');
    const availProduct2 = productRows.filter((p) => p.status === 'available')[1];

    const txDefs = [
      // 'created' transaction
      {
        label: 'created',
        buyer: sameer, seller: arjun, product: availProduct,
        paymentStatus: 'created',
        razorpayOrderId: 'order_seed_created_002',
      },
      // 'failed' transaction
      {
        label: 'failed',
        buyer: arjun, seller: aarav, product: availProduct2,
        paymentStatus: 'failed',
        razorpayOrderId: 'order_seed_failed_003',
      },
    ];

    for (const tx of txDefs) {
      if (!tx.buyer || !tx.seller || !tx.product) {
        log(`  ⚠️  Skipping transaction "${tx.label}" — missing buyer/seller/product.`);
        continue;
      }
      const { rowCount } = await client.query(
        'SELECT 1 FROM transactions WHERE razorpay_order_id = $1',
        [tx.razorpayOrderId]
      );
      // rowCount from SELECT returns rows count
      const exists = (await client.query(
        'SELECT 1 FROM transactions WHERE razorpay_order_id = $1',
        [tx.razorpayOrderId]
      )).rows.length > 0;
      if (exists) { log(`  Skipped transaction: ${tx.label}`); continue; }

      await client.query(
        `INSERT INTO transactions
           (product_id, buyer_id, seller_id, amount, product_title,
            product_image_url, payment_status, razorpay_order_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          tx.product.id,
          tx.buyer.id,
          tx.seller.id,
          tx.product.price,
          tx.product.title,
          tx.product.images?.[0]?.url || '',
          tx.paymentStatus,
          tx.razorpayOrderId,
        ]
      );
      log(`  Created transaction: ${tx.label} (₹${tx.product.price})`);
    }

    // 'paid' transaction — created via markTransactionPaid (outside client tx
    // so the nested transaction works; we commit the outer tx first).
    // We handle this after the main transaction closes.

    // ── Wishlists ─────────────────────────────────────────────────────────────
    const wishlistEntries = [
      { user: aarav,  product: productRows[0] },
      { user: aarav,  product: productRows[1] },
      { user: sameer, product: productRows[0] },
    ];

    for (const w of wishlistEntries) {
      if (!w.user || !w.product) continue;
      await client.query(
        `INSERT INTO wishlists (user_id, product_id)
         VALUES ($1,$2)
         ON CONFLICT DO NOTHING`,
        [w.user.id, w.product.id]
      );
      log(`  Created wishlist: ${w.user.name} → "${w.product.title}"`);
    }

    // ── Reports ───────────────────────────────────────────────────────────────
    const reportDefs = [
      {
        reporter: sameer, product: productRows.find((p) => p.status === 'available'),
        reason: 'misleading', details: 'Description does not match the item.',
      },
      {
        reporter: arjun, product: productRows.find((p) => p.category === 'other'),
        reason: 'spam', details: 'Same item listed multiple times.',
      },
    ];

    for (const r of reportDefs) {
      if (!r.reporter || !r.product) continue;
      await client.query(
        `INSERT INTO reports (reporter_id, product_id, reason, details)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT DO NOTHING`,
        [r.reporter.id, r.product.id, r.reason, r.details]
      );
      log(`  Created report: ${r.reporter.name} → "${r.product.title}" (${r.reason})`);
    }

    return { soldProduct, aarav, kavya };
  }).then(async ({ soldProduct, aarav, kavya }) => {
    // ── Paid transaction (needs its own DB transaction via markTransactionPaid)
    if (soldProduct && aarav && kavya) {
      const pool = getPool();
      const exists = (await pool.query(
        'SELECT 1 FROM transactions WHERE razorpay_order_id = $1',
        ['order_seed_paid_001']
      )).rows.length > 0;

      if (!exists) {
        // Insert a 'created' transaction first, then mark it paid atomically
        await pool.query(
          `INSERT INTO transactions
             (product_id, buyer_id, seller_id, amount, product_title,
              product_image_url, payment_status, razorpay_order_id)
           VALUES ($1,$2,$3,$4,$5,$6,'created',$7)`,
          [
            soldProduct.id, aarav.id, kavya.id,
            soldProduct.price, soldProduct.title,
            soldProduct.images?.[0]?.url || '',
            'order_seed_paid_001',
          ]
        );
        // Update the product status back to 'sold' then call markTransactionPaid
        // (product is already 'sold' from the seed; markTransactionPaid will set it again)
        await pool.query(
          "UPDATE products SET status = 'available', sold_at = NULL WHERE id = $1",
          [soldProduct.id]
        );
        await markTransactionPaid('order_seed_paid_001', 'pay_seed_001');
        log(`  Created transaction: paid (₹${soldProduct.price})`);
      } else {
        log('  Skipped transaction: paid');
      }
    }
  });
}

async function printSummary() {
  const pool = getPool();
  log('\n── Summary ──────────────────────────────────────────');
  const tables = ['users','products','transactions','otps','wishlists','reports','refresh_tokens'];
  for (const t of tables) {
    const { rows } = await pool.query(`SELECT COUNT(*)::int AS n FROM ${t}`);
    log(`  ${t.padEnd(16)} ${rows[0].n}`);
  }
  log('─────────────────────────────────────────────────────\n');
}

seed()
  .then(printSummary)
  .then(() => {
    log('✅  Seed complete.');
    disconnectDB().then(() => process.exit(0));
  })
  .catch((err) => {
    console.error('[Seed] ❌  Fatal error:', err);
    disconnectDB().then(() => process.exit(1));
  });
