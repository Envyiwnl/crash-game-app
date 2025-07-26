const axios = require("axios");

// stores in cache memory prices, currency and timestamps
const priceCache = {};

const BASE_URL = process.env.CRYPTO_API_BASE_URL?.replace(/\/+$/, "") || "https://api.coingecko.com/api/v3";
const TTL_MS = (parseInt(process.env.PRICE_CACHE_TTL_SECONDS, 10) || 10) * 1000;

// Mapping API specific ids which are needed
const ID_MAP = {
  BTC: "bitcoin",
  ETH: "ethereum",
};

//Fetches fresh USD price for a given crypto symbol with a promise

async function fetchPrice(symbol) {
  const id = ID_MAP[symbol];
  if (!id) throw new Error(`Unsupported Currency ${symbol}`);

  try {
    const url = `${BASE_URL}/simple/price`;
    const params = { ids: id, vs_currencies: "usd" };

    const headers = {
      // CoinGecko politely asks for a User-Agent
      'Accept': 'application/json',
      'User-Agent': 'CryptoCrash/1.0 (+https://crash-bet.vercel.app/)'
    };

    // if you uses key based APIs uncomment below section:
    // if (process.env.CRYPTO_API_KEY) {
    //   params.apikey = process.env.CRYPTO_API_KEY;
    // }

    const { data } = await axios.get(url, { params });
    const price = data[id]?.usd;
    if (typeof price !== "number") {
      throw new Error(`Invalid Response for ${symbol} price`);
    }
    return price;
  } catch (err) {
    throw new Error(`Error fetching ${symbol} price: ${err.message}`);
  }
}

// Getting the USD price using 10 second time Cache

async function getPrice(symbol) {
  const entry = priceCache[symbol];
  const now = Date.now();

  if (entry && now - entry.timestamp < TTL_MS) {
    return entry.price;
  }

  const price = await fetchPrice(symbol);
  priceCache[symbol] = { price, timestamp: now };
  return price;
}

// Crypto to USD converter
async function convertCryptoToUsd(cryptoAmount, symbol) {
  if (typeof cryptoAmount !== "number" || cryptoAmount < 0) {
    throw new Error(`Invalid crypto amount: ${cryptoAmount}`);
  }
  const price = await getPrice(symbol);
  return cryptoAmount * price;
}

// USD to Crypto converter
async function convertUsdToCrypto(usdAmount, symbol) {
  if (typeof usdAmount !== "number" || usdAmount <= 0) {
    throw new Error(`Invalid USD amount: ${usdAmount}`);
  }
  const price = await getPrice(symbol);
  return usdAmount / price;
}

// Export Modules

module.exports = {
  getPrice,
  convertUsdToCrypto,
  convertCryptoToUsd,
};
