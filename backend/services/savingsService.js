// PriceProof: Shopping List and Savings Calculator Engine
const { formatINR } = require('../utils/currency');

class SavingsService {
  /**
   * Calculate shopping list totals and potential savings
   * @param {Array<Object>} items - Array of list items: [{ variant_id, quantity, variant_name, product_name, listings: [{ store_id, store_name, price, is_in_stock, delivery_charge, min_free_delivery }] }]
   * @param {Array<Object>} allStores - List of supported stores
   */
  static calculateBasketEstimates(items = [], allStores = []) {
    if (!Array.isArray(items) || items.length === 0) {
      return {
        itemCount: 0,
        singleStoreTotals: [],
        bestSingleStore: null,
        optimizedCombination: null,
        potentialSavings: 0,
        formattedSavings: '₹0.00',
      };
    }

    // 1. Single-Store Shopping Calculations
    const singleStoreEstimates = allStores.map((store) => {
      let subtotal = 0;
      let missingItemsCount = 0;
      const matchedItems = [];

      for (const item of items) {
        const itemQuantity = Number(item.quantity) || 1;
        const storeListing = (item.listings || []).find(
          (l) => l.store_id === store.id && l.is_in_stock
        );

        if (storeListing && storeListing.price > 0) {
          const itemCost = Number(storeListing.price) * itemQuantity;
          subtotal += itemCost;
          matchedItems.push({
            variant_id: item.variant_id,
            product_name: item.product_name,
            variant_name: item.variant_name,
            quantity: itemQuantity,
            unitPrice: storeListing.price,
            totalPrice: itemCost,
            available: true,
          });
        } else {
          missingItemsCount++;
          matchedItems.push({
            variant_id: item.variant_id,
            product_name: item.product_name,
            variant_name: item.variant_name,
            quantity: itemQuantity,
            unitPrice: 0,
            totalPrice: 0,
            available: false,
          });
        }
      }

      // Compute delivery fee
      const minFree = Number(store.min_free_delivery) || 0;
      const baseDelivery = Number(store.delivery_charge) || 0;
      const deliveryFee = subtotal >= minFree && minFree > 0 ? 0 : baseDelivery;
      const grandTotal = subtotal + deliveryFee;

      return {
        storeId: store.id,
        storeName: store.name,
        storeSlug: store.slug,
        subtotal: Number(subtotal.toFixed(2)),
        deliveryFee: Number(deliveryFee.toFixed(2)),
        grandTotal: Number(grandTotal.toFixed(2)),
        formattedGrandTotal: formatINR(grandTotal),
        matchedCount: items.length - missingItemsCount,
        missingCount: missingItemsCount,
        isComplete: missingItemsCount === 0,
        items: matchedItems,
      };
    });

    // Filter stores that have at least 1 item available
    const availableStoreEstimates = singleStoreEstimates.filter((s) => s.matchedCount > 0);

    // Identify Best Single Store (prioritizing 100% complete baskets, then lowest grand total)
    let bestSingleStore = null;
    const completeStores = availableStoreEstimates.filter((s) => s.isComplete);

    if (completeStores.length > 0) {
      completeStores.sort((a, b) => a.grandTotal - b.grandTotal);
      bestSingleStore = completeStores[0];
    } else if (availableStoreEstimates.length > 0) {
      availableStoreEstimates.sort((a, b) => b.matchedCount - a.matchedCount || a.grandTotal - b.grandTotal);
      bestSingleStore = availableStoreEstimates[0];
    }

    // 2. Lowest-Price Multi-Store Combination
    let comboSubtotal = 0;
    const combinationItems = [];

    for (const item of items) {
      const itemQuantity = Number(item.quantity) || 1;
      const availableListings = (item.listings || []).filter((l) => l.is_in_stock && l.price > 0);

      if (availableListings.length > 0) {
        availableListings.sort((a, b) => a.price - b.price);
        const cheapestListing = availableListings[0];
        const itemTotal = Number(cheapestListing.price) * itemQuantity;
        comboSubtotal += itemTotal;

        combinationItems.push({
          variant_id: item.variant_id,
          product_name: item.product_name,
          variant_name: item.variant_name,
          quantity: itemQuantity,
          storeId: cheapestListing.store_id,
          storeName: cheapestListing.store_name,
          unitPrice: cheapestListing.price,
          totalPrice: itemTotal,
          formattedTotal: formatINR(itemTotal),
        });
      } else {
        combinationItems.push({
          variant_id: item.variant_id,
          product_name: item.product_name,
          variant_name: item.variant_name,
          quantity: itemQuantity,
          storeId: null,
          storeName: 'Unavailable',
          unitPrice: 0,
          totalPrice: 0,
          formattedTotal: 'N/A',
        });
      }
    }

    const highestSingleStoreSubtotal = availableStoreEstimates.length > 0
      ? Math.max(...availableStoreEstimates.map((s) => s.subtotal))
      : comboSubtotal;

    const potentialSavings = Math.max(0, Number((highestSingleStoreSubtotal - comboSubtotal).toFixed(2)));

    return {
      itemCount: items.length,
      singleStoreTotals: availableStoreEstimates.sort((a, b) => a.grandTotal - b.grandTotal),
      bestSingleStore,
      optimizedCombination: {
        subtotal: Number(comboSubtotal.toFixed(2)),
        formattedSubtotal: formatINR(comboSubtotal),
        items: combinationItems,
      },
      highestSingleStoreSubtotal: Number(highestSingleStoreSubtotal.toFixed(2)),
      potentialSavings,
      formattedSavings: formatINR(potentialSavings),
      notice: 'Multi-store combination highlights raw item savings. Note that ordering across multiple stores may incur individual delivery fees per store.',
    };
  }
}

module.exports = SavingsService;
