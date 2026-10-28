// PriceProof: Centralized Error Handler Middleware
const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  logger.error(`Unhandled Error on ${req.method} ${req.originalUrl}:`, err);

  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`,
  });
}

module.exports = {
  errorHandler,
  notFoundHandler,
};
