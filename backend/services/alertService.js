// PriceProof: Price-Drop Alert and Notification Service
const logger = require('../utils/logger');
const { formatINR } = require('../utils/currency');

class AlertService {
  /**
   * Evaluate whether a newly observed price triggers user price alerts
   * @param {Object} supabase - Supabase client
   * @param {string} variantId - Product variant UUID
   * @param {string} storeId - Retailer store UUID
   * @param {number} newPrice - Newly recorded price
   * @param {string} productName - Display product name
   */
  static async evaluatePriceDrop(supabase, variantId, storeId, newPrice, productName = 'Saved Item') {
    try {
      if (!supabase || !variantId || isNaN(newPrice)) return [];

      // Query active alerts for this variant (either for this specific store or any store)
      let query = supabase
        .from('price_alerts')
        .select('id, user_id, target_price, store_id')
        .eq('variant_id', variantId)
        .eq('is_active', true);

      const { data: alerts, error } = await query;
      if (error) {
        logger.error('Error fetching price alerts for evaluation', error);
        return [];
      }

      if (!alerts || alerts.length === 0) return [];

      const triggeredAlerts = [];

      for (const alert of alerts) {
        // If alert specified a specific store, ensure it matches
        if (alert.store_id && alert.store_id !== storeId) {
          continue;
        }

        // Check target price condition: newPrice <= target_price
        if (Number(newPrice) <= Number(alert.target_price)) {
          const notificationTitle = `Price Drop Alert: ${productName}`;
          const notificationMsg = `Good news! ${productName} has dropped to ${formatINR(newPrice)}, which meets your target price of ${formatINR(alert.target_price)}.`;

          // Insert in-app notification
          const { error: notifError } = await supabase.from('notifications').insert({
            user_id: alert.user_id,
            alert_id: alert.id,
            title: notificationTitle,
            message: notificationMsg,
            is_read: false,
            metadata: {
              variant_id: variantId,
              store_id: storeId,
              observed_price: newPrice,
              target_price: alert.target_price,
            },
          });

          if (!notifError) {
            // Update triggered timestamp
            await supabase
              .from('price_alerts')
              .update({ triggered_at: new Date().toISOString() })
              .eq('id', alert.id);

            triggeredAlerts.push(alert.id);
            logger.info(`Triggered alert ${alert.id} for user ${alert.user_id}`);
          }
        }
      }

      return triggeredAlerts;
    } catch (err) {
      logger.error('Failed to evaluate price drop alerts', err);
      return [];
    }
  }
}

module.exports = AlertService;
