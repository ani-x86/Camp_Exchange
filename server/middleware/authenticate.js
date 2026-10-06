import jwt from 'jsonwebtoken';

/**
 * authenticate — verifies the JWT access token from the Authorization header.
 * Attaches { id, role, verificationStatus } to req.user on success.
 * Does NOT touch the DB — payload is self-contained in the signed token.
 */
const authenticate = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Include a Bearer token.' });
  }

  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_ACCESS_SECRET);
    req.user = {
      id: payload.id,
      role: payload.role,
      verificationStatus: payload.verificationStatus,
    };
    next();
  } catch {
    return res.status(401).json({ error: 'Session expired or invalid. Sign in again.' });
  }
};

export default authenticate;
