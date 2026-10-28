// PriceProof: Currency & Number Formatting Utilities

/**
 * Format a number as Indian Rupee (e.g. ₹1,249.50)
 * Uses Indian number system grouping: Lakhs and Crores
 */
function formatINR(amount, includeDecimals = true) {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '₹0.00';
  }

  const num = Number(amount);
  const fixed = num.toFixed(includeDecimals ? 2 : 0);
  const parts = fixed.split('.');
  let integerPart = parts[0];
  const decimalPart = parts[1] ? `.${parts[1]}` : '';

  // Format Indian comma style (last 3 digits, then groups of 2)
  const isNegative = integerPart.startsWith('-');
  if (isNegative) integerPart = integerPart.substring(1);

  let lastThree = integerPart.slice(-3);
  let otherNumbers = integerPart.slice(0, -3);
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }
  const formattedInteger = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;

  return `${isNegative ? '-' : ''}₹${formattedInteger}${decimalPart}`;
}

/**
 * Parse monetary inputs cleanly
 */
function parsePrice(val) {
  if (typeof val === 'number') return Math.max(0, val);
  if (!val) return 0;
  const cleaned = String(val).replace(/[^0-9.]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : Math.max(0, parsed);
}

module.exports = {
  formatINR,
  parsePrice,
};
