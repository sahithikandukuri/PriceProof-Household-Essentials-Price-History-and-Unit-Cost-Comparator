// PriceProof: Product Catalog Controller
const { supabase } = require('../config/supabase');
const MockDataService = require('../services/mockDataService');
const UnitCostService = require('../services/unitCostService');
const logger = require('../utils/logger');

class ProductController {
  /**
   * GET /api/categories
   */
  static async getCategories(req, res, next) {
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .order('display_order', { ascending: true });

        if (!error && data && data.length > 0) {
          return res.json({ success: true, count: data.length, data });
        }
      }
      // Fallback to seeded mock categories
      const fallback = MockDataService.getCategories();
      return res.json({ success: true, count: fallback.length, data: fallback });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/brands
   */
  static async getBrands(req, res, next) {
    try {
      if (supabase) {
        const { data, error } = await supabase.from('brands').select('*').order('name');
        if (!error && data && data.length > 0) {
          return res.json({ success: true, count: data.length, data });
        }
      }
      const fallback = MockDataService.getBrands();
      return res.json({ success: true, count: fallback.length, data: fallback });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/stores
   */
  static async getStores(req, res, next) {
    try {
      if (supabase) {
        const { data, error } = await supabase.from('stores').select('*').eq('is_active', true).order('name');
        if (!error && data && data.length > 0) {
          return res.json({ success: true, count: data.length, data });
        }
      }
      const fallback = MockDataService.getStores();
      return res.json({ success: true, count: fallback.length, data: fallback });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/products
   * Supports filtering, searching, sorting, and pagination
   */
  static async getProducts(req, res, next) {
    try {
      const {
        search,
        category,
        brand,
        store,
        minPrice,
        maxPrice,
        inStock,
        sort = 'price_asc',
        page = 1,
        limit = 24,
      } = req.query;

      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || 24));
      const from = (pageNum - 1) * pageSize;
      const to = from + pageSize - 1;

      if (supabase) {
        let query = supabase
          .from('products')
          .select(`
            id,
            name,
            slug,
            description,
            image_url,
            category_id,
            brand_id,
            categories (id, name, slug),
            brands (id, name, slug),
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
                stores (id, name, slug, logo_url)
              )
            )
          `, { count: 'exact' })
          .eq('is_active', true);

        if (search) {
          query = query.ilike('name', `%${search}%`);
        }
        if (category) {
          query = query.eq('category_id', category);
        }
        if (brand) {
          query = query.eq('brand_id', brand);
        }

        const { data, error, count } = await query.range(from, to);

        if (!error && data && data.length > 0) {
          // Process and calculate unit costs
          const formatted = data.map((product) => {
            const variants = (product.product_variants || []).map((v) => {
              const evaluated = UnitCostService.evaluateBestValue(
                (v.store_listings || []).map((l) => ({
                  id: l.id,
                  store_id: l.store_id,
                  store_name: l.stores?.name,
                  store_slug: l.stores?.slug,
                  current_price: l.current_price,
                  mrp: l.mrp,
                  is_in_stock: l.is_in_stock,
                  quantity: v.quantity,
                  unit: v.unit,
                }))
              );
              return {
                ...v,
                listings: evaluated.listings,
                lowestPrice: evaluated.listings.length > 0
                  ? Math.min(...evaluated.listings.map((l) => Number(l.current_price)))
                  : null,
              };
            });

            // Find lowest overall price and lowest unit cost across default/all variants
            let lowestOverallPrice = null;
            let lowestUnitCostDisplay = null;
            let storesCount = 0;

            const allListings = variants.flatMap((v) => v.listings || []);
            if (allListings.length > 0) {
              const prices = allListings.map((l) => Number(l.current_price)).filter((p) => p > 0);
              if (prices.length > 0) lowestOverallPrice = Math.min(...prices);

              const validUnitCosts = allListings.filter((l) => l.unitCost !== null);
              if (validUnitCosts.length > 0) {
                validUnitCosts.sort((a, b) => a.unitCost - b.unitCost);
                lowestUnitCostDisplay = validUnitCosts[0].formattedUnitCost;
              }
              const uniqueStores = new Set(allListings.map((l) => l.store_id));
              storesCount = uniqueStores.size;
            }

            return {
              id: product.id,
              name: product.name,
              slug: product.slug,
              description: product.description,
              image_url: product.image_url,
              category: product.categories,
              brand: product.brands,
              variants,
              lowestPrice: lowestOverallPrice,
              lowestUnitCost: lowestUnitCostDisplay,
              storesCompared: storesCount,
            };
          });

          // Sort in memory if needed
          if (sort === 'price_asc') {
            formatted.sort((a, b) => (a.lowestPrice || 999999) - (b.lowestPrice || 999999));
          } else if (sort === 'price_desc') {
            formatted.sort((a, b) => (b.lowestPrice || 0) - (a.lowestPrice || 0));
          } else if (sort === 'name_asc') {
            formatted.sort((a, b) => a.name.localeCompare(b.name));
          }

          return res.json({
            success: true,
            total: count || formatted.length,
            page: pageNum,
            limit: pageSize,
            data: formatted,
          });
        }
      }

      // Fallback to rich mock catalog data
      const mockRaw = MockDataService.getProducts({ category, brand, store, search, sort });
      const processed = mockRaw.map((p) => {
        const variants = (p.variants || []).map((v) => {
          const evalRes = UnitCostService.evaluateBestValue(
            (v.listings || []).map((l) => ({
              ...l,
              quantity: v.quantity,
              unit: v.unit,
            }))
          );
          return {
            ...v,
            listings: evalRes.listings,
          };
        });

        const allListings = variants.flatMap((v) => v.listings || []);
        const prices = allListings.map((l) => Number(l.current_price)).filter((x) => x > 0);
        const lowestPrice = prices.length ? Math.min(...prices) : null;
        const validCosts = allListings.filter((l) => l.unitCost !== null);
        const lowestUnitCost = validCosts.length ? validCosts.sort((a, b) => a.unitCost - b.unitCost)[0].formattedUnitCost : null;
        const storesCount = new Set(allListings.map((l) => l.store_id)).size;

        return {
          ...p,
          variants,
          lowestPrice,
          lowestUnitCost,
          storesCompared: storesCount,
        };
      });

      return res.json({
        success: true,
        total: processed.length,
        page: pageNum,
        limit: pageSize,
        data: processed,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/products/:id
   */
  static async getProductById(req, res, next) {
    try {
      const { id } = req.params;

      if (supabase) {
        const { data: product, error } = await supabase
          .from('products')
          .select(`
            id,
            name,
            slug,
            description,
            image_url,
            category_id,
            brand_id,
            categories (id, name, slug),
            brands (id, name, slug),
            product_variants (
              id,
              variant_name,
              quantity,
              unit,
              is_default,
              barcode,
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

        if (!error && product) {
          const variants = (product.product_variants || []).map((v) => {
            const evaluated = UnitCostService.evaluateBestValue(
              (v.store_listings || []).map((l) => ({
                id: l.id,
                store_id: l.store_id,
                store_name: l.stores?.name,
                store_slug: l.stores?.slug,
                store_logo: l.stores?.logo_url,
                delivery_charge: l.stores?.delivery_charge,
                min_free_delivery: l.stores?.min_free_delivery,
                current_price: l.current_price,
                mrp: l.mrp,
                is_in_stock: l.is_in_stock,
                last_checked_at: l.last_checked_at,
                quantity: v.quantity,
                unit: v.unit,
              }))
            );
            return {
              ...v,
              listings: evaluated.listings,
            };
          });

          return res.json({
            success: true,
            data: {
              ...product,
              variants,
            },
          });
        }
      }

      // Fallback
      const mockProduct = MockDataService.getProductById(id);
      if (!mockProduct) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }

      const variants = (mockProduct.variants || []).map((v) => {
        const evalRes = UnitCostService.evaluateBestValue(
          (v.listings || []).map((l) => ({ ...l, quantity: v.quantity, unit: v.unit }))
        );
        return { ...v, listings: evalRes.listings };
      });

      return res.json({
        success: true,
        data: {
          ...mockProduct,
          variants,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/featured/price-drops
   */
  static async getPriceDrops(req, res, next) {
    try {
      const productsRes = await MockDataService.getProducts({});
      const priceDrops = productsRes.slice(0, 4);
      return res.json({ success: true, data: priceDrops });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = ProductController;
