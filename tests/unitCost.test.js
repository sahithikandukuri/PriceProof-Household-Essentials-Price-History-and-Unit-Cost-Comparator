// PriceProof: Unit-Cost Calculation Tests
const assert = require('assert');
const test = require('node:test');
const UnitCostService = require('../backend/services/unitCostService');

test('UnitCostService: Standardize Grams to Kilograms', () => {
  const result = UnitCostService.standardizeQuantity(500, 'g');
  assert.strictEqual(result.baseQuantity, 0.5);
  assert.strictEqual(result.baseUnit, 'kg');
  assert.strictEqual(result.baseLabel, 'kg');
});

test('UnitCostService: Standardize Millilitres to Litres', () => {
  const result = UnitCostService.standardizeQuantity(750, 'ml');
  assert.strictEqual(result.baseQuantity, 0.75);
  assert.strictEqual(result.baseUnit, 'l');
  assert.strictEqual(result.baseLabel, 'L');
});

test('UnitCostService: Accurate Unit Cost Calculation for 5kg Rice costing ₹320', () => {
  const result = UnitCostService.calculateUnitCost(320, 5, 'kg');
  assert.strictEqual(result.unitCost, 64);
  assert.strictEqual(result.formattedUnitCost, '₹64.00/kg');
});

test('UnitCostService: Accurate Unit Cost Comparison between 5kg and 10kg', () => {
  const item5kg = UnitCostService.calculateUnitCost(320, 5, 'kg');
  const item10kg = UnitCostService.calculateUnitCost(610, 10, 'kg');

  assert.strictEqual(item5kg.unitCost, 64);
  assert.strictEqual(item10kg.unitCost, 61);
  assert.ok(item10kg.unitCost < item5kg.unitCost, '10kg pack must yield lower cost per kg');
});

test('UnitCostService: Reject Zero or Negative Quantity to Prevent Division by Zero', () => {
  assert.throws(() => {
    UnitCostService.calculateUnitCost(100, 0, 'kg');
  }, /Quantity must be greater than zero/);

  assert.throws(() => {
    UnitCostService.calculateUnitCost(100, -5, 'kg');
  }, /Quantity must be greater than zero/);
});

test('UnitCostService: Reject Incompatible Unit Dimensions', () => {
  assert.strictEqual(UnitCostService.areUnitsCompatible('kg', 'g'), true);
  assert.strictEqual(UnitCostService.areUnitsCompatible('l', 'ml'), true);
  assert.strictEqual(UnitCostService.areUnitsCompatible('kg', 'l'), false);
  assert.strictEqual(UnitCostService.areUnitsCompatible('kg', 'piece'), false);
});
