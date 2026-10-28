// PriceProof: Rate Limiting Configuration
const rateLimit = require('express-rate-limit');

// General API Rate Limiter: 200 requests per 15 minutes per IP
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP address. Please try again after a few minutes.',
  },
});

// Strict Limiter for Admin & Mutations: 60 requests per 15 minutes
const mutationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 80,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Rate limit exceeded for write operations. Please wait before retrying.',
  },
});

module.exports = {
  apiLimiter,
  mutationLimiter,
};
