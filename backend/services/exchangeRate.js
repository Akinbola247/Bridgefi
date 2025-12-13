/**
 * Exchange Rate Service
 * Fetches real-time USDC/NGN exchange rates from multiple sources
 */

const axios = require('axios');

// Exchange rate cache
let rateCache = {
  usdcToNgn: null,
  ngnToUsdc: null,
  timestamp: null,
  source: null,
};

// Rate sources (fallback chain)
const RATE_SOURCES = [
  {
    name: 'Binance',
    url: 'https://api.binance.com/api/v3/ticker/price?symbol=USDTNGN',
    parse: (data) => parseFloat(data.price),
  },
  {
    name: 'CoinGecko',
    url: 'https://api.coingecko.com/api/v3/simple/price?ids=usd-coin&vs_currencies=ngn',
    parse: (data) => data['usd-coin']?.ngn,
  },
];

/**
 * Fetch USDC to NGN exchange rate
 */
async function fetchUSDCToNGNRate() {
  const margin = parseFloat(process.env.EXCHANGE_RATE_MARGIN || '0.02'); // 2% default margin

  for (const source of RATE_SOURCES) {
    try {
      const response = await axios.get(source.url, {
        timeout: 5000,
      });

      const baseRate = source.parse(response.data);
      if (baseRate && baseRate > 0) {
        // Add margin for profit
        const rateWithMargin = baseRate * (1 + margin);

        rateCache = {
          usdcToNgn: rateWithMargin,
          ngnToUsdc: 1 / rateWithMargin,
          timestamp: Date.now(),
          source: source.name,
        };

        console.log(`✅ Exchange rate updated from ${source.name}:`, {
          usdcToNgn: rateCache.usdcToNgn.toFixed(2),
          ngnToUsdc: rateCache.ngnToUsdc.toFixed(6),
        });

        return rateCache;
      }
    } catch (error) {
      console.warn(`⚠️ Failed to fetch rate from ${source.name}:`, error.message);
      continue;
    }
  }

  // If all sources fail, use fallback rate
  // if (!rateCache.usdcToNgn) {
  //   console.warn('⚠️ All rate sources failed, using fallback rate');
  //   rateCache = {
  //     usdcToNgn: 1500, // Fallback: 1 USDC = 1500 NGN
  //     ngnToUsdc: 1 / 1500,
  //     timestamp: Date.now(),
  //     source: 'fallback',
  //   };
  // }

  return rateCache;
}

/**
 * Get current USDC to NGN rate (from cache or fetch)
 */
async function getUSDCToNGNRate() {
  const cacheAge = Date.now() - (rateCache.timestamp || 0);
  const cacheMaxAge = parseInt(process.env.RATE_UPDATE_INTERVAL || '30000'); // 30 seconds default

  // Return cached rate if still fresh
  if (rateCache.usdcToNgn && cacheAge < cacheMaxAge) {
    return rateCache;
  }

  // Fetch new rate
  return await fetchUSDCToNGNRate();
}

/**
 * Initialize exchange rate service
 */
function initialize() {
  // Fetch initial rate
  fetchUSDCToNGNRate();

  // Set up periodic updates
  const updateInterval = parseInt(process.env.RATE_UPDATE_INTERVAL || '30000');
  setInterval(() => {
    fetchUSDCToNGNRate();
  }, updateInterval);

  console.log('📊 Exchange rate service initialized');
}

module.exports = {
  getUSDCToNGNRate,
  fetchUSDCToNGNRate,
  initialize,
};

