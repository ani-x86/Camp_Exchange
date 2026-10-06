import express from 'express';
import { createOrder, webhookHandler } from '../controllers/transaction.controller.js';
import authenticate from '../middleware/authenticate.js';
import requireVerified from '../middleware/requireVerified.js';

const router = express.Router();

// IMPORTANT: The webhook route must NOT use the router-level JSON parser,
// but rather express.raw() in server.js before this router is mounted.
// Therefore, the webhook is exported directly from the controller and attached in server.js.

// Protected routes for buyers
router.use(authenticate);
router.use(requireVerified);

router.post('/create', createOrder);

export default router;
