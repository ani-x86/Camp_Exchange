import User from '../models/User.js';
import Product from '../models/Product.js';
import { sendMail, verificationStatusTemplate } from '../config/mailer.js';

export const getPendingVerifications = async (req, res, next) => {
  try {
    // We explicitly select idCardImageUrl here since it's select:false by default
    const users = await User.find({ verificationStatus: 'pending_review' })
      .select('+idCardImageUrl -passwordHash')
      .sort({ createdAt: 1 });

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
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const newStatus = action === 'approve' ? 'verified' : 'rejected';
    user.verificationStatus = newStatus;
    
    // If rejected, remove the invalid ID card
    if (newStatus === 'rejected') {
      user.idCardImageUrl = undefined;
    }

    await user.save();
    
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
      User.countDocuments(),
      User.countDocuments({ verificationStatus: 'verified' }),
      Product.countDocuments(),
      Product.countDocuments({ status: 'sold' }),
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
