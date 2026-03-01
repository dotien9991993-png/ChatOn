const rateLimit = require('express-rate-limit');

/**
 * Rate limiter cho auth endpoints
 * Tối đa 10 requests trong 15 phút
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    error: 'Quá nhiều lần thử. Vui lòng đợi 15 phút.',
    retryAfter: 15,
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});

/**
 * Rate limiter cho API chung
 * 60 requests/phút
 */
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: {
    error: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});

module.exports = { authLimiter, apiLimiter };
