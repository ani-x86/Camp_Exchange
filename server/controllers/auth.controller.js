import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { sendMail, otpTemplate } from '../config/mailer.js';
import {
  createUserFromRoster, findUserById, findUserByPrn,
  getAuthRecordByEmail, getStudentByEmail, getStudentByPrn,
} from '../src/db/repositories/users.js';
import { verifyFirebaseIdToken } from '../config/firebaseAdmin.js';
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

  if (
    typeof name !== 'string' || !name.trim()
    || typeof prn !== 'string' || !prn.trim()
    || typeof collegeEmail !== 'string' || !collegeEmail.trim()
    || typeof password !== 'string' || !password
  ) {
    return res
      .status(400)
      .json({ error: 'Name, PRN, college email, and password are required.' });
  }

  if (password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
    return res.status(400).json({ error: 'Password must be at least 8 characters and no more than 72 bytes.' });
  }

  try {
    const email = collegeEmail.trim().toLowerCase();
    const student = await getStudentByPrn(prn.trim());
    const studentCredentialsMatch = student
      && student.college_email === email
      && await bcrypt.compare(password, student.password_hash);

    if (!studentCredentialsMatch) {
      return res.status(401).json({ error: 'Student credentials were not recognized.' });
    }

    const existing = await getAuthRecordByEmail(email);
    if (existing || await findUserByPrn(student.prn)) {
      return res
        .status(409)
        .json({ error: 'An account for this PRN already exists. Continue to sign in.' });
    }

    const code = generateOtp();
    const codeHash = hashValue(code);

    await createOtp({
      email,
      codeHash,
      purpose: 'signup',
      tempData: { name: student.name, prn: student.prn },
    });

    await sendMail(student.college_email, 'Your CampX signup code', otpTemplate(code));

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

    const student = await getStudentByPrn(otp.temp_data.prn);
    if (!student || student.college_email !== normalEmail) {
      return res.status(400).json({ error: 'Student roster record not found. Restart signup.' });
    }

    const user = await createUserFromRoster(student);

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
  const { prn, password } = req.body;
  if (typeof prn !== 'string' || !prn.trim() || typeof password !== 'string' || !password) {
    return res.status(400).json({ error: 'PRN and password are required.' });
  }
  if (Buffer.byteLength(password, 'utf8') > 72) {
    return res.status(400).json({ error: 'Password exceeds the supported length.' });
  }

  try {
    const student = await getStudentByPrn(prn);
    const match = student && await bcrypt.compare(password, student.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid PRN or password.' });
    }

    const user = await findUserByPrn(student.prn)
      || await createUserFromRoster(student);
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
 * POST /api/auth/google
 * Verifies Firebase's ID token, then requires its verified email to match
 * a student in the imported roster before issuing a CampX session.
 */
export const googleLogin = async (req, res, next) => {
  const { idToken } = req.body;
  if (typeof idToken !== 'string' || !idToken.trim()) {
    return res.status(400).json({ error: 'A Firebase ID token is required.' });
  }

  try {
    let claims;
    try {
      claims = await verifyFirebaseIdToken(idToken.trim());
    } catch (error) {
      if ([
        'auth/argument-error',
        'auth/id-token-expired',
        'auth/invalid-id-token',
      ].includes(error.code)) {
        return res.status(401).json({ error: 'Google sign-in session is invalid or expired.' });
      }
      throw error;
    }

    if (claims.email_verified !== true || typeof claims.email !== 'string') {
      return res.status(401).json({ error: 'Use a verified Google email for student access.' });
    }

    const student = await getStudentByEmail(claims.email);
    if (!student) {
      return res.status(403).json({ error: 'This Google email is not in the student roster.' });
    }

    const user = await findUserByPrn(student.prn)
      || await createUserFromRoster(student);
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
  } catch (error) {
    next(error);
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
