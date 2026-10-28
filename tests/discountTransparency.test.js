// PriceProof: Discount Transparency Engine Tests
const assert = require('assert');
const test = require('node:test');
const DiscountService = require('../backend/services/discountService');
const { DISCOUNT_LABELS } = require('../backend/config/constants');

test('DiscountService: Detect Lowest Observed Price', () => {
  const currentPrice = 160;
  const mrp = 230;
  const history = [
    { price: 185, observed_at: '2026-09-01' },
    { price: 175, observed_at: '2026-09-15' },
    { price: 170, observed_at: '2026-10-01' },
  ];

  const analysis = DiscountService.analyzeDiscount(currentPrice, mrp, history);
  assert.strictEqual(analysis.label, DISCOUNT_LABELS.LOWEST_OBSERVED);
  assert.strictEqual(analysis.lowestHistoricalPrice, 170);
  assert.ok(analysis.currentPrice < analysis.lowestHistoricalPrice);
});

test('DiscountService: Flag Insufficient Data when fewer than 2 records exist', () => {
  const currentPrice = 300;
  const mrp = 350;
  const history = [{ price: 300, observed_at: '2026-10-20' }];

  const analysis = DiscountService.analyzeDiscount(currentPrice, mrp, history);
  assert.strictEqual(analysis.label, DISCOUNT_LABELS.INSUFFICIENT_DATA);
});

test('DiscountService: Identify Near Typical Price when price matches historical average', () => {
  const currentPrice = 200;
  const mrp = 250;
  const history = [
    { price: 198, observed_at: '2026-09-01' },
    { price: 202, observed_at: '2026-09-15' },
    { price: 200, observed_at: '2026-10-01' },
  ];

  const analysis = DiscountService.analyzeDiscount(currentPrice, mrp, history);
  assert.strictEqual(analysis.label, DISCOUNT_LABELS.NEAR_TYPICAL);
});
