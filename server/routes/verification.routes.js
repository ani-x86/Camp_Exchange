import express from 'express';
import { uploadIdCard, getStatus } from '../controllers/verification.controller.js';
import authenticate from '../middleware/authenticate.js';
import { uploadIdCard as uploadMiddleware } from '../middleware/upload.js';

const router = express.Router();

// All verification routes require authentication
router.use(authenticate);

// Expected form-data key: idCard
router.post('/upload', uploadMiddleware, uploadIdCard);
router.get('/status', getStatus);

export default router;
