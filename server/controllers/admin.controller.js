import {
  getPendingReviewUsers,
  setVerificationStatus,
  findUserById,
  countUsers,
} from '../src/db/repositories/users.js';
import { countProducts } from '../src/db/repositories/products.js';
import { sendMail, verificationStatusTemplate } from '../config/mailer.js';

export const getPendingVerifications = async (req, res, next) => {
  try {
    const users = await getPendingReviewUsers();
    res.json({ users });
  } catch (err) {
    next(err);
  }
};

export const reviewVerification = async (req, res, next) => {
  const { id } = req.params;
  const { action } = req.body; // 'approve' or 'reject'

  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'Action must be approve or reject.' });
  }

  try {
    const user = await findUserById(id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const newStatus = action === 'approve' ? 'verified' : 'rejected';

    await setVerificationStatus(id, newStatus, {
      verifiedAt: action === 'approve' ? new Date() : null,
      idCardImagePublicId: action === 'reject' ? null : undefined,
    });

    // Notify user
    await sendMail(
      user.collegeEmail,
      'CampX ID Verification Update',
      verificationStatusTemplate(newStatus)
    );

    res.json({ message: `User verification ${newStatus}.` });
  } catch (err) {
    next(err);
  }
};

export const getDashboardStats = async (req, res, next) => {
  try {
    const [totalUsers, verifiedUsers, totalProducts, soldProducts] = await Promise.all([
      countUsers(),
      countUsers({ verificationStatus: 'verified' }),
      countProducts(),
      countProducts({ status: 'sold' }),
    ]);

    res.json({
      totalUsers,
      verifiedUsers,
      totalProducts,
      soldProducts,
    });
  } catch (err) {
    next(err);
  }
};
