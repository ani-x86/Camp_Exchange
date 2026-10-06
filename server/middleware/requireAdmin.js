/**
 * requireAdmin — restricts access to admin-role users only.
 * Must be used after the `authenticate` middleware.
 */
const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  next();
};

export default requireAdmin;
