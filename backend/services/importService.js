// PriceProof: Provider Adapter & Automatic Data Import Engine
const logger = require('../utils/logger');
const UnitCostService = require('./unitCostService');
const AlertService = require('./alertService');

class ImportService {
  /**
   * Process a batch of grocery price records from a retailer feed or admin upload
   * @param {Object} supabase - Supabase client
   * @param {string} storeId - Retailer store UUID
   * @param {string} sourceName - Source tag (e.g. 'official_feed', 'partner_api', 'manual_import')
   * @param {Array<Object>} records - Raw items: [{ variant_id, current_price, mrp, is_in_stock, sku }]
   * @param {string|null} adminUserId - Admin executing the import
   */
  static async processBatchImport(supabase, storeId, sourceName, records = [], adminUserId = null) {
    if (!Array.isArray(records) || records.length === 0) {
      throw new Error('No records supplied in import payload');
    }

    // 1. Create Pending Import Job
    const { data: job, error: jobError } = await supabase
      .from('import_jobs')
      .insert({
        store_id: storeId,
        source_name: sourceName,
        status: 'processing',
        total_records: records.length,
        started_at: new Date().toISOString(),
        created_by: adminUserId,
      })
      .select()
      .single();

    if (jobError) {
      logger.error('Failed to initialize import job record', jobError);
      throw jobError;
    }

    let importedCount = 0;
    let failedCount = 0;
    const errors = [];

    for (let index = 0; index < records.length; index++) {
      const row = records[index];
      try {
        if (!row.variant_id) {
          throw new Error(`Row ${index + 1}: Missing variant_id`);
        }
        const price = Number(row.current_price);
        if (isNaN(price) || price < 0) {
          throw new Error(`Row ${index + 1}: Invalid current_price (${row.current_price})`);
        }
        const mrp = row.mrp !== undefined && row.mrp !== null ? Number(row.mrp) : null;
        if (mrp !== null && mrp < price) {
          throw new Error(`Row ${index + 1}: MRP (${mrp}) cannot be less than selling price (${price})`);
        }

        const isInStock = row.is_in_stock !== undefined ? Boolean(row.is_in_stock) : true;

        // Check if listing already exists
        const { data: existingListing } = await supabase
          .from('store_listings')
          .select('id, current_price, mrp')
          .eq('variant_id', row.variant_id)
          .eq('store_id', storeId)
          .maybeSingle();

        let listingId;

        if (existingListing) {
          listingId = existingListing.id;
          const oldPrice = Number(existingListing.current_price);

          // Update listing record
          await supabase
            .from('store_listings')
            .update({
              current_price: price,
              // Bug fix: Use explicit null check instead of falsy || to handle mrp=0 edge case
              mrp: (mrp !== null && mrp !== undefined) ? mrp : existingListing.mrp,
              is_in_stock: isInStock,
              sku: row.sku || null,
              last_checked_at: new Date().toISOString(),
            })
            .eq('id', listingId);

          // If price changed, append to price_history
          if (oldPrice !== price) {
            await supabase.from('price_history').insert({
              listing_id: listingId,
              price: price,
              // Bug fix: same null-safe pattern as store_listings update
              mrp: (mrp !== null && mrp !== undefined) ? mrp : existingListing.mrp,
              is_in_stock: isInStock,
              source: sourceName,
              observed_at: new Date().toISOString(),
            });

            // Trigger price drop alerts if price decreased
            if (price < oldPrice) {
              await AlertService.evaluatePriceDrop(supabase, row.variant_id, storeId, price);
            }
          }
        } else {
          // Insert new listing
          const { data: newListing, error: insertErr } = await supabase
            .from('store_listings')
            .insert({
              variant_id: row.variant_id,
              store_id: storeId,
              current_price: price,
              mrp: mrp,
              is_in_stock: isInStock,
              sku: row.sku || null,
              last_checked_at: new Date().toISOString(),
            })
            .select('id')
            .single();

          if (insertErr) throw insertErr;
          listingId = newListing.id;

          // Record initial price observation in history
          await supabase.from('price_history').insert({
            listing_id: listingId,
            price: price,
            mrp: mrp,
            is_in_stock: isInStock,
            source: sourceName,
            observed_at: new Date().toISOString(),
          });
        }

        importedCount++;
      } catch (rowErr) {
        failedCount++;
        errors.push(rowErr.message);
        logger.warn(`Import warning on row ${index + 1}`, { message: rowErr.message });
      }
    }

    // 2. Finalize Import Job Status
    const finalStatus = failedCount === records.length ? 'failed' : 'completed';
    const { data: updatedJob } = await supabase
      .from('import_jobs')
      .update({
        status: finalStatus,
        imported_records: importedCount,
        failed_records: failedCount,
        error_log: errors.length > 0 ? errors.slice(0, 50).join('\n') : null,
        completed_at: new Date().toISOString(),
      })
      .eq('id', job.id)
      .select()
      .single();

    return {
      jobId: job.id,
      status: finalStatus,
      total: records.length,
      imported: importedCount,
      failed: failedCount,
      errors: errors.slice(0, 10),
    };
  }
}

module.exports = ImportService;
