/**
 * CampX — Seed Script
 * database.md §7
 *
 * Usage:
 *   npm run seed             — idempotent, skips existing records
 *   npm run seed -- --reset  — drops seeded collections first, then re-seeds
 *
 * Never runs in production (NODE_ENV=production).
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

import { connectDB } from '../config/db.js';
import User from '../models/User.js';
import Product from '../models/Product.js';
import Transaction from '../models/Transaction.js';
import OTP from '../models/OTP.js';
import Wishlist from '../models/Wishlist.js';
import Report from '../models/Report.js';

import { SEED_USERS, SEED_PRODUCTS, DEMO_PASSWORD } from './data.js';

// ─── Guards ──────────────────────────────────────────────────────────────────

if (process.env.NODE_ENV === 'production') {
  console.error('[Seed] ❌  Refused to run in production environment.');
  process.exit(1);
}

const shouldReset = process.argv.includes('--reset');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function log(msg) { console.log(`[Seed] ${msg}`); }

async function dropCollections() {
  const toDrop = ['users', 'products', 'transactions', 'otps', 'wishlists', 'reports', 'refreshtokens'];
  for (const col of toDrop) {
    try {
      await mongoose.connection.dropCollection(col);
      log(`  Dropped: ${col}`);
    } catch {
      // Collection may not exist yet — ignore
    }
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function seed() {
  await connectDB();

  if (shouldReset) {
    log('--reset flag detected. Dropping seeded collections…');
    await dropCollections();
    log('Drop complete.\n');
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  log(`Demo password: "${DEMO_PASSWORD}" (all seed accounts)\n`);

  // ── Users ──────────────────────────────────────────────────────────────────

  const createdUserMap = {}; // prn → User doc

  for (const u of SEED_USERS) {
    try {
      const existing = await User.findOne({
        $or: [{ collegeEmail: u.collegeEmail }, { prn: u.prn }],
      });
      if (existing) {
        log(`  Skipped user (exists): ${u.collegeEmail}`);
        createdUserMap[u.prn] = existing;
        continue;
      }

      const doc = await User.create({
        ...u,
        passwordHash,
        verifiedAt: u.verificationStatus === 'verified' ? new Date() : undefined,
      });

      createdUserMap[u.prn] = doc;
      log(`  Created user: ${u.name} (${u.verificationStatus})`);
    } catch (err) {
      log(`  ⚠️  User failed (${u.collegeEmail}): ${err.message}`);
    }
  }

  // Resolve seller/buyer references
  const aarav   = createdUserMap['12210456'];
  const arjun   = createdUserMap['12210834'];
  const kavya   = createdUserMap['12210945'];
  const sameer  = createdUserMap['12211056'];

  const verifiedSellers = [aarav, arjun, kavya, sameer].filter(Boolean);

  if (verifiedSellers.length === 0) {
    log('\n⚠️  No verified sellers available. Skipping products.\n');
    await printSummary();
    return;
  }

  // ── Products ───────────────────────────────────────────────────────────────

  const createdProducts = [];
  for (let i = 0; i < SEED_PRODUCTS.length; i++) {
    const p = SEED_PRODUCTS[i];
    const seller = verifiedSellers[i % verifiedSellers.length];

    try {
      const existing = await Product.findOne({
        title: p.title,
        sellerId: seller._id,
      });
      if (existing) {
        log(`  Skipped product (exists): "${p.title}"`);
        createdProducts.push(existing);
        continue;
      }

      const doc = await Product.create({
        ...p,
        sellerId: seller._id,
        soldAt: p.status === 'sold' ? new Date() : undefined,
        reservedFor: p.status === 'reserved' ? (aarav?._id) : undefined,
      });

      createdProducts.push(doc);
      log(`  Created product: "${p.title}" (${p.status})`);
    } catch (err) {
      log(`  ⚠️  Product failed ("${p.title}"): ${err.message}`);
    }
  }

  // ── Transactions (3) ───────────────────────────────────────────────────────

  const soldProduct   = createdProducts.find((p) => p.status === 'sold');
  const availProduct  = createdProducts.find((p) => p.status === 'available');
  const availProduct2 = createdProducts.filter((p) => p.status === 'available')[1];

  const txDefs = [
    {
      label: 'paid',
      buyer: aarav, seller: kavya, product: soldProduct,
      paymentStatus: 'paid',
      razorpayOrderId: 'order_seed_paid_001',
      razorpayPaymentId: 'pay_seed_001',
      paidAt: new Date(),
    },
    {
      label: 'created',
      buyer: sameer, seller: arjun, product: availProduct,
      paymentStatus: 'created',
      razorpayOrderId: 'order_seed_created_002',
    },
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
    try {
      const existing = await Transaction.findOne({ razorpayOrderId: tx.razorpayOrderId });
      if (existing) {
        log(`  Skipped transaction: ${tx.label}`);
        continue;
      }

      await Transaction.create({
        productId: tx.product._id,
        buyerId: tx.buyer._id,
        sellerId: tx.seller._id,
        amount: tx.product.price,
        productSnapshot: {
          title: tx.product.title,
          imageUrl: tx.product.images[0]?.url || '',
        },
        paymentStatus: tx.paymentStatus,
        razorpayOrderId: tx.razorpayOrderId,
        razorpayPaymentId: tx.razorpayPaymentId,
        paidAt: tx.paidAt,
      });

      log(`  Created transaction: ${tx.label} (₹${tx.product.price})`);
    } catch (err) {
      log(`  ⚠️  Transaction "${tx.label}" failed: ${err.message}`);
    }
  }

  // ── Wishlists ──────────────────────────────────────────────────────────────

  const wishlistEntries = [
    { user: aarav,  product: createdProducts[0] },
    { user: aarav,  product: createdProducts[1] },
    { user: sameer, product: createdProducts[0] },
  ];

  for (const w of wishlistEntries) {
    if (!w.user || !w.product) continue;
    try {
      await Wishlist.create({ userId: w.user._id, productId: w.product._id });
      log(`  Created wishlist: ${w.user.name} → "${w.product.title}"`);
    } catch (err) {
      if (err.code === 11000) {
        log(`  Skipped wishlist (exists): ${w.user.name} → "${w.product.title}"`);
      } else {
        log(`  ⚠️  Wishlist failed: ${err.message}`);
      }
    }
  }

  // ── Reports ────────────────────────────────────────────────────────────────

  const reportDefs = [
    {
      reporter: sameer, product: createdProducts.find((p) => p.status === 'available'),
      reason: 'misleading', details: 'Description does not match the item.',
    },
    {
      reporter: arjun, product: createdProducts.find((p) => p.status === 'available' && p.category === 'other'),
      reason: 'spam', details: 'Same item listed multiple times.',
    },
  ];

  for (const r of reportDefs) {
    if (!r.reporter || !r.product) continue;
    try {
      await Report.create({
        reporterId: r.reporter._id,
        productId: r.product._id,
        reason: r.reason,
        details: r.details,
      });
      log(`  Created report: ${r.reporter.name} → "${r.product.title}" (${r.reason})`);
    } catch (err) {
      if (err.code === 11000) {
        log(`  Skipped report (exists).`);
      } else {
        log(`  ⚠️  Report failed: ${err.message}`);
      }
    }
  }

  await printSummary();
}

async function printSummary() {
  log('\n── Summary ──────────────────────────────────────────');
  const collections = {
    users: User,
    products: Product,
    transactions: Transaction,
    otps: OTP,
    wishlists: Wishlist,
    reports: Report,
  };

  for (const [name, Model] of Object.entries(collections)) {
    const count = await Model.countDocuments();
    log(`  ${name.padEnd(14)} ${count}`);
  }
  log('────────────────────────────────────────────────────\n');
}

// ─── Run ─────────────────────────────────────────────────────────────────────

seed()
  .then(() => {
    log('✅  Seed complete.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('[Seed] ❌  Fatal error:', err);
    process.exit(1);
  });
