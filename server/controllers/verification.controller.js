import axios from 'axios';
import cloudinary from '../config/cloudinary.js';
import { findUserById, setVerificationStatus } from '../src/db/repositories/users.js';

/**
 * POST /api/verification/upload
 * Expects 'idCard' file via multer.
 * Uploads to Cloudinary (private), triggers FastAPI OCR, updates user status.
 */
export const uploadIdCard = async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ error: 'ID card image is required.' });
  }

  const userId = req.user.id;

  try {
    const user = await findUserById(userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    if (user.verificationStatus === 'verified') {
      return res.status(400).json({ error: 'You are already verified.' });
    }

    // 1. Upload to Cloudinary (private type — no public URL)
    const b64 = Buffer.from(req.file.buffer).toString('base64');
    const dataURI = `data:${req.file.mimetype};base64,${b64}`;

    const result = await cloudinary.uploader.upload(dataURI, {
      folder: process.env.CLOUDINARY_ID_CARD_FOLDER || 'campx/id_cards',
      type: 'private',
    });

    // 2. Call FastAPI Verification Service
    const ocrServiceUrl = process.env.VERIFICATION_SERVICE_URL || 'http://localhost:8000';
    let confidence = 0;
    let isMatched = false;

    try {
      const ocrRes = await axios.post(
        new URL('/verify-id', ocrServiceUrl).toString(),
        { imageUrl: result.secure_url, prn: user.prn }
      );
      isMatched = ocrRes.data.isMatched;
      confidence = ocrRes.data.confidence ?? (isMatched ? 1 : 0);
    } catch (error) {
      console.error('OCR Service Error:', error.message);
      // Fallback: put into pending_review for admin manual review
    }

    // 3. Update user — store Cloudinary public ID, never the signed URL
    const newStatus = isMatched ? 'verified' : 'pending_review';
    const updated = await setVerificationStatus(userId, newStatus, {
      confidence,
      verifiedAt: isMatched ? new Date() : undefined,
      idCardImagePublicId: result.public_id,
    });

    res.json({
      message: isMatched
        ? 'ID verified successfully.'
        : 'ID card uploaded. Awaiting manual review.',
      status: updated.verificationStatus,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/verification/status
 */
export const getStatus = async (req, res, next) => {
  try {
    const user = await findUserById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    res.json({ status: user.verificationStatus, verified: user.verified });
  } catch (err) {
    next(err);
  }
};
