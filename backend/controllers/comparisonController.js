// PriceProof: Product Comparison & Price History Controller
const { supabase } = require('../config/supabase');
const MockDataService = require('../services/mockDataService');
const UnitCostService = require('../services/unitCostService');
const DiscountService = require('../services/discountService');
const logger = require('../utils/logger');

class ComparisonController {
  /**
   * GET /api/products/:id/compare
   * Comprehensive store comparison matrix for a product
   */
  static async compareProduct(req, res, next) {
    try {
      const { id } = req.params;

      // 1. Fetch product with variants and listings
      let product = null;

      if (supabase) {
        const { data, error } = await supabase
          .from('products')
          .select(`
            id,
            name,
            slug,
            image_url,
            categories (id, name),
            brands (id, name),
            product_variants (
              id,
              variant_name,
              quantity,
              unit,
              is_default,
              store_listings (
                id,
                store_id,
                current_price,
                mrp,
                is_in_stock,
                last_checked_at,
                stores (id, name, slug, logo_url, delivery_charge, min_free_delivery)
              )
            )
          `)
          .or(`id.eq.${id},slug.eq.${id}`)
          .maybeSingle();

        if (!error && data) product = data;
      }

      if (!product) {
        product = MockDataService.getProductById(id);
      }

      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found for comparison' });
      }

      // 2. Evaluate unit costs and matrix
      const comparisonMatrix = (product.product_variants || product.variants || []).map((variant) => {
        const listings = (variant.store_listings || variant.listings || []).map((l) => ({
          id: l.id,
          store_id: l.store_id || l.stores?.id,
          store_name: l.store_name || l.stores?.name,
          store_slug: l.store_slug || l.stores?.slug,
          store_logo: l.store_logo || l.stores?.logo_url,
          current_price: Number(l.current_price),
          mrp: l.mrp ? Number(l.mrp) : null,
          is_in_stock: l.is_in_stock,
          delivery_charge: l.delivery_charge || l.stores?.delivery_charge || 0,
          min_free_delivery: l.min_free_delivery || l.stores?.min_free_delivery || 0,
          last_checked_at: l.last_checked_at,
          quantity: variant.quantity,
          unit: variant.unit,
        }));

        const evaluation = UnitCostService.evaluateBestValue(listings);

        return {
          variant_id: variant.id,
          variant_name: variant.variant_name,
          quantity: variant.quantity,
          unit: variant.unit,
          is_default: variant.is_default,
          listings: evaluation.listings,
          bestUnitCostListingId: evaluation.bestUnitCostListingId,
          lowestPriceListingId: evaluation.lowestPriceListingId,
        };
      });

      return res.json({
        success: true,
        product: {
          id: product.id,
          name: product.name,
          slug: product.slug,
          image_url: product.image_url,
          category: product.categories || product.category,
          brand: product.brands || product.brand,
        },
        matrix: comparisonMatrix,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/products/variants/:variantId/history
   * Multi-store historical price series formatted for Chart.js
   */
  static async getProductHistory(req, res, next) {
    try {
      const { variantId } = req.params;
      const { range = '30d' } = req.query; // '7d', '30d', '3m', '6m', '1y', 'all'

      // Calculate date cutoff based on range
      const now = new Date();
      let days = 30;
      if (range === '7d') days = 7;
      else if (range === '30d') days = 30;
      else if (range === '3m') days = 90;
      else if (range === '6m') days = 180;
      else if (range === '1y') days = 365;
      else if (range === 'all') days = 1000;

      const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

      let observations = [];

      if (supabase) {
        // Fix: Supabase JS v2 does not support .eq('related_table.column', value) syntax.
        // The correct approach for filtering price_history by variant_id (which lives on
        // store_listings, not price_history directly) is to use the !inner join syntax to
        // restrict the join, then filter using the nested object path via .filter().
        const { data, error } = await supabase
          .from('price_history')
          .select(`
            id,
            price,
            mrp,
            observed_at,
            source,
            store_listings!inner (
              id,
              variant_id,
              stores (id, name, slug)
            )
          `)
          .filter('store_listings.variant_id', 'eq', variantId)
          .gte('observed_at', cutoffDate)
          .order('observed_at', { ascending: true });

        if (!error && data && data.length > 0) {
          observations = data.map((d) => ({
            id: d.id,
            price: Number(d.price),
            mrp: d.mrp ? Number(d.mrp) : null,
            observed_at: d.observed_at,
            store_name: d.store_listings?.stores?.name || 'Store',
            store_slug: d.store_listings?.stores?.slug || 'store',
          }));
        }
      }

      if (observations.length === 0) {
        // Fallback to realistic mock history
        observations = MockDataService.getPriceHistory(variantId);
      }

      // Group by store for Chart.js multi-line charts
      const storeMap = {};
      const allPrices = [];

      observations.forEach((obs) => {
        allPrices.push(obs.price);
        if (!storeMap[obs.store_name]) {
          storeMap[obs.store_name] = {
            store: obs.store_name,
            slug: obs.store_slug,
            dataPoints: [],
          };
        }
        storeMap[obs.store_name].dataPoints.push({
          x: obs.observed_at,
          y: obs.price,
        });
      });

      // Compute statistics
      const lowestRecorded = allPrices.length > 0 ? Math.min(...allPrices) : 0;
      const highestRecorded = allPrices.length > 0 ? Math.max(...allPrices) : 0;
      const avgRecorded = allPrices.length > 0
        ? Number((allPrices.reduce((a, b) => a + b, 0) / allPrices.length).toFixed(2))
        : 0;
      const latestRecorded = allPrices.length > 0 ? allPrices[allPrices.length - 1] : 0;
      const firstRecorded = allPrices.length > 0 ? allPrices[0] : 0;
      const percentChange = firstRecorded > 0
        ? Number((((latestRecorded - firstRecorded) / firstRecorded) * 100).toFixed(1))
        : 0;

      // Color palette for store lines in Chart.js
      const colors = ['#087F5B', '#20c997', '#E9A23B', '#339AF0', '#845EF7', '#F76707'];
      let colorIndex = 0;

      const datasets = Object.values(storeMap).map((s) => ({
        label: s.store,
        data: s.dataPoints,
        borderColor: colors[colorIndex % colors.length],
        backgroundColor: colors[colorIndex++ % colors.length] + '20',
        tension: 0.25,
        fill: false,
        pointRadius: 4,
        pointHoverRadius: 6,
      }));

      return res.json({
        success: true,
        variantId,
        range,
        statistics: {
          lowestRecorded,
          highestRecorded,
          averageRecorded: avgRecorded,
          latestRecorded,
          percentChange,
          totalObservations: observations.length,
        },
        chartData: {
          datasets,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/products/variants/:variantId/value-analysis
   * Discount evaluation and transparent historical benchmark
   */
  static async getValueAnalysis(req, res, next) {
    try {
      const { variantId } = req.params;

      let currentPrice = 175;
      let mrp = 230;
      let priceHistory = [];

      if (supabase) {
        // Fetch current listing
        const { data: listing } = await supabase
          .from('store_listings')
          .select('current_price, mrp, id')
          .eq('variant_id', variantId)
          .order('current_price', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (listing) {
          currentPrice = Number(listing.current_price);
          mrp = listing.mrp ? Number(listing.mrp) : null;

          const { data: history } = await supabase
            .from('price_history')
            .select('price, observed_at')
            .eq('listing_id', listing.id)
            .order('observed_at', { ascending: true });

          if (history) priceHistory = history;
        }
      }

      if (priceHistory.length === 0) {
        priceHistory = MockDataService.getPriceHistory(variantId);
      }

      const analysis = DiscountService.analyzeDiscount(currentPrice, mrp, priceHistory);

      return res.json({
        success: true,
        variantId,
        analysis,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = ComparisonController;
