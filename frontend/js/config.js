// PriceProof: Client Configuration
const CONFIG = {
  API_BASE_URL: window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
    ? `${window.location.origin}/api`
    : '/api',
  CURRENCY_SYMBOL: '₹',
};

window.CONFIG = CONFIG;
