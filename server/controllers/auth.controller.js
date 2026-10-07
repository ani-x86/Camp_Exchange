import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { sendMail, otpTemplate } from '../config/mailer.js';
import {
  createUser, findUserById, getAuthRecordByEmail,
} from '../src/db/repositories/users.js';
import {
  createOtp, findValidOtp, deleteOtp, incrementOtpAttempts,
} from '../src/db/repositories/otps.js';
import {
  createRefreshToken, findValidRefreshToken, revokeRefreshToken,
} from '../src/db/repositories/refreshTokens.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

/** Hash a value with SHA-256. Used for OTP codes and refresh tokens. */
function hashValue(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function issueTokens(user, res) {
  const payload = {
    id: user.id,
    role: user.role,
    verificationStatus: user.verificationStatus ?? user.verification_status,
  };

  const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  });

  const rawRefreshToken = crypto.randomBytes(40).toString('hex');
  const refreshTokenHash = hashValue(rawRefreshToken);

  // Cookie carries raw token; DB stores hash
  res.cookie('refreshToken', rawRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  // Persist hash asynchronously (non-blocking for response speed)
  createRefreshToken(user.id, refreshTokenHash).catch((e) =>
    console.error('[Auth] Failed to persist refresh token:', e.message)
  );

  return accessToken;
}

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * POST /api/auth/signup
 * Hashes password, sends OTP. Does NOT create the User yet.
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

    const existing = await getAuthRecordByEmail(email);
    if (existing) {
      return res
        .status(409)
        .json({ error: 'An account with this email already exists. Sign in instead.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const code = generateOtp();
    const codeHash = hashValue(code);

    await createOtp({
      email,
      codeHash,
      purpose: 'signup',
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
    const normalEmail = email.trim().toLowerCase();
    const otp = await findValidOtp(normalEmail, 'signup');

    if (!otp) {
      return res
        .status(400)
        .json({ error: 'No valid OTP found for this email. Request a new one.' });
    }

    const codeHash = hashValue(code.trim());
    if (otp.code_hash !== codeHash) {
      await incrementOtpAttempts(otp.id);
      return res.status(400).json({ error: 'Incorrect code. Check your email and try again.' });
    }

    const { name, prn, passwordHash } = otp.temp_data;

    const user = await createUser({
      name,
      prn,
      collegeEmail: normalEmail,
      passwordHash,
      campus: process.env.CAMPUS_NAME || 'ABC College',
    });

    await deleteOtp(otp.id);

    const accessToken = issueTokens(user, res);

    res.status(201).json({
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        collegeEmail: user.collegeEmail,
        prn: user.prn,
        verificationStatus: user.verificationStatus,
        role: user.role,
        verified: user.verified,
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
    const auth = await getAuthRecordByEmail(collegeEmail.trim().toLowerCase());

    if (!auth) {
      return res
        .status(401)
        .json({ error: 'No account found with this email. Sign up first.' });
    }

    const match = await bcrypt.compare(password, auth.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Incorrect password.' });
    }

    const user = await findUserById(auth.id);
    const accessToken = issueTokens(user, res);

    res.json({
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        collegeEmail: user.collegeEmail,
        prn: user.prn,
        verificationStatus: user.verificationStatus,
        role: user.role,
        verified: user.verified,
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
  const rawToken = req.cookies?.refreshToken;
  if (!rawToken) {
    return res.status(401).json({ error: 'No refresh token. Sign in again.' });
  }

  try {
    const tokenHash = hashValue(rawToken);
    const stored = await findValidRefreshToken(tokenHash);

    if (!stored) {
      return res.status(401).json({ error: 'Refresh token expired or revoked. Sign in again.' });
    }

    const user = await findUserById(stored.user_id);
    if (!user) {
      return res.status(401).json({ error: 'Account not found. Sign in again.' });
    }

    const accessToken = jwt.sign(
      { id: user.id, role: user.role, verificationStatus: user.verificationStatus },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m' }
    );

    res.json({ accessToken });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/logout
 * Revokes the refresh token hash and clears the cookie.
 */
export const logout = async (req, res) => {
  const rawToken = req.cookies?.refreshToken;
  if (rawToken) {
    const tokenHash = hashValue(rawToken);
    await revokeRefreshToken(tokenHash).catch(() => {});
  }
  res.clearCookie('refreshToken', { httpOnly: true, sameSite: 'lax' });
  res.json({ message: 'Signed out.' });
};
