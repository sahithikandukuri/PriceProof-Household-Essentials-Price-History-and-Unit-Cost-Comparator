// PriceProof: Price-Drop Alerts & Notifications Controller
const { supabase } = require('../config/supabase');
const logger = require('../utils/logger');

class AlertController {
  /**
   * GET /api/alerts
   */
  static async getAlerts(req, res, next) {
    try {
      const userId = req.user.id;
      const client = req.supabase || supabase;

      const { data, error } = await client
        .from('price_alerts')
        .select(`
          id,
          variant_id,
          store_id,
          target_price,
          is_active,
          triggered_at,
          created_at,
          product_variants (
            variant_name,
            products (name, image_url)
          ),
          stores (name)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error fetching alerts', error);
        return res.json({ success: true, count: 0, data: [] });
      }

      const formatted = (data || []).map((a) => ({
        id: a.id,
        variantId: a.variant_id,
        targetPrice: Number(a.target_price),
        isActive: a.is_active,
        triggeredAt: a.triggered_at,
        createdAt: a.created_at,
        productName: a.product_variants?.products?.name || 'Product',
        variantName: a.product_variants?.variant_name || '',
        imageUrl: a.product_variants?.products?.image_url,
        storeName: a.stores?.name || 'Any Store',
      }));

      return res.json({ success: true, count: formatted.length, data: formatted });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/alerts
   */
  static async createAlert(req, res, next) {
    try {
      const userId = req.user.id;
      const { variant_id, store_id, target_price } = req.body;
      const client = req.supabase || supabase;

      if (!variant_id || !target_price || isNaN(Number(target_price)) || Number(target_price) <= 0) {
        return res.status(400).json({ success: false, message: 'Valid variant_id and positive target_price are required' });
      }

      const { data, error } = await client
        .from('price_alerts')
        .insert({
          user_id: userId,
          variant_id,
          store_id: store_id || null,
          target_price: Number(target_price),
          is_active: true,
        })
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
   * PATCH /api/alerts/:id
   */
  static async updateAlert(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { target_price, is_active } = req.body;
      const client = req.supabase || supabase;

      const updates = {};
      if (target_price !== undefined) updates.target_price = Number(target_price);
      if (is_active !== undefined) updates.is_active = Boolean(is_active);

      const { data, error } = await client
        .from('price_alerts')
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId)
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
   * DELETE /api/alerts/:id
   */
  static async deleteAlert(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const client = req.supabase || supabase;

      const { error } = await client
        .from('price_alerts')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) {
        return res.status(500).json({ success: false, message: error.message });
      }

      return res.json({ success: true, message: 'Alert deleted' });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/notifications
   */
  static async getNotifications(req, res, next) {
    try {
      const userId = req.user.id;
      const client = req.supabase || supabase;

      const { data, error } = await client
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) {
        return res.json({ success: true, count: 0, unreadCount: 0, data: [] });
      }

      const unreadCount = (data || []).filter((n) => !n.is_read).length;

      return res.json({
        success: true,
        count: (data || []).length,
        unreadCount,
        data: data || [],
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/notifications/:id/read
   */
  static async markNotificationRead(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const client = req.supabase || supabase;

      const { error } = await client
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id)
        .eq('user_id', userId);

      if (error) {
        return res.status(500).json({ success: false, message: error.message });
      }

      return res.json({ success: true, message: 'Notification marked as read' });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = AlertController;
