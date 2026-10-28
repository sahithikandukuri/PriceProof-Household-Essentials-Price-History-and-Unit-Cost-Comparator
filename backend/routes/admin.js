// PriceProof: Administrator Routes (Protected: Admin Role Required)
const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/adminController');
const { requireAdmin } = require('../middleware/auth');
const { mutationLimiter } = require('../middleware/rateLimiter');

router.use(requireAdmin);

router.get('/overview', AdminController.getOverviewStats);
router.post('/products', mutationLimiter, AdminController.createProduct);
router.post('/prices', mutationLimiter, AdminController.recordPriceObservation);
router.get('/audit-logs', AdminController.getAuditLogs);
router.get('/import-jobs', AdminController.getImportJobs);
router.post('/import-jobs', mutationLimiter, AdminController.triggerImportJob);

module.exports = router;
