/**
 * CampX — transactions repository.
 * database.md §4.3
 *
 * Key rules:
 *  - markTransactionPaid is the ONLY path that sets payment_status = 'paid'.
 *  - It is idempotent: a repeated Razorpay webhook with the same paymentId
 *    returns the existing record without double-applying.
 *  - It runs in a single DB transaction (BEGIN…COMMIT) using SELECT FOR UPDATE
 *    to prevent races. Product is set to 'sold' in the same transaction.
 *  - If the product is already sold through a different paid transaction,
 *    the whole operation rolls back with a clear conflict error.
 *  - The DB trigger enforce_payment_status_transition() prevents any other
 *    code from making illegal status moves.
 */

import { getPool, withTransaction } from '../pool.js';

function toTransaction(row) {
  if (!row) return null;
  return {
    id: row.id,
    productId: row.product_id ?? null,
    buyerId: row.buyer_id,
    sellerId: row.seller_id,
    amount: row.amount,
    productTitle: row.product_title,
    productImageUrl: row.product_image_url,
    paymentStatus: row.payment_status,
    razorpayOrderId: row.razorpay_order_id,
    razorpayPaymentId: row.razorpay_payment_id ?? null,
    paidAt: row.paid_at ?? null,
    pickupLocation: row.pickup_location ?? null,
    pickupTimeWindow: row.pickup_time_window ?? null,
    receiptSentAt: row.receipt_sent_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPgError(err) {
  if (err.code === '23505') {
    if (err.constraint?.includes('razorpay_order')) {
      return Object.assign(new Error('Razorpay order ID already exists.'), { status: 409 });
    }
    if (err.constraint?.includes('one_paid_per_product')) {
      return Object.assign(
        new Error('This product already has a paid transaction.'),
        { status: 409 }
      );
    }
    return Object.assign(new Error('Duplicate value.'), { status: 409 });
  }
  if (err.code === '23514') {
    return Object.assign(
      new Error(`Validation failed: ${err.detail || err.message}`),
      { status: 400 }
    );
  }
  return err;
}

export async function createTransaction({
  productId, buyerId, sellerId, amount, productTitle,
  productImageUrl, razorpayOrderId, pickupLocation, pickupTimeWindow,
}) {
  const pool = getPool();
  try {
    const { rows } = await pool.query(
      `INSERT INTO transactions
         (product_id, buyer_id, seller_id, amount, product_title,
          product_image_url, razorpay_order_id, pickup_location, pickup_time_window)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [productId, buyerId, sellerId, amount, productTitle,
       productImageUrl, razorpayOrderId,
       pickupLocation ?? null, pickupTimeWindow ?? null]
    );
    return toTransaction(rows[0]);
  } catch (err) {
    throw mapPgError(err);
  }
}

export async function findTransactionByOrderId(razorpayOrderId) {
  const pool = getPool();
  const { rows } = await pool.query(
    'SELECT * FROM transactions WHERE razorpay_order_id = $1',
    [razorpayOrderId]
  );
  return toTransaction(rows[0]);
}

export async function findTransactionById(id) {
  const pool = getPool();
  const { rows } = await pool.query(
    'SELECT * FROM transactions WHERE id = $1',
    [id]
  );
  return toTransaction(rows[0]);
}

export async function getTransactionsByBuyer(buyerId) {
  const pool = getPool();
  const { rows } = await pool.query(
    'SELECT * FROM transactions WHERE buyer_id = $1 ORDER BY created_at DESC',
    [buyerId]
  );
  return rows.map(toTransaction);
}

export async function getTransactionsBySeller(sellerId) {
  const pool = getPool();
  const { rows } = await pool.query(
    'SELECT * FROM transactions WHERE seller_id = $1 ORDER BY created_at DESC',
    [sellerId]
  );
  return rows.map(toTransaction);
}

/**
 * markTransactionPaid — idempotent webhook handler.
 *
 * Steps (all in one DB transaction, SELECT FOR UPDATE prevents races):
 * 1. Lock the transaction row.
 * 2. If already paid with the same paymentId → return as-is (idempotent).
 * 3. Update payment_status to 'paid' + set paidAt + razorpayPaymentId.
 * 4. Update the product to 'sold' with sold_at = now().
 * 5. If the product is already sold via a different paid transaction → rollback.
 *
 * @param {string} razorpayOrderId
 * @param {string} razorpayPaymentId
 * @returns {{ transaction: object, product: object }}
 */
export async function markTransactionPaid(razorpayOrderId, razorpayPaymentId) {
  return withTransaction(async (client) => {
    // Lock the row to prevent concurrent webhook replays
    const { rows: txRows } = await client.query(
      `SELECT * FROM transactions
       WHERE razorpay_order_id = $1
       FOR UPDATE`,
      [razorpayOrderId]
    );

    if (!txRows[0]) {
      throw Object.assign(
        new Error(`Transaction not found for order ${razorpayOrderId}.`),
        { status: 404 }
      );
    }

    const tx = txRows[0];

    // Idempotency: already paid with the same paymentId → safe no-op
    if (tx.payment_status === 'paid' && tx.razorpay_payment_id === razorpayPaymentId) {
      return { transaction: toTransaction(tx), product: null };
    }

    // Mark paid (DB trigger will reject illegal status moves automatically)
    const now = new Date();
    const { rows: updatedTx } = await client.query(
      `UPDATE transactions
       SET payment_status = 'paid', razorpay_payment_id = $1, paid_at = $2
       WHERE id = $3
       RETURNING *`,
      [razorpayPaymentId, now, tx.id]
    );

    // Check the partial unique index: only one paid tx per product is allowed
    if (tx.product_id) {
      const { rows: conflictCheck } = await client.query(
        `SELECT id FROM transactions
         WHERE product_id = $1 AND payment_status = 'paid' AND id <> $2`,
        [tx.product_id, tx.id]
      );
      if (conflictCheck.length > 0) {
        throw Object.assign(
          new Error('This product already has a paid transaction. Payment conflict.'),
          { status: 409 }
        );
      }

      // Mark the product sold in the same transaction
      await client.query(
        `UPDATE products SET status = 'sold', sold_at = $1 WHERE id = $2`,
        [now, tx.product_id]
      );
    }

    return {
      transaction: toTransaction(updatedTx[0]),
      productId: tx.product_id,
    };
  });
}

export async function setReceiptSent(id) {
  const pool = getPool();
  await pool.query(
    'UPDATE transactions SET receipt_sent_at = now() WHERE id = $1',
    [id]
  );
}
