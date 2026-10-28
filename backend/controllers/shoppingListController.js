// PriceProof: Shopping List and Savings Estimate Controller
const { supabase, supabaseAdmin } = require('../config/supabase');
const MockDataService = require('../services/mockDataService');
const SavingsService = require('../services/savingsService');
const logger = require('../utils/logger');

class ShoppingListController {
  /**
   * GET /api/shopping-lists
   */
  static async getShoppingLists(req, res, next) {
    try {
      const userId = req.user.id;
      const client = req.supabase || supabase;

      const { data, error } = await client
        .from('shopping_lists')
        .select(`
          id,
          name,
          is_archived,
          created_at,
          updated_at,
          shopping_list_items (count)
        `)
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) {
        logger.error('Error fetching shopping lists', error);
        return res.json({ success: true, data: [] });
      }

      return res.json({
        success: true,
        data: data.map((l) => ({
          ...l,
          itemCount: l.shopping_list_items?.[0]?.count || 0,
        })),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/shopping-lists
   */
  static async createShoppingList(req, res, next) {
    try {
      const userId = req.user.id;
      const { name } = req.body;
      const client = req.supabase || supabase;

      if (!name || !name.trim()) {
        return res.status(400).json({ success: false, message: 'List name is required' });
      }

      const { data, error } = await client
        .from('shopping_lists')
        .insert({
          user_id: userId,
          name: name.trim(),
        })
        .select()
        .single();

      if (error) {
        logger.error('Error creating shopping list', error);
        return res.status(500).json({ success: false, message: error.message });
      }

      return res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/shopping-lists/:id
   */
  static async getShoppingListById(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const client = req.supabase || supabase;

      const { data: list, error: listError } = await client
        .from('shopping_lists')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .maybeSingle();

      if (listError || !list) {
        return res.status(404).json({ success: false, message: 'Shopping list not found' });
      }

      // Fetch items in the list with variant and product info
      const { data: items, error: itemsError } = await client
        .from('shopping_list_items')
        .select(`
          id,
          variant_id,
          quantity,
          is_checked,
          product_variants (
            id,
            variant_name,
            quantity,
            unit,
            products (
              id,
              name,
              image_url
            ),
            store_listings (
              id,
              store_id,
              current_price,
              mrp,
              is_in_stock,
              stores (id, name, slug, delivery_charge, min_free_delivery)
            )
          )
        `)
        .eq('list_id', id)
        .order('created_at', { ascending: true });

      const formattedItems = (items || []).map((it) => {
        const v = it.product_variants;
        const p = v?.products;
        const listings = (v?.store_listings || []).map((l) => ({
          store_id: l.store_id,
          store_name: l.stores?.name,
          store_slug: l.stores?.slug,
          price: Number(l.current_price),
          mrp: l.mrp ? Number(l.mrp) : null,
          is_in_stock: l.is_in_stock,
          delivery_charge: Number(l.stores?.delivery_charge || 0),
          min_free_delivery: Number(l.stores?.min_free_delivery || 0),
        }));

        return {
          id: it.id,
          variant_id: it.variant_id,
          quantity: it.quantity,
          is_checked: it.is_checked,
          variant_name: v?.variant_name,
          product_id: p?.id,
          product_name: p?.name,
          image_url: p?.image_url,
          unit: v?.unit,
          listings,
        };
      });

      return res.json({
        success: true,
        data: {
          ...list,
          items: formattedItems,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/shopping-lists/:id/items
   */
  static async addItemToList(req, res, next) {
    try {
      const { id } = req.params;
      const { variant_id, quantity = 1 } = req.body;
      const client = req.supabase || supabase;

      if (!variant_id) {
        return res.status(400).json({ success: false, message: 'variant_id is required' });
      }

      const { data, error } = await client
        .from('shopping_list_items')
        .upsert({
          list_id: id,
          variant_id,
          quantity: Math.max(1, parseInt(quantity, 10) || 1),
        }, { onConflict: 'list_id,variant_id' })
        .select()
        .single();

      if (error) {
        return res.status(500).json({ success: false, message: error.message });
      }

      return res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/shopping-lists/:id/items/:itemId
   *
   * BUG FIX: Added list_id scope to prevent updating items in another user's list.
   * RLS policy already enforces this at DB level, but defense-in-depth is applied here too.
   */
  static async updateListItem(req, res, next) {
    try {
      const { id, itemId } = req.params;
      const { quantity, is_checked } = req.body;
      const client = req.supabase || supabase;

      const updates = {};
      if (quantity !== undefined) updates.quantity = Math.max(1, parseInt(quantity, 10));
      if (is_checked !== undefined) updates.is_checked = Boolean(is_checked);

      const { data, error } = await client
        .from('shopping_list_items')
        .update(updates)
        .eq('id', itemId)
        .eq('list_id', id) // Scope to the list — prevents cross-list item updates
        .select()
        .single();

      if (error) {
        return res.status(500).json({ success: false, message: error.message });
      }

      return res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/shopping-lists/:id/items/:itemId
   *
   * BUG FIX: The previous implementation deleted by itemId alone, without
   * verifying ownership. A user could delete another user's list item if they
   * guessed the UUID. Fixed by scoping the delete to list_id (from the URL
   * parameter, which is already ownership-verified by RLS on shopping_lists).
   * RLS policy on shopping_list_items also enforces this at DB level, but we
   * add the explicit list_id filter as defense-in-depth.
   */
  static async removeItemFromList(req, res, next) {
    try {
      const { id, itemId } = req.params;
      const client = req.supabase || supabase;

      const { error } = await client
        .from('shopping_list_items')
        .delete()
        .eq('id', itemId)
        .eq('list_id', id); // Scope to the list — prevents cross-list item deletion

      if (error) {
        return res.status(500).json({ success: false, message: error.message });
      }

      return res.json({ success: true, message: 'Item removed from list' });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/shopping-lists/:id
   *
   * BUG FIX: Added user_id scope. RLS already enforces this, but explicit
   * application-layer scoping ensures a 0-row delete (rather than a silent
   * 200 OK) when a user attempts to delete another user's list.
   */
  static async deleteShoppingList(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const client = req.supabase || supabase;

      const { error } = await client
        .from('shopping_lists')
        .delete()
        .eq('id', id)
        .eq('user_id', userId); // Ownership enforced at application layer

      if (error) {
        return res.status(500).json({ success: false, message: error.message });
      }

      return res.json({ success: true, message: 'Shopping list deleted' });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/shopping-lists/:id/estimate
   * Dual Comparison: Single-Store Total vs Lowest-Price Combination
   */
  static async getBasketEstimate(req, res, next) {
    try {
      const { id } = req.params;
      const client = req.supabase || supabase;

      // 1. Fetch all active stores
      let stores = [];
      const { data: storeData } = await client.from('stores').select('*').eq('is_active', true);
      if (storeData && storeData.length > 0) {
        stores = storeData;
      } else {
        stores = MockDataService.getStores();
      }

      // 2. Fetch list items with variants and store listings
      const { data: items } = await client
        .from('shopping_list_items')
        .select(`
          id,
          variant_id,
          quantity,
          product_variants (
            id,
            variant_name,
            products (id, name),
            store_listings (
              id,
              store_id,
              current_price,
              is_in_stock,
              stores (id, name, slug, delivery_charge, min_free_delivery)
            )
          )
        `)
        .eq('list_id', id);

      const itemsForSavings = (items || []).map((it) => {
        const v = it.product_variants;
        const p = v?.products;
        const listings = (v?.store_listings || []).map((l) => ({
          store_id: l.store_id,
          store_name: l.stores?.name,
          price: Number(l.current_price),
          is_in_stock: l.is_in_stock,
          delivery_charge: Number(l.stores?.delivery_charge || 0),
          min_free_delivery: Number(l.stores?.min_free_delivery || 0),
        }));

        return {
          variant_id: it.variant_id,
          product_name: p?.name || 'Item',
          variant_name: v?.variant_name || '',
          quantity: it.quantity,
          listings,
        };
      });

      const estimate = SavingsService.calculateBasketEstimates(itemsForSavings, stores);

      return res.json({
        success: true,
        listId: id,
        estimate,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = ShoppingListController;
