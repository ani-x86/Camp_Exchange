/**
 * CampX — products repository.
 * database.md §4.2
 *
 * Rules enforced here:
 *  - assertSellerVerified called inside createProduct.
 *  - Images validated against Cloudinary pattern before insert.
 *  - Seller name and verified status joined from users at read time (never cached).
 *  - Search uses websearch_to_tsquery + ts_rank per spec §5.
 *  - Parameterized queries only.
 */

import { getPool } from '../pool.js';
import { findUserById } from './users.js';

const CLOUDINARY_CLOUD = process.env.CLOUDINARY_CLOUD_NAME?.trim() || '';
const CLOUDINARY_BASE = 'https://res.cloudinary.com/';

function isCloudinaryUrl(url) {
  if (!url || url.startsWith('data:')) return false;
  if (!url.startsWith(CLOUDINARY_BASE)) return false;
  if (CLOUDINARY_CLOUD && !url.includes(`${CLOUDINARY_BASE}${CLOUDINARY_CLOUD}/`)) return false;
  return true;
}

function validateImages(images) {
  if (!Array.isArray(images) || images.length < 1) {
    throw Object.assign(new Error('At least one image is required.'), { status: 400 });
  }
  if (images.length > 6) {
    throw Object.assign(new Error('A listing can have at most 6 images.'), { status: 400 });
  }
  for (const img of images) {
    if (!img?.url || !isCloudinaryUrl(img.url)) {
      throw Object.assign(
        new Error('Image must be a valid Cloudinary URL (data: URLs are not allowed).'),
        { status: 400 }
      );
    }
  }
}

function mapPgError(err) {
  if (err.code === '23514') {
    return Object.assign(
      new Error(`Validation failed: ${err.detail || err.message}`),
      { status: 400 }
    );
  }
  return err;
}

function toProduct(row) {
  if (!row) return null;
  return {
    id: row.id,
    sellerId: row.seller_id,
    // Seller fields populated via JOIN when available
    sellerName: row.seller_name ?? null,
    sellerVerified: row.seller_verified ?? null,
    title: row.title,
    description: row.description,
    category: row.category,
    condition: row.condition ?? null,
    price: row.price,
    images: row.images,
    status: row.status,
    reservedFor: row.reserved_for ?? null,
    pickupLocation: row.pickup_location ?? null,
    pickupTimeWindow: row.pickup_time_window ?? null,
    viewCount: row.view_count,
    soldAt: row.sold_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * assertSellerVerified — throws if the user is not verified.
 * Call before any createProduct.
 */
export async function assertSellerVerified(userId) {
  const pool = getPool();
  const { rows } = await pool.query(
    'SELECT verification_status FROM users WHERE id = $1',
    [userId]
  );
  if (!rows[0]) throw Object.assign(new Error('Seller not found.'), { status: 404 });
  if (rows[0].verification_status !== 'verified') {
    throw Object.assign(
      new Error('Only verified students can list items for sale.'),
      { status: 403 }
    );
  }
}

const SELLER_JOIN = `
  LEFT JOIN users u ON u.id = p.seller_id
`;
const SELLER_FIELDS = `
  , u.name AS seller_name,
  (u.verification_status = 'verified') AS seller_verified
`;

export async function createProduct({ sellerId, title, description, category, condition, price, images, pickupLocation, pickupTimeWindow }) {
  await assertSellerVerified(sellerId);
  validateImages(images);

  const pool = getPool();
  try {
    const { rows } = await pool.query(
      `INSERT INTO products
         (seller_id, title, description, category, condition, price, images,
          pickup_location, pickup_time_window)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [sellerId, title.trim(), description.trim(), category,
       condition ?? null, price,
       JSON.stringify(images),
       pickupLocation ?? null, pickupTimeWindow ?? null]
    );
    return toProduct(rows[0]);
  } catch (err) {
    throw mapPgError(err);
  }
}

export async function findProductById(id) {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT p.* ${SELLER_FIELDS} FROM products p ${SELLER_JOIN} WHERE p.id = $1`,
    [id]
  );
  return toProduct(rows[0]);
}

export async function listProducts({ status = 'available', category, search, limit = 20, offset = 0 } = {}) {
  const pool = getPool();
  const values = [status];
  const conditions = ['p.status = $1'];

  if (category && category !== 'all') {
    values.push(category);
    conditions.push(`p.category = $${values.length}`);
  }

  let orderBy = 'p.created_at DESC';

  if (search) {
    values.push(search);
    const n = values.length;
    conditions.push(
      `p.search_vector @@ websearch_to_tsquery('english', $${n})`
    );
    orderBy = `ts_rank(p.search_vector, websearch_to_tsquery('english', $${n})) DESC, p.created_at DESC`;
  }

  values.push(limit, offset);
  const { rows } = await pool.query(
    `SELECT p.* ${SELLER_FIELDS}
     FROM products p ${SELLER_JOIN}
     WHERE ${conditions.join(' AND ')}
     ORDER BY ${orderBy}
     LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values
  );
  return rows.map(toProduct);
}

export async function findProductsBySeller(sellerId) {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT p.* ${SELLER_FIELDS}
     FROM products p ${SELLER_JOIN}
     WHERE p.seller_id = $1
     ORDER BY p.created_at DESC`,
    [sellerId]
  );
  return rows.map(toProduct);
}

export async function updateProduct(id, sellerId, fields) {
  const allowed = ['title','description','category','condition','price','images',
                   'status','reserved_for','pickup_location','pickup_time_window','sold_at'];
  const sets = [];
  const values = [];

  for (const [col, val] of Object.entries(fields)) {
    if (!allowed.includes(col)) continue;
    sets.push(`${col} = $${values.length + 1}`);
    values.push(col === 'images' ? JSON.stringify(val) : val);
  }
  if (sets.length === 0) return findProductById(id);

  values.push(id, sellerId);
  const pool = getPool();
  try {
    const { rows } = await pool.query(
      `UPDATE products SET ${sets.join(', ')}
       WHERE id = $${values.length - 1} AND seller_id = $${values.length}
       RETURNING *`,
      values
    );
    return rows[0] ? toProduct(rows[0]) : null;
  } catch (err) {
    throw mapPgError(err);
  }
}

export async function deleteProduct(id, sellerId) {
  const pool = getPool();
  const { rowCount } = await pool.query(
    `DELETE FROM products WHERE id = $1 AND seller_id = $2`,
    [id, sellerId]
  );
  return rowCount > 0;
}

export async function incrementViewCount(id) {
  const pool = getPool();
  await pool.query(
    'UPDATE products SET view_count = view_count + 1 WHERE id = $1',
    [id]
  );
}

export async function countProducts(filter = {}) {
  const pool = getPool();
  const conditions = [];
  const values = [];
  if (filter.status) { values.push(filter.status); conditions.push(`status = $${values.length}`); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await pool.query(`SELECT COUNT(*)::int AS n FROM products ${where}`, values);
  return rows[0].n;
}
