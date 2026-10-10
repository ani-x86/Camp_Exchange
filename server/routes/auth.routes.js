import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  signup, verifyOtp, login, googleLogin, refresh, logout,
} from '../controllers/auth.controller.js';

const router = express.Router();

// Strict rate limit for auth routes to prevent brute-force / OTP spam
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 auth requests per window
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(authLimiter);

router.post('/signup', signup);
router.post('/verify-otp', verifyOtp);
router.post('/login', login);
router.post('/google', googleLogin);
router.post('/refresh', refresh);
router.post('/logout', logout);

export default router;
