import express from 'express';
import {
  getPendingVerifications,
  reviewVerification,
  getDashboardStats,
} from '../controllers/admin.controller.js';
import authenticate from '../middleware/authenticate.js';
import requireAdmin from '../middleware/requireAdmin.js';

const router = express.Router();

// Strictly admin only
router.use(authenticate);
router.use(requireAdmin);

router.get('/verifications/pending', getPendingVerifications);
router.post('/verifications/:id/review', reviewVerification);
router.get('/stats', getDashboardStats);

export default router;
