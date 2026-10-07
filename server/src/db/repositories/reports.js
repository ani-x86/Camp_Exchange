/**
 * CampX — reports repository.
 * database.md §4.6
 */

import { getPool } from '../pool.js';

function toReport(row) {
  if (!row) return null;
  return {
    id: row.id,
    reporterId: row.reporter_id,
    productId: row.product_id,
    reason: row.reason,
    details: row.details ?? null,
    status: row.status,
    reviewedBy: row.reviewed_by ?? null,
    reviewedAt: row.reviewed_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createReport({ reporterId, productId, reason, details }) {
  const pool = getPool();
  try {
    const { rows } = await pool.query(
      `INSERT INTO reports (reporter_id, product_id, reason, details)
       VALUES ($1,$2,$3,$4)
       RETURNING *`,
      [reporterId, productId, reason, details ?? null]
    );
    return toReport(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      throw Object.assign(
        new Error('You have already reported this listing.'),
        { status: 409 }
      );
    }
    throw err;
  }
}

export async function getOpenReports() {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT r.*, u.name AS reporter_name, p.title AS product_title
     FROM reports r
     JOIN users u ON u.id = r.reporter_id
     JOIN products p ON p.id = r.product_id
     WHERE r.status = 'open'
     ORDER BY r.created_at ASC`
  );
  return rows.map((r) => ({
    ...toReport(r),
    reporterName: r.reporter_name,
    productTitle: r.product_title,
  }));
}

export async function reviewReport(id, { status, reviewedBy }) {
  const pool = getPool();
  const { rows } = await pool.query(
    `UPDATE reports
     SET status = $1, reviewed_by = $2, reviewed_at = now()
     WHERE id = $3
     RETURNING *`,
    [status, reviewedBy, id]
  );
  return toReport(rows[0]);
}
