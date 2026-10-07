/**
 * CampX — wishlists repository.
 * database.md §4.5
 *
 * Composite PK (user_id, product_id) — no id column, no duplicates.
 */

import { getPool } from '../pool.js';

export async function addToWishlist(userId, productId) {
  const pool = getPool();
  try {
    await pool.query(
      `INSERT INTO wishlists (user_id, product_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [userId, productId]
    );
  } catch (err) {
    if (err.code === '23503') {
      throw Object.assign(new Error('Product not found.'), { status: 404 });
    }
    throw err;
  }
}

export async function removeFromWishlist(userId, productId) {
  const pool = getPool();
  const { rowCount } = await pool.query(
    'DELETE FROM wishlists WHERE user_id = $1 AND product_id = $2',
    [userId, productId]
  );
  return rowCount > 0;
}

export async function getWishlistByUser(userId) {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT w.product_id, w.created_at,
            p.title, p.price, p.status, p.images, p.category
     FROM wishlists w
     JOIN products p ON p.id = w.product_id
     WHERE w.user_id = $1
     ORDER BY w.created_at DESC`,
    [userId]
  );
  return rows.map((r) => ({
    productId: r.product_id,
    savedAt: r.created_at,
    title: r.title,
    price: r.price,
    status: r.status,
    images: r.images,
    category: r.category,
  }));
}

export async function isInWishlist(userId, productId) {
  const pool = getPool();
  const { rows } = await pool.query(
    'SELECT 1 FROM wishlists WHERE user_id = $1 AND product_id = $2',
    [userId, productId]
  );
  return rows.length > 0;
}
