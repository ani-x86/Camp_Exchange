import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import OTP from '../models/OTP.js';
import { sendMail, otpTemplate } from '../config/mailer.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

const issueTokens = (user, res) => {
  const payload = {
    id: user._id,
    role: user.role,
    verificationStatus: user.verificationStatus,
  };

  const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  });

  const refreshToken = jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  return accessToken;
};

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * POST /api/auth/signup
 * Validates input, hashes password, sends OTP. Does NOT create the User yet.
 * The User is created only after OTP is verified (verifyOtp).
 */
export const signup = async (req, res, next) => {
  const { name, prn, collegeEmail, password } = req.body;

  if (!name?.trim() || !prn?.trim() || !collegeEmail?.trim() || !password) {
    return res
      .status(400)
      .json({ error: 'Name, PRN, college email, and password are required.' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  try {
    const email = collegeEmail.trim().toLowerCase();

    const existing = await User.findOne({ collegeEmail: email });
    if (existing) {
      return res
        .status(409)
        .json({ error: 'An account with this email already exists. Sign in instead.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const code = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    // Replace any existing signup OTP for this email (resend scenario)
    await OTP.deleteMany({ email, purpose: 'signup' });

    await OTP.create({
      email,
      code,
      purpose: 'signup',
      expiresAt,
      tempData: { name: name.trim(), prn: prn.trim(), passwordHash },
    });

    await sendMail(email, 'Your CampX signup code', otpTemplate(code));

    res.json({ message: 'OTP sent to your college email. Enter it to complete signup.' });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/verify-otp
 * Verifies OTP, creates User, returns access token + sets refresh cookie.
 */
export const verifyOtp = async (req, res, next) => {
  const { email, code } = req.body;
  if (!email?.trim() || !code?.trim()) {
    return res.status(400).json({ error: 'Email and OTP code are required.' });
  }

  try {
    const otp = await OTP.findOne({
      email: email.trim().toLowerCase(),
      purpose: 'signup',
    }).select('+tempData');

    if (!otp) {
      return res
        .status(400)
        .json({ error: 'No pending OTP for this email. Request a new one.' });
    }

    if (new Date() > otp.expiresAt) {
      await otp.deleteOne();
      return res
        .status(400)
        .json({ error: 'OTP has expired. Go back and request a new one.' });
    }

    if (otp.code !== code.trim()) {
      return res.status(400).json({ error: 'Incorrect code. Check your email and try again.' });
    }

    const { name, prn, passwordHash } = otp.tempData;

    const user = await User.create({
      name,
      prn,
      collegeEmail: otp.email,
      passwordHash,
      verificationStatus: 'pending',
    });

    await otp.deleteOne();

    const accessToken = issueTokens(user, res);

    res.status(201).json({
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        collegeEmail: user.collegeEmail,
        prn: user.prn,
        verificationStatus: user.verificationStatus,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/login
 */
export const login = async (req, res, next) => {
  const { collegeEmail, password } = req.body;
  if (!collegeEmail?.trim() || !password) {
    return res.status(400).json({ error: 'College email and password are required.' });
  }

  try {
    const user = await User.findOne({
      collegeEmail: collegeEmail.trim().toLowerCase(),
    }).select('+passwordHash');

    if (!user) {
      return res
        .status(401)
        .json({ error: 'No account found with this email. Sign up first.' });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ error: 'Incorrect password.' });
    }

    const accessToken = issueTokens(user, res);

    res.json({
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        collegeEmail: user.collegeEmail,
        prn: user.prn,
        verificationStatus: user.verificationStatus,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/refresh
 * Reads the httpOnly refresh cookie and issues a new access token.
 */
export const refresh = async (req, res, next) => {
  const token = req.cookies?.refreshToken;
  if (!token) {
    return res
      .status(401)
      .json({ error: 'No refresh token. Sign in again.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);

    const user = await User.findById(payload.id);
    if (!user) {
      return res.status(401).json({ error: 'Account not found. Sign in again.' });
    }

    const accessToken = jwt.sign(
      { id: user._id, role: user.role, verificationStatus: user.verificationStatus },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m' }
    );

    res.json({ accessToken });
  } catch {
    return res.status(401).json({ error: 'Refresh token expired or invalid. Sign in again.' });
  }
};

/**
 * POST /api/auth/logout
 * Clears the refresh cookie.
 */
export const logout = (_req, res) => {
  res.clearCookie('refreshToken', { httpOnly: true, sameSite: 'lax' });
  res.json({ message: 'Signed out.' });
};
