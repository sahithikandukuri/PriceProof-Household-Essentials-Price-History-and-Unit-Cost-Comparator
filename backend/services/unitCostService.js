// PriceProof: Unit-Cost Calculation Engine
const { UNIT_BASE_MAPPING } = require('../config/constants');
const { formatINR } = require('../utils/currency');

class UnitCostService {
  /**
   * Convert any supported unit quantity into its canonical base unit
   * @param {number} quantity - Quantity of the package
   * @param {string} unit - Measurement unit ('g', 'kg', 'ml', 'l', 'piece', 'pack')
   * @returns {{ baseQuantity: number, baseUnit: string, baseLabel: string }}
   */
  static standardizeQuantity(quantity, unit) {
    if (quantity === null || quantity === undefined || isNaN(quantity)) {
      throw new Error('Quantity must be a valid positive number');
    }
    const numQty = Number(quantity);
    if (numQty <= 0) {
      throw new Error('Quantity must be greater than zero');
    }

    const cleanUnit = String(unit).toLowerCase().trim();
    const mapping = UNIT_BASE_MAPPING[cleanUnit];

    if (!mapping) {
      throw new Error(`Unsupported measurement unit: ${unit}. Supported units: ${Object.keys(UNIT_BASE_MAPPING).join(', ')}`);
    }

    const baseQuantity = Number((numQty * mapping.multiplier).toFixed(6));
    return {
      baseQuantity,
      baseUnit: mapping.base,
      baseLabel: mapping.label,
    };
  }

  /**
   * Calculate unit cost = selling_price / base_quantity
   * @param {number} sellingPrice - Current selling price in INR
   * @param {number} quantity - Packaging quantity
   * @param {string} unit - Packaging unit
   * @returns {{ unitCost: number, formattedUnitCost: string, baseUnit: string, baseLabel: string }}
   */
  static calculateUnitCost(sellingPrice, quantity, unit) {
    if (sellingPrice === null || sellingPrice === undefined || isNaN(sellingPrice)) {
      throw new Error('Selling price must be a valid number');
    }
    const price = Number(sellingPrice);
    if (price < 0) {
      throw new Error('Selling price cannot be negative');
    }

    const { baseQuantity, baseUnit, baseLabel } = this.standardizeQuantity(quantity, unit);

    if (baseQuantity <= 0) {
      throw new Error('Standardized quantity must be strictly greater than zero to prevent division by zero');
    }

    const unitCost = Number((price / baseQuantity).toFixed(4));
    const formattedUnitCost = `${formatINR(unitCost)}/${baseLabel}`;

    return {
      unitCost,
      formattedUnitCost,
      baseQuantity,
      baseUnit,
      baseLabel,
    };
  }

  /**
   * Verify whether two units belong to the same physical dimension
   * @param {string} unitA
   * @param {string} unitB
   * @returns {boolean}
   */
  static areUnitsCompatible(unitA, unitB) {
    const mapA = UNIT_BASE_MAPPING[String(unitA).toLowerCase().trim()];
    const mapB = UNIT_BASE_MAPPING[String(unitB).toLowerCase().trim()];
    if (!mapA || !mapB) return false;
    return mapA.base === mapB.base;
  }

  /**
   * Compare multiple store listings and identify the best unit value
   * @param {Array<Object>} listings - Store listings with current_price, quantity, unit
   */
  static evaluateBestValue(listings) {
    if (!Array.isArray(listings) || listings.length === 0) {
      return { listings: [], bestUnitCostListingId: null, lowestPriceListingId: null };
    }

    let minUnitCost = Infinity;
    let bestUnitCostListingId = null;
    let minPrice = Infinity;
    let lowestPriceListingId = null;

    const evaluated = listings.map((item) => {
      try {
        const { unitCost, formattedUnitCost, baseLabel } = this.calculateUnitCost(
          item.current_price,
          item.quantity,
          item.unit
        );

        const currentPrice = Number(item.current_price);
        if (unitCost < minUnitCost) {
          minUnitCost = unitCost;
          bestUnitCostListingId = item.id;
        }
        if (currentPrice < minPrice) {
          minPrice = currentPrice;
          lowestPriceListingId = item.id;
        }

        return {
          ...item,
          unitCost,
          formattedUnitCost,
          baseLabel,
        };
      } catch (err) {
        return {
          ...item,
          unitCost: null,
          formattedUnitCost: 'N/A',
          error: err.message,
        };
      }
    });

    return {
      listings: evaluated.map((item) => ({
        ...item,
        isBestUnitValue: item.id === bestUnitCostListingId,
        isLowestPrice: item.id === lowestPriceListingId,
      })),
      bestUnitCostListingId,
      lowestPriceListingId,
    };
  }
}

module.exports = UnitCostService;
