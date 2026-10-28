// PriceProof: Administrator Management Controller
const { supabaseAdmin } = require('../config/supabase');
const MockDataService = require('../services/mockDataService');
const ImportService = require('../services/importService');
const AlertService = require('../services/alertService');
const logger = require('../utils/logger');

class AdminController {
  /**
   * GET /api/admin/overview
   */
  static async getOverviewStats(req, res, next) {
    try {
      let totalProducts = 50;
      let totalBrands = 14;
      let totalStores = 8;
      let totalPriceRecords = 520;
      let activeAlerts = 0;

      if (supabaseAdmin) {
        const [p, b, s, ph, al] = await Promise.all([
          supabaseAdmin.from('products').select('*', { count: 'exact', head: true }),
          supabaseAdmin.from('brands').select('*', { count: 'exact', head: true }),
          supabaseAdmin.from('stores').select('*', { count: 'exact', head: true }),
          supabaseAdmin.from('price_history').select('*', { count: 'exact', head: true }),
          supabaseAdmin.from('price_alerts').select('*', { count: 'exact', head: true }).eq('is_active', true),
        ]);

        if (p.count) totalProducts = p.count;
        if (b.count) totalBrands = b.count;
        if (s.count) totalStores = s.count;
        if (ph.count) totalPriceRecords = ph.count;
        if (al.count) activeAlerts = al.count;
      }

      return res.json({
        success: true,
        stats: {
          totalProducts,
          totalBrands,
          totalStores,
          totalPriceRecords,
          activeAlerts,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/admin/products
   */
  static async createProduct(req, res, next) {
    try {
      const { name, slug, category_id, brand_id, description, image_url, variants } = req.body;
      const adminId = req.user.id;

      if (!name || !slug) {
        return res.status(400).json({ success: false, message: 'Product name and slug are required' });
      }

      // 1. Insert product
      const { data: product, error: pError } = await supabaseAdmin
        .from('products')
        .insert({
          name: name.trim(),
          slug: slug.trim().toLowerCase(),
          category_id: category_id || null,
          brand_id: brand_id || null,
          description: description || null,
          image_url: image_url || null,
        })
        .select()
        .single();

      if (pError) {
        return res.status(500).json({ success: false, message: pError.message });
      }

      // 2. Insert variants if supplied
      if (Array.isArray(variants) && variants.length > 0) {
        const variantPayloads = variants.map((v) => ({
          product_id: product.id,
          variant_name: v.variant_name,
          quantity: Number(v.quantity),
          unit: v.unit,
          is_default: Boolean(v.is_default),
        }));

        await supabaseAdmin.from('product_variants').insert(variantPayloads);
      }

      // 3. Record Audit Log
      await supabaseAdmin.from('admin_audit_logs').insert({
        admin_id: adminId,
        action: 'CREATE_PRODUCT',
        target_entity: 'products',
        entity_id: product.id,
        details: { name: product.name, slug: product.slug },
      });

      return res.status(201).json({ success: true, data: product });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/admin/prices
   * Record new price observation
   */
  static async recordPriceObservation(req, res, next) {
    try {
      const { variant_id, store_id, price, mrp, is_in_stock = true, source = 'manual_admin' } = req.body;
      const adminId = req.user.id;

      if (!variant_id || !store_id || price === undefined) {
        return res.status(400).json({ success: false, message: 'variant_id, store_id, and price are required' });
      }

      const numPrice = Number(price);
      const numMrp = mrp !== undefined && mrp !== null ? Number(mrp) : null;

      // 1. Check or upsert store listing
      const { data: listing, error: listErr } = await supabaseAdmin
        .from('store_listings')
        .upsert(
          {
            variant_id,
            store_id,
            current_price: numPrice,
            mrp: numMrp,
            is_in_stock: Boolean(is_in_stock),
            last_checked_at: new Date().toISOString(),
          },
          { onConflict: 'variant_id,store_id' }
        )
        .select()
        .single();

      if (listErr) {
        return res.status(500).json({ success: false, message: listErr.message });
      }

      // 2. Insert into price_history
      await supabaseAdmin.from('price_history').insert({
        listing_id: listing.id,
        price: numPrice,
        mrp: numMrp,
        is_in_stock: Boolean(is_in_stock),
        source,
        observed_at: new Date().toISOString(),
      });

      // 3. Evaluate alerts
      await AlertService.evaluatePriceDrop(supabaseAdmin, variant_id, store_id, numPrice);

      // 4. Audit Log
      await supabaseAdmin.from('admin_audit_logs').insert({
        admin_id: adminId,
        action: 'UPDATE_PRICE',
        target_entity: 'store_listings',
        entity_id: listing.id,
        details: { variant_id, store_id, price: numPrice, mrp: numMrp },
      });

      return res.json({ success: true, message: 'Price updated and history logged', listing });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/admin/audit-logs
   */
  static async getAuditLogs(req, res, next) {
    try {
      const { data, error } = await supabaseAdmin
        .from('admin_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        return res.json({ success: true, data: [] });
      }

      return res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/admin/import-jobs
   */
  static async getImportJobs(req, res, next) {
    try {
      const { data, error } = await supabaseAdmin
        .from('import_jobs')
        .select('*, stores (name, slug)')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        return res.json({ success: true, data: [] });
      }

      return res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/admin/import-jobs
   */
  static async triggerImportJob(req, res, next) {
    try {
      const { store_id, source_name, records } = req.body;
      const adminId = req.user.id;

      const result = await ImportService.processBatchImport(
        supabaseAdmin,
        store_id,
        source_name || 'admin_manual_feed',
        records || [],
        adminId
      );

      return res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = AdminController;
