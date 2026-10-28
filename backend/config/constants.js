// PriceProof: Core Constants & Configuration

module.exports = {
  // Measurement Unit Definitions & Normalization to Base Units
  UNITS: {
    // Weight: Base unit is 'kg'
    GRAM: 'g',
    KILOGRAM: 'kg',
    // Volume: Base unit is 'l'
    MILLILITRE: 'ml',
    LITRE: 'l',
    // Discrete Units
    PIECE: 'piece',
    PACK: 'pack',
  },

  // Base unit mappings
  UNIT_BASE_MAPPING: {
    g: { base: 'kg', multiplier: 0.001, label: 'kg' },
    kg: { base: 'kg', multiplier: 1.0, label: 'kg' },
    ml: { base: 'l', multiplier: 0.001, label: 'L' },
    l: { base: 'l', multiplier: 1.0, label: 'L' },
    piece: { base: 'piece', multiplier: 1.0, label: 'piece' },
    pack: { base: 'pack', multiplier: 1.0, label: 'pack' },
  },

  // Discount Transparency Neutral Labels
  DISCOUNT_LABELS: {
    LOWEST_OBSERVED: 'Lowest Observed Price',
    BELOW_AVERAGE: 'Below Historical Average',
    NEAR_TYPICAL: 'Near Typical Price',
    ABOVE_AVERAGE: 'Above Historical Average',
    INSUFFICIENT_DATA: 'Insufficient Historical Data',
  },

  // Supported Retailers Reference
  STORES: [
    { slug: 'dmart', name: 'DMart Ready', type: 'hypermarket' },
    { slug: 'bigbasket', name: 'BigBasket', type: 'online' },
    { slug: 'blinkit', name: 'Blinkit', type: 'quick_commerce' },
    { slug: 'zepto', name: 'Zepto', type: 'quick_commerce' },
    { slug: 'jiomart', name: 'JioMart', type: 'online' },
    { slug: 'amazon-fresh', name: 'Amazon Fresh', type: 'online' },
    { slug: 'flipkart-grocery', name: 'Flipkart Grocery', type: 'online' },
    { slug: 'local-supermarket', name: 'Local Supermarket', type: 'supermarket' },
  ],

  // User Roles
  ROLES: {
    CUSTOMER: 'customer',
    ADMINISTRATOR: 'administrator',
  },
};
