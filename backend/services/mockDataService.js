// PriceProof: Mock & Fallback Data Service
// Provides immediate local demonstration data if Supabase tables are pending migration

const mockStores = [
  { id: '11111111-1111-1111-1111-111111111101', name: 'DMart Ready', slug: 'dmart', logo_url: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=100', store_type: 'hypermarket', delivery_charge: 49.00, min_free_delivery: 1000.00 },
  { id: '11111111-1111-1111-1111-111111111102', name: 'BigBasket', slug: 'bigbasket', logo_url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=100', store_type: 'online', delivery_charge: 30.00, min_free_delivery: 500.00 },
  { id: '11111111-1111-1111-1111-111111111103', name: 'Blinkit', slug: 'blinkit', logo_url: 'https://images.unsplash.com/photo-1526367790999-0150786686a2?w=100', store_type: 'quick_commerce', delivery_charge: 25.00, min_free_delivery: 0.00 },
  { id: '11111111-1111-1111-1111-111111111104', name: 'Zepto', slug: 'zepto', logo_url: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=100', store_type: 'quick_commerce', delivery_charge: 29.00, min_free_delivery: 0.00 },
  { id: '11111111-1111-1111-1111-111111111105', name: 'JioMart', slug: 'jiomart', logo_url: 'https://images.unsplash.com/photo-1583258292688-d0213dc5a3a8?w=100', store_type: 'online', delivery_charge: 0.00, min_free_delivery: 250.00 },
  { id: '11111111-1111-1111-1111-111111111106', name: 'Amazon Fresh', slug: 'amazon-fresh', logo_url: 'https://images.unsplash.com/photo-1523474253246-f3be1ad42e6c?w=100', store_type: 'online', delivery_charge: 39.00, min_free_delivery: 799.00 },
  { id: '11111111-1111-1111-1111-111111111107', name: 'Flipkart Grocery', slug: 'flipkart-grocery', logo_url: 'https://images.unsplash.com/photo-1555529771-7888783a18d3?w=100', store_type: 'online', delivery_charge: 40.00, min_free_delivery: 600.00 },
  { id: '11111111-1111-1111-1111-111111111108', name: 'Local Supermarket', slug: 'local-supermarket', logo_url: 'https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=100', store_type: 'supermarket', delivery_charge: 0.00, min_free_delivery: 0.00 },
];

const mockCategories = [
  { id: '22222222-2222-2222-2222-222222222201', name: 'Rice and Pulses', slug: 'rice-and-pulses', icon: '🌾', description: 'Basmati, sona masoori, toor dal, and grains', display_order: 1 },
  { id: '22222222-2222-2222-2222-222222222202', name: 'Milk and Dairy', slug: 'milk-and-dairy', icon: '🥛', description: 'Fresh milk, paneer, curd, butter, and ghee', display_order: 2 },
  { id: '22222222-2222-2222-2222-222222222203', name: 'Vegetables and Fruits', slug: 'vegetables-and-fruits', icon: '🥔', description: 'Daily fresh farm produce', display_order: 3 },
  { id: '22222222-2222-2222-2222-222222222204', name: 'Packaged Foods', slug: 'packaged-foods', icon: '🍞', description: 'Atta, noodles, biscuits, and staples', display_order: 4 },
  { id: '22222222-2222-2222-2222-222222222205', name: 'Personal Care', slug: 'personal-care', icon: '🧴', description: 'Soaps, toothpaste, and hygiene', display_order: 5 },
  { id: '22222222-2222-2222-2222-222222222206', name: 'Cleaning Products', slug: 'cleaning-products', icon: '🧼', description: 'Detergents and cleaners', display_order: 6 },
  { id: '22222222-2222-2222-2222-222222222207', name: 'Cooking Oils', slug: 'cooking-oils', icon: '🛢️', description: 'Sunflower, mustard, and blended oils', display_order: 7 },
  { id: '22222222-2222-2222-2222-222222222208', name: 'Beverages', slug: 'beverages', icon: '☕', description: 'Tea, coffee, and drinks', display_order: 8 },
  { id: '22222222-2222-2222-2222-222222222209', name: 'Other Household Essentials', slug: 'other-essentials', icon: '🧂', description: 'Salt, spices, and sugar', display_order: 9 },
];

const mockBrands = [
  { id: '33333333-3333-3333-3333-333333333301', name: 'India Gate', slug: 'india-gate' },
  { id: '33333333-3333-3333-3333-333333333302', name: 'Daawat', slug: 'daawat' },
  { id: '33333333-3333-3333-3333-333333333303', name: 'Aashirvaad', slug: 'aashirvaad' },
  { id: '33333333-3333-3333-3333-333333333304', name: 'Tata Sampann', slug: 'tata-sampann' },
  { id: '33333333-3333-3333-3333-333333333305', name: 'Amul', slug: 'amul' },
  { id: '33333333-3333-3333-3333-333333333306', name: 'Mother Dairy', slug: 'mother-dairy' },
  { id: '33333333-3333-3333-3333-333333333307', name: 'Fortune', slug: 'fortune' },
  { id: '33333333-3333-3333-3333-333333333308', name: 'Saffola', slug: 'saffola' },
  { id: '33333333-3333-3333-3333-333333333309', name: 'Surf Excel', slug: 'surf-excel' },
  { id: '33333333-3333-3333-3333-333333333310', name: 'Vim', slug: 'vim' },
  { id: '33333333-3333-3333-3333-333333333311', name: 'Colgate', slug: 'colgate' },
  { id: '33333333-3333-3333-3333-333333333312', name: 'Britannia', slug: 'britannia' },
  { id: '33333333-3333-3333-3333-333333333313', name: 'Parle', slug: 'parle' },
  { id: '33333333-3333-3333-3333-333333333314', name: 'Tata Tea', slug: 'tata-tea' },
];

const mockProducts = [
  {
    id: '44444444-4444-4444-4444-444444444001',
    name: 'India Gate Basmati Rice Classic',
    slug: 'india-gate-basmati-rice-classic',
    category_id: '22222222-2222-2222-2222-222222222201',
    brand_id: '33333333-3333-3333-3333-333333333301',
    description: 'Aged aromatic long grain basmati rice ideal for biryani and pulao',
    image_url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500',
    variants: [
      {
        id: '55555555-5555-5555-5555-555555555001',
        variant_name: '1 kg Pouch',
        quantity: 1.0,
        unit: 'kg',
        is_default: true,
        listings: [
          { id: '66666666-6666-6666-6666-666666666001', store_id: '11111111-1111-1111-1111-111111111101', store_name: 'DMart Ready', current_price: 175.00, mrp: 230.00, is_in_stock: true, updated_at: '2026-10-25T08:00:00Z' },
          { id: '66666666-6666-6666-6666-666666666002', store_id: '11111111-1111-1111-1111-111111111102', store_name: 'BigBasket', current_price: 189.00, mrp: 230.00, is_in_stock: true, updated_at: '2026-10-25T09:30:00Z' },
          { id: '66666666-6666-6666-6666-666666666003', store_id: '11111111-1111-1111-1111-111111111103', store_name: 'Blinkit', current_price: 210.00, mrp: 230.00, is_in_stock: true, updated_at: '2026-10-26T14:10:00Z' },
          { id: '66666666-6666-6666-6666-666666666004', store_id: '11111111-1111-1111-1111-111111111105', store_name: 'JioMart', current_price: 180.00, mrp: 230.00, is_in_stock: true, updated_at: '2026-10-25T11:00:00Z' },
        ]
      },
      {
        id: '55555555-5555-5555-5555-555555555002',
        variant_name: '5 kg Bag',
        quantity: 5.0,
        unit: 'kg',
        is_default: false,
        listings: [
          { id: '66666666-6666-6666-6666-666666666005', store_id: '11111111-1111-1111-1111-111111111101', store_name: 'DMart Ready', current_price: 815.00, mrp: 1050.00, is_in_stock: true, updated_at: '2026-10-25T08:00:00Z' },
          { id: '66666666-6666-6666-6666-666666666006', store_id: '11111111-1111-1111-1111-111111111102', store_name: 'BigBasket', current_price: 860.00, mrp: 1050.00, is_in_stock: true, updated_at: '2026-10-25T09:30:00Z' },
        ]
      }
    ]
  },
  {
    id: '44444444-4444-4444-4444-444444444004',
    name: 'Aashirvaad Superior MP Sharbati Atta',
    slug: 'aashirvaad-superior-mp-sharbati-atta',
    category_id: '22222222-2222-2222-2222-222222222204',
    brand_id: '33333333-3333-3333-3333-333333333303',
    description: '100% pure whole wheat grain flour with 0% maida for soft rotis',
    image_url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500',
    variants: [
      {
        id: '55555555-5555-5555-5555-555555555005',
        variant_name: '5 kg Bag',
        quantity: 5.0,
        unit: 'kg',
        is_default: true,
        listings: [
          { id: '66666666-6666-6666-6666-666666666015', store_id: '11111111-1111-1111-1111-111111111101', store_name: 'DMart Ready', current_price: 275.00, mrp: 310.00, is_in_stock: true, updated_at: '2026-10-26T10:00:00Z' },
          { id: '66666666-6666-6666-6666-666666666016', store_id: '11111111-1111-1111-1111-111111111102', store_name: 'BigBasket', current_price: 289.00, mrp: 310.00, is_in_stock: true, updated_at: '2026-10-26T11:00:00Z' },
          { id: '66666666-6666-6666-6666-666666666017', store_id: '11111111-1111-1111-1111-111111111103', store_name: 'Blinkit', current_price: 305.00, mrp: 310.00, is_in_stock: true, updated_at: '2026-10-26T12:00:00Z' },
        ]
      },
      {
        id: '55555555-5555-5555-5555-555555555006',
        variant_name: '10 kg Bag',
        quantity: 10.0,
        unit: 'kg',
        is_default: false,
        listings: [
          { id: '66666666-6666-6666-6666-666666666019', store_id: '11111111-1111-1111-1111-111111111101', store_name: 'DMart Ready', current_price: 520.00, mrp: 610.00, is_in_stock: true, updated_at: '2026-10-26T10:00:00Z' },
          { id: '66666666-6666-6666-6666-666666666020', store_id: '11111111-1111-1111-1111-111111111102', store_name: 'BigBasket', current_price: 545.00, mrp: 610.00, is_in_stock: true, updated_at: '2026-10-26T11:00:00Z' },
        ]
      }
    ]
  },
  {
    id: '44444444-4444-4444-4444-444444444005',
    name: 'Fortune Sunlite Refined Sunflower Oil',
    slug: 'fortune-sunlite-refined-sunflower-oil',
    category_id: '22222222-2222-2222-2222-222222222207',
    brand_id: '33333333-3333-3333-3333-333333333307',
    description: 'Light and healthy edible oil enriched with Vitamin A and D',
    image_url: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500',
    variants: [
      {
        id: '55555555-5555-5555-5555-555555555007',
        variant_name: '1 Litre Pouch',
        quantity: 1.0,
        unit: 'l',
        is_default: true,
        listings: [
          { id: '66666666-6666-6666-6666-666666666022', store_id: '11111111-1111-1111-1111-111111111101', store_name: 'DMart Ready', current_price: 138.00, mrp: 165.00, is_in_stock: true, updated_at: '2026-10-25T14:00:00Z' },
          { id: '66666666-6666-6666-6666-666666666023', store_id: '11111111-1111-1111-1111-111111111102', store_name: 'BigBasket', current_price: 145.00, mrp: 165.00, is_in_stock: true, updated_at: '2026-10-25T14:30:00Z' },
          { id: '66666666-6666-6666-6666-666666666024', store_id: '11111111-1111-1111-1111-111111111103', store_name: 'Blinkit', current_price: 155.00, mrp: 165.00, is_in_stock: true, updated_at: '2026-10-26T08:00:00Z' },
        ]
      }
    ]
  },
  {
    id: '44444444-4444-4444-4444-444444444007',
    name: 'Amul Taaza Toned Milk',
    slug: 'amul-taaza-toned-milk',
    category_id: '22222222-2222-2222-2222-222222222202',
    brand_id: '33333333-3333-3333-3333-333333333305',
    description: 'UHT treated long life toned milk with 3.0% fat and 8.5% SNF',
    image_url: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500',
    variants: [
      {
        id: '55555555-5555-5555-5555-555555555010',
        variant_name: '1 Litre Tetra Pack',
        quantity: 1.0,
        unit: 'l',
        is_default: true,
        listings: [
          { id: '66666666-6666-6666-6666-666666666032', store_id: '11111111-1111-1111-1111-111111111101', store_name: 'DMart Ready', current_price: 68.00, mrp: 74.00, is_in_stock: true, updated_at: '2026-10-26T06:00:00Z' },
          { id: '66666666-6666-6666-6666-666666666033', store_id: '11111111-1111-1111-1111-111111111102', store_name: 'BigBasket', current_price: 72.00, mrp: 74.00, is_in_stock: true, updated_at: '2026-10-26T07:00:00Z' },
          { id: '66666666-6666-6666-6666-666666666034', store_id: '11111111-1111-1111-1111-111111111103', store_name: 'Blinkit', current_price: 74.00, mrp: 74.00, is_in_stock: true, updated_at: '2026-10-26T08:00:00Z' },
        ]
      }
    ]
  },
  {
    id: '44444444-4444-4444-4444-444444444009',
    name: 'Surf Excel Matic Top Load Detergent Powder',
    slug: 'surf-excel-matic-top-load-detergent-powder',
    category_id: '22222222-2222-2222-2222-222222222206',
    brand_id: '33333333-3333-3333-3333-333333333309',
    description: 'Specially designed washing machine detergent for tough stains in 1 wash',
    image_url: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=500',
    variants: [
      {
        id: '55555555-5555-5555-5555-555555555014',
        variant_name: '2 kg Pouch',
        quantity: 2.0,
        unit: 'kg',
        is_default: true,
        listings: [
          { id: '66666666-6666-6666-6666-666666666043', store_id: '11111111-1111-1111-1111-111111111101', store_name: 'DMart Ready', current_price: 415.00, mrp: 520.00, is_in_stock: true, updated_at: '2026-10-26T09:00:00Z' },
          { id: '66666666-6666-6666-6666-666666666044', store_id: '11111111-1111-1111-1111-111111111102', store_name: 'BigBasket', current_price: 449.00, mrp: 520.00, is_in_stock: true, updated_at: '2026-10-26T10:00:00Z' },
          { id: '66666666-6666-6666-6666-666666666045', store_id: '11111111-1111-1111-1111-111111111103', store_name: 'Blinkit', current_price: 499.00, mrp: 520.00, is_in_stock: true, updated_at: '2026-10-26T11:00:00Z' },
        ]
      }
    ]
  },
  {
    id: '44444444-4444-4444-4444-444444444011',
    name: 'Colgate Strong Teeth Dental Cream',
    slug: 'colgate-strong-teeth-dental-cream',
    category_id: '22222222-2222-2222-2222-222222222205',
    brand_id: '33333333-3333-3333-3333-333333333311',
    description: 'Calcium boost formula to nourish teeth and provide cavity protection',
    image_url: 'https://images.unsplash.com/photo-1559599101-f09722fb4948?w=500',
    variants: [
      {
        id: '55555555-5555-5555-5555-555555555017',
        variant_name: '500 g Saver Pack',
        quantity: 500.0,
        unit: 'g',
        is_default: true,
        listings: [
          { id: '66666666-6666-6666-6666-666666666051', store_id: '11111111-1111-1111-1111-111111111101', store_name: 'DMart Ready', current_price: 225.00, mrp: 290.00, is_in_stock: true, updated_at: '2026-10-26T09:00:00Z' },
          { id: '66666666-6666-6666-6666-666666666052', store_id: '11111111-1111-1111-1111-111111111102', store_name: 'BigBasket', current_price: 248.00, mrp: 290.00, is_in_stock: true, updated_at: '2026-10-26T10:00:00Z' },
        ]
      }
    ]
  },
  {
    id: '44444444-4444-4444-4444-444444444012',
    name: 'Tata Tea Gold Rich Taste & Aroma',
    slug: 'tata-tea-gold-rich-taste-aroma',
    category_id: '22222222-2222-2222-2222-222222222208',
    brand_id: '33333333-3333-3333-3333-333333333314',
    description: 'Exquisite blend of valley grown Assam CTC teas with gently rolled long leaves',
    image_url: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=500',
    variants: [
      {
        id: '55555555-5555-5555-5555-555555555018',
        variant_name: '500 g Pouch',
        quantity: 500.0,
        unit: 'g',
        is_default: true,
        listings: [
          { id: '66666666-6666-6666-6666-666666666054', store_id: '11111111-1111-1111-1111-111111111101', store_name: 'DMart Ready', current_price: 285.00, mrp: 360.00, is_in_stock: true, updated_at: '2026-10-26T09:00:00Z' },
          { id: '66666666-6666-6666-6666-666666666055', store_id: '11111111-1111-1111-1111-111111111102', store_name: 'BigBasket', current_price: 310.00, mrp: 360.00, is_in_stock: true, updated_at: '2026-10-26T10:00:00Z' },
          { id: '66666666-6666-6666-6666-666666666056', store_id: '11111111-1111-1111-1111-111111111104', store_name: 'Zepto', current_price: 345.00, mrp: 360.00, is_in_stock: true, updated_at: '2026-10-26T11:00:00Z' },
        ]
      }
    ]
  },
  {
    id: '44444444-4444-4444-4444-444444444015',
    name: 'Fresh Farm Onions (Pyaaz)',
    slug: 'fresh-farm-onions-pyaaz',
    category_id: '22222222-2222-2222-2222-222222222203',
    brand_id: null,
    description: 'Grade-A Nashik red onions fresh from mandis',
    image_url: 'https://images.unsplash.com/photo-1508747703725-719777637510?w=500',
    variants: [
      {
        id: '55555555-5555-5555-5555-555555555022',
        variant_name: '1 kg Net Bag',
        quantity: 1.0,
        unit: 'kg',
        is_default: true,
        listings: [
          { id: '66666666-6666-6666-6666-666666666065', store_id: '11111111-1111-1111-1111-111111111101', store_name: 'DMart Ready', current_price: 32.00, mrp: 45.00, is_in_stock: true, updated_at: '2026-10-26T06:00:00Z' },
          { id: '66666666-6666-6666-6666-666666666066', store_id: '11111111-1111-1111-1111-111111111102', store_name: 'BigBasket', current_price: 36.00, mrp: 45.00, is_in_stock: true, updated_at: '2026-10-26T07:00:00Z' },
          { id: '66666666-6666-6666-6666-666666666067', store_id: '11111111-1111-1111-1111-111111111103', store_name: 'Blinkit', current_price: 42.00, mrp: 45.00, is_in_stock: true, updated_at: '2026-10-26T08:00:00Z' },
        ]
      }
    ]
  },
  {
    id: '44444444-4444-4444-4444-444444444017',
    name: 'Tata Salt Vacuum Evaporated Iodised',
    slug: 'tata-salt-vacuum-evaporated-iodised',
    category_id: '22222222-2222-2222-2222-222222222209',
    brand_id: '33333333-3333-3333-3333-333333333304',
    description: 'Desh ka Namak — pure iodised white table salt',
    image_url: 'https://images.unsplash.com/photo-1518110925495-5fe2fda0442c?w=500',
    variants: [
      {
        id: '55555555-5555-5555-5555-555555555025',
        variant_name: '1 kg Pouch',
        quantity: 1.0,
        unit: 'kg',
        is_default: true,
        listings: [
          { id: '66666666-6666-6666-6666-666666666074', store_id: '11111111-1111-1111-1111-111111111101', store_name: 'DMart Ready', current_price: 26.00, mrp: 28.00, is_in_stock: true, updated_at: '2026-10-26T08:00:00Z' },
          { id: '66666666-6666-6666-6666-666666666075', store_id: '11111111-1111-1111-1111-111111111102', store_name: 'BigBasket', current_price: 27.00, mrp: 28.00, is_in_stock: true, updated_at: '2026-10-26T09:00:00Z' },
        ]
      }
    ]
  }
];

// Helper to query mock data
class MockDataService {
  static getStores() {
    return mockStores;
  }

  static getCategories() {
    return mockCategories;
  }

  static getBrands() {
    return mockBrands;
  }

  static getProducts({ category, brand, store, search, sort = 'price_asc' }) {
    let list = [...mockProducts];

    if (category) {
      list = list.filter((p) => p.category_id === category || p.category_slug === category);
    }
    if (brand) {
      list = list.filter((p) => p.brand_id === brand);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q)));
    }

    return list;
  }

  static getProductById(id) {
    return mockProducts.find((p) => p.id === id || p.slug === id) || null;
  }

  static getPriceHistory(variantId) {
    // Generate 6 realistic historical points
    const now = new Date();
    const basePrice = 180;
    const history = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 5 * 24 * 60 * 60 * 1000);
      const variation = Math.sin(i) * 12;
      history.push({
        price: Number((basePrice + variation).toFixed(2)),
        mrp: 230.00,
        observed_at: date.toISOString(),
        store_name: 'DMart Ready',
        store_slug: 'dmart',
      });
    }
    return history;
  }
}

module.exports = MockDataService;
