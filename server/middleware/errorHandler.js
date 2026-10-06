/**
 * Centralized error handler — must be the last middleware mounted.
 * Returns { error: string } and never leaks stack traces or secrets in production.
 */
const errorHandler = (err, req, res, _next) => {
  const statusCode = err.statusCode || err.status || 500;

  // Never expose internals in production
  const message =
    process.env.NODE_ENV === 'production' && statusCode === 500
      ? 'An unexpected error occurred. Try again or contact support.'
      : err.message || 'An unexpected error occurred.';

  res.status(statusCode).json({ error: message });
};

export default errorHandler;
