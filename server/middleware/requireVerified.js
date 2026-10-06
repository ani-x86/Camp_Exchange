/**
 * requireVerified — blocks unverified users from listing or buying items.
 * Must be used after the `authenticate` middleware.
 */
const requireVerified = (req, res, next) => {
  if (req.user?.verificationStatus !== 'verified') {
    return res.status(403).json({
      error:
        'ID verification required to list or buy items. Upload your ID card in your profile.',
    });
  }
  next();
};

export default requireVerified;
