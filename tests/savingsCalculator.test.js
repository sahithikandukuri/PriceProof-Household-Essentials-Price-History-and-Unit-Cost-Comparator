// PriceProof: Savings & Basket Calculation Tests
const assert = require('assert');
const test = require('node:test');
const SavingsService = require('../backend/services/savingsService');

const mockStores = [
  { id: 'store-1', name: 'DMart Ready', slug: 'dmart', delivery_charge: 49, min_free_delivery: 1000 },
  { id: 'store-2', name: 'BigBasket', slug: 'bigbasket', delivery_charge: 30, min_free_delivery: 500 },
];

test('SavingsService: Single Store Totals with Delivery Fee Rules', () => {
  const items = [
    {
      variant_id: 'var-1',
      quantity: 1,
      product_name: 'Rice',
      variant_name: '5 kg',
      listings: [
        { store_id: 'store-1', store_name: 'DMart Ready', price: 320, is_in_stock: true, min_free_delivery: 1000, delivery_charge: 49 },
        { store_id: 'store-2', store_name: 'BigBasket', price: 345, is_in_stock: true, min_free_delivery: 500, delivery_charge: 30 },
      ],
    },
    {
      variant_id: 'var-2',
      quantity: 2,
      product_name: 'Oil',
      variant_name: '1 L',
      listings: [
        { store_id: 'store-1', store_name: 'DMart Ready', price: 150, is_in_stock: true, min_free_delivery: 1000, delivery_charge: 49 },
        { store_id: 'store-2', store_name: 'BigBasket', price: 165, is_in_stock: true, min_free_delivery: 500, delivery_charge: 30 },
      ],
    },
  ];

  const result = SavingsService.calculateBasketEstimates(items, mockStores);

  // DMart: Rice ₹320 + 2*Oil ₹300 = ₹620 + ₹49 (below ₹1000 free threshold) = ₹669
  // BigBasket: Rice ₹345 + 2*Oil ₹330 = ₹675 + ₹0 (above ₹500 free threshold) = ₹675
  assert.strictEqual(result.itemCount, 2);
  const dmart = result.singleStoreTotals.find((s) => s.storeId === 'store-1');
  const bb = result.singleStoreTotals.find((s) => s.storeId === 'store-2');

  assert.strictEqual(dmart.subtotal, 620);
  assert.strictEqual(dmart.deliveryFee, 49);
  assert.strictEqual(dmart.grandTotal, 669);

  assert.strictEqual(bb.subtotal, 675);
  assert.strictEqual(bb.deliveryFee, 0);
  assert.strictEqual(bb.grandTotal, 675);
});

test('SavingsService: Optimized Multi-Store Combination identifies cheapest items', () => {
  const items = [
    {
      variant_id: 'v1',
      quantity: 1,
      product_name: 'Item A',
      listings: [
        { store_id: 's1', store_name: 'Store 1', price: 100, is_in_stock: true },
        { store_id: 's2', store_name: 'Store 2', price: 120, is_in_stock: true },
      ],
    },
    {
      variant_id: 'v2',
      quantity: 1,
      product_name: 'Item B',
      listings: [
        { store_id: 's1', store_name: 'Store 1', price: 200, is_in_stock: true },
        { store_id: 's2', store_name: 'Store 2', price: 180, is_in_stock: true },
      ],
    },
  ];

  const stores = [
    { id: 's1', name: 'Store 1', delivery_charge: 0 },
    { id: 's2', name: 'Store 2', delivery_charge: 0 },
  ];

  const result = SavingsService.calculateBasketEstimates(items, stores);
  // Combo: Item A from s1 (₹100) + Item B from s2 (₹180) = ₹280
  // Single Store 1 = ₹300, Single Store 2 = ₹300
  // Savings = ₹20
  assert.strictEqual(result.optimizedCombination.subtotal, 280);
  assert.strictEqual(result.potentialSavings, 20);
});
