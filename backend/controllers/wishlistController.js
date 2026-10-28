// PriceProof: Wishlist Controller
const { supabase } = require('../config/supabase');
const logger = require('../utils/logger');

class WishlistController {
  /**
   * GET /api/wishlist
   */
  static async getWishlist(req, res, next) {
    try {
      const userId = req.user.id;
      const client = req.supabase || supabase;

      const { data, error } = await client
        .from('wishlists')
        .select(`
          id,
          variant_id,
          created_at,
          product_variants (
            id,
            variant_name,
            quantity,
            unit,
            products (
              id,
              name,
              slug,
              image_url,
              categories (name)
            ),
            store_listings (
              id,
              current_price,
              mrp,
              is_in_stock,
              stores (name, slug)
            )
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error fetching wishlist', error);
        return res.json({ success: true, count: 0, data: [] });
      }

      const formatted = (data || []).map((w) => {
        const v = w.product_variants;
        const p = v?.products;
        const listings = v?.store_listings || [];
        const prices = listings.map((l) => Number(l.current_price)).filter((x) => x > 0);
        const lowestPrice = prices.length ? Math.min(...prices) : null;

        return {
          wishlistId: w.id,
          variantId: w.variant_id,
          variantName: v?.variant_name,
          productId: p?.id,
          productName: p?.name,
          productSlug: p?.slug,
          imageUrl: p?.image_url,
          categoryName: p?.categories?.name,
          quantity: v?.quantity,
          unit: v?.unit,
          lowestPrice,
          storeCount: listings.length,
          savedAt: w.created_at,
        };
      });

      return res.json({
        success: true,
        count: formatted.length,
        data: formatted,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/wishlist
   */
  static async addToWishlist(req, res, next) {
    try {
      const userId = req.user.id;
      const { variant_id } = req.body;
      const client = req.supabase || supabase;

      if (!variant_id) {
        return res.status(400).json({ success: false, message: 'variant_id is required' });
      }

      const { data, error } = await client
        .from('wishlists')
        .insert({
          user_id: userId,
          variant_id,
        })
        .select()
        .single();

      if (error) {
        // If already in wishlist, return success true
        if (error.code === '23505') {
          return res.json({ success: true, message: 'Item is already in your wishlist' });
        }
        return res.status(500).json({ success: false, message: error.message });
      }

      return res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/wishlist/:variantId
   */
  static async removeFromWishlist(req, res, next) {
    try {
      const userId = req.user.id;
      const { variantId } = req.params;
      const client = req.supabase || supabase;

      const { error } = await client
        .from('wishlists')
        .delete()
        .eq('user_id', userId)
        .eq('variant_id', variantId);

      if (error) {
        return res.status(500).json({ success: false, message: error.message });
      }

      return res.json({ success: true, message: 'Item removed from wishlist' });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = WishlistController;
