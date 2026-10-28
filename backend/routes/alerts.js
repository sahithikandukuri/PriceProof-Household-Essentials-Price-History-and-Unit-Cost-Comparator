// PriceProof: Price Alert & Notification Routes (Protected)
const express = require('express');
const router = express.Router();
const AlertController = require('../controllers/alertController');
const { requireAuth } = require('../middleware/auth');
const { mutationLimiter } = require('../middleware/rateLimiter');

router.use(requireAuth);

// Alerts
router.get('/', AlertController.getAlerts);
router.post('/', mutationLimiter, AlertController.createAlert);
router.patch('/:id', AlertController.updateAlert);
router.delete('/:id', AlertController.deleteAlert);

// In-app Notifications
router.get('/notifications', AlertController.getNotifications);
router.patch('/notifications/:id/read', AlertController.markNotificationRead);

module.exports = router;
