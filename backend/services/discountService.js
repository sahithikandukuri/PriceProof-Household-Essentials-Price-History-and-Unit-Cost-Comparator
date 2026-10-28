// PriceProof: Discount Transparency System
const { DISCOUNT_LABELS } = require('../config/constants');
const { formatINR } = require('../utils/currency');

class DiscountService {
  /**
   * Analyze the validity and context of an advertised discount against historical data
   * @param {number} currentPrice - Current listed selling price
   * @param {number|null} mrp - Maximum Retail Price printed on packaging
   * @param {Array<Object>} priceHistory - Array of past price observations [{ price: number, observed_at: string }]
   * @returns {Object} Full discount transparency breakdown
   */
  static analyzeDiscount(currentPrice, mrp, priceHistory = []) {
    const price = Number(currentPrice);
    const validHistory = Array.isArray(priceHistory)
      ? priceHistory.filter((h) => h && !isNaN(h.price) && Number(h.price) > 0)
      : [];

    // Calculate advertised discount from MRP
    let advertisedDiscountPercent = 0;
    let hasAdvertisedDiscount = false;
    if (mrp && Number(mrp) > price) {
      advertisedDiscountPercent = Number((((Number(mrp) - price) / Number(mrp)) * 100).toFixed(1));
      hasAdvertisedDiscount = true;
    }

    // If we have fewer than 2 distinct past price records, flag insufficient data
    if (validHistory.length < 2) {
      return {
        currentPrice: price,
        mrp: mrp ? Number(mrp) : null,
        advertisedDiscountPercent,
        hasAdvertisedDiscount,
        historicalAverage: price,
        lowestHistoricalPrice: price,
        highestHistoricalPrice: price,
        priceDifferenceFromAverage: 0,
        percentDifferenceFromAverage: 0,
        label: DISCOUNT_LABELS.INSUFFICIENT_DATA,
        explanation: 'Fewer than 2 historical records are available in PriceProof for this store listing. Historical trends cannot yet be established with statistical confidence.',
        observationsCount: validHistory.length,
      };
    }

    const prices = validHistory.map((h) => Number(h.price));
    const lowestHistoricalPrice = Math.min(...prices);
    const highestHistoricalPrice = Math.max(...prices);
    const sum = prices.reduce((acc, curr) => acc + curr, 0);
    const historicalAverage = Number((sum / prices.length).toFixed(2));

    const priceDifferenceFromAverage = Number((price - historicalAverage).toFixed(2));
    const percentDifferenceFromAverage = Number((((price - historicalAverage) / historicalAverage) * 100).toFixed(1));

    let label = DISCOUNT_LABELS.NEAR_TYPICAL;
    let explanation = '';

    // If current price is equal to or below the lowest price ever recorded
    if (price <= lowestHistoricalPrice) {
      label = DISCOUNT_LABELS.LOWEST_OBSERVED;
      explanation = `The current price (${formatINR(price)}) matches or beats the lowest observed price in our recorded history (${formatINR(lowestHistoricalPrice)}). Excellent time to purchase.`;
    } else if (percentDifferenceFromAverage <= -3.0) {
      label = DISCOUNT_LABELS.BELOW_AVERAGE;
      explanation = `The current price is ${Math.abs(percentDifferenceFromAverage)}% below the recorded historical average (${formatINR(historicalAverage)}). This offers real savings against normal pricing.`;
    } else if (percentDifferenceFromAverage >= 3.0) {
      label = DISCOUNT_LABELS.ABOVE_AVERAGE;
      explanation = `The current price is ${percentDifferenceFromAverage}% above its typical historical average (${formatINR(historicalAverage)}), despite any advertised discount claims.`;
    } else {
      label = DISCOUNT_LABELS.NEAR_TYPICAL;
      explanation = `The current price (${formatINR(price)}) is virtually identical to its typical recorded price (${formatINR(historicalAverage)}). The advertised discount reflects regular shelf pricing.`;
    }

    return {
      currentPrice: price,
      mrp: mrp ? Number(mrp) : null,
      advertisedDiscountPercent,
      hasAdvertisedDiscount,
      historicalAverage,
      lowestHistoricalPrice,
      highestHistoricalPrice,
      priceDifferenceFromAverage,
      percentDifferenceFromAverage,
      label,
      explanation,
      observationsCount: validHistory.length,
    };
  }
}

module.exports = DiscountService;
