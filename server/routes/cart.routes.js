import { Router } from 'express';

const router = Router();

// Phase 3 — Cart (cart state is primarily client-side Redux; these back it for checkout sync)
// GET  /api/cart        — retrieve persisted cart (optional server-side persistence)
// POST /api/cart        — sync cart items
// DELETE /api/cart/:id  — remove item from cart

export default router;
