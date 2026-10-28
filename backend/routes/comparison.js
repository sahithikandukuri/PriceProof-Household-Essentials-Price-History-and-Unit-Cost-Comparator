// PriceProof: Comparison & History Routes
const express = require('express');
const router = express.Router();
const ComparisonController = require('../controllers/comparisonController');

router.get('/:id/compare', ComparisonController.compareProduct);
router.get('/variants/:variantId/history', ComparisonController.getProductHistory);
router.get('/variants/:variantId/value-analysis', ComparisonController.getValueAnalysis);

module.exports = router;
