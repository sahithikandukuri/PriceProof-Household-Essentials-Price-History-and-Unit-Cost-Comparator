// PriceProof: API Endpoints Integration Test
const assert = require('assert');
const test = require('node:test');
const app = require('../backend/app');

test('API Endpoints: GET /api/products/categories returns 9 categories', async () => {
  const req = {
    method: 'GET',
    url: '/api/products/categories',
    headers: {},
  };

  // Create lightweight mock req/res
  let resStatus = 200;
  let resData = null;

  const res = {
    status: (code) => { resStatus = code; return res; },
    json: (payload) => { resData = payload; return res; },
  };

  const productController = require('../backend/controllers/productController');
  await productController.getCategories(req, res, () => {});

  assert.strictEqual(resStatus, 200);
  assert.strictEqual(resData.success, true);
  assert.ok(resData.data.length >= 9, 'Should return at least 9 canonical Indian grocery categories');
});

test('API Endpoints: GET /api/products returns catalog with unit costs', async () => {
  const req = {
    query: { limit: 10 },
  };

  let resData = null;
  const res = {
    json: (payload) => { resData = payload; return res; },
  };

  const productController = require('../backend/controllers/productController');
  await productController.getProducts(req, res, () => {});

  assert.strictEqual(resData.success, true);
  assert.ok(resData.data.length > 0);
  assert.ok(resData.data[0].name);
  assert.ok(resData.data[0].lowestPrice !== undefined);
});

test('API Endpoints: Comparison Matrix highlights best unit value', async () => {
  const req = {
    params: { id: '44444444-4444-4444-4444-444444444001' },
  };

  let resData = null;
  const res = {
    status: () => res,
    json: (payload) => { resData = payload; return res; },
  };

  const comparisonController = require('../backend/controllers/comparisonController');
  await comparisonController.compareProduct(req, res, () => {});

  assert.strictEqual(resData.success, true);
  assert.ok(resData.matrix.length > 0);
  const v1 = resData.matrix[0];
  assert.ok(v1.bestUnitCostListingId, 'Must identify best unit cost listing');
});
