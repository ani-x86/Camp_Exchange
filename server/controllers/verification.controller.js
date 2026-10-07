import axios from 'axios';
import cloudinary from '../config/cloudinary.js';
import User from '../models/User.js';

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
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    if (user.verificationStatus === 'verified') {
      return res.status(400).json({ error: 'You are already verified.' });
    }

    // 1. Upload to Cloudinary directly from buffer
    // Type: private ensures the image is not accessible via public URL
    const b64 = Buffer.from(req.file.buffer).toString('base64');
    const dataURI = `data:${req.file.mimetype};base64,${b64}`;
    
    const result = await cloudinary.uploader.upload(dataURI, {
      folder: 'campx/id_cards',
      type: 'private',
    });

    // 2. Call FastAPI Verification Service (Phase 0 spec)
    // Send the Cloudinary URL and PRN for OCR matching
    const ocrServiceUrl = process.env.VERIFICATION_SERVICE_URL || 'http://localhost:8000';
    let isMatched = false;
    
    try {
      const ocrRes = await axios.post(new URL('/verify-id', ocrServiceUrl).toString(), {
        imageUrl: result.secure_url,
        prn: user.prn,
      });
      isMatched = ocrRes.data.isMatched;
    } catch (error) {
      console.error('OCR Service Error:', error.message);
      // Fallback: If OCR fails or is down, put into pending_review for admin
      isMatched = false;
    }

    // 3. Update User
    user.idCardImageUrl = result.secure_url;
    user.verificationStatus = isMatched ? 'verified' : 'pending_review';
    await user.save();

    res.json({
      message: isMatched
        ? 'ID verified successfully.'
        : 'ID card uploaded. Awaiting manual review.',
      status: user.verificationStatus,
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
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    res.json({ status: user.verificationStatus });
  } catch (err) {
    next(err);
  }
};
