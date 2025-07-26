const axios = require('axios');

// In‑memory cache for prices
const priceCache = {};
const TTL_MS = (parseInt(process.env.PRICE_CACHE_TTL_SECONDS, 10) || 10) * 1000;

// CoinGecko base (public, no key)
const CG_BASE =
  process.env.CRYPTO_API_BASE_URL?.replace(/\/+$/, '') ||
  'https://api.coingecko.com/api/v3';

// Binance ticker endpoint if coingecko fails as a fallback
const BINANCE_URL = 'https://api.binance.com/api/v3/ticker/price';

// Map symbols to CoinGecko IDs
const ID_MAP = { BTC: 'bitcoin', ETH: 'ethereum' };

//Fetch fresh price from CoinGecko, with headers.

async function fetchPriceCG(symbol) {
  const id = ID_MAP[symbol];
  if (!id) throw new Error(`Unsupported currency ${symbol}`);

  const url = `${CG_BASE}/simple/price`;
  const params = { ids: id, vs_currencies: 'usd' };
  const headers = {
    Accept: 'application/json',
    'User-Agent': 'CryptoCrash/1.0 (+https://crash-bet.vercel.app)'
  };

  const { data } = await axios.get(url, { params, headers });
  const price = data[id]?.usd;
  if (typeof price !== 'number') {
    throw new Error(`Invalid CG response for ${symbol}`);
  }
  return price;
}

// Fetch fresh price from Binance as its does need headers.
async function fetchPriceBinance(symbol) {
  const pair = `${symbol}USDT`;
  const { data } = await axios.get(BINANCE_URL, { params: { symbol: pair } });
  const price = parseFloat(data.price);
  if (isNaN(price)) throw new Error(`Invalid Binance response for ${symbol}`);
  return price;
}

// Try CoinGecko, on 403 or network error fallback to Binance.
async function fetchPrice(symbol) {
  try {
    return await fetchPriceCG(symbol);
  } catch (err) {
    // Only log once per error
    console.warn(`CG fetch failed (${err.message}), falling back to Binance.`);
    return await fetchPriceBinance(symbol);
  }
}

// Cache‐aware price getter.
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

// Convert USD to crypto
async function convertUsdToCrypto(usdAmount, symbol) {
  if (typeof usdAmount !== 'number' || usdAmount <= 0) {
    throw new Error(`Invalid USD amount: ${usdAmount}`);
  }
  const price = await getPrice(symbol);
  return usdAmount / price;
}

// Convert crypto to USD
async function convertCryptoToUsd(cryptoAmount, symbol) {
  if (typeof cryptoAmount !== 'number' || cryptoAmount < 0) {
    throw new Error(`Invalid crypto amount: ${cryptoAmount}`);
  }
  const price = await getPrice(symbol);
  return cryptoAmount * price;
}

module.exports = {
  getPrice,
  convertUsdToCrypto,
  convertCryptoToUsd
};