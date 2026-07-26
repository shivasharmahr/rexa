const rateLimit = require('express-rate-limit');

const contactRateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || 3600000), // 1 hour
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || 5), // 5 requests per window
  message: 'Too many contact submissions from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/api/health';
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many requests. Please try again later.'
    });
  }
});

module.exports = { contactRateLimiter };
