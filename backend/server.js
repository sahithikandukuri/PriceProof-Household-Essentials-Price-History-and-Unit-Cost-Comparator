// PriceProof: Server Entry Point
const app = require('./app');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  logger.info(`========================================================`);
  logger.info(` PriceProof Server is running on port ${PORT}`);
  logger.info(` Web Application: http://localhost:${PORT}`);
  logger.info(` API Base URL:    http://localhost:${PORT}/api`);
  logger.info(` Environment:     ${process.env.NODE_ENV || 'development'}`);
  logger.info(`========================================================`);
});

// Graceful Shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received. Closing HTTP server gracefully...');
  server.close(() => {
    logger.info('HTTP server closed.');
    process.exit(0);
  });
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection:', reason);
});
