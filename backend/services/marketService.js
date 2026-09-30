const { apiKeys } = require("../config");

const FREE_NET = "https://api.freecryptoapi.com/v1";
const CACHE_TTL_MS = 60000;
const cacheStore = new Map();

const BINANCE_SYMBOL_MAP = {
  "BTC/USD": "BTCUSDT",
  "ETH/USD": "ETHUSDT",
  "SOL/USD": "SOLUSDT",
  "ADA/USD": "ADAUSDT",
  "XRP/USD": "XRPUSDT",
  "DOGE/USD": "DOGEUSDT",
  "LINK/USD": "LINKUSDT"
};

const BINANCE_INTERVAL_MAP = {
  "15min": "15m",
  "30min": "30m",
  "1h": "1h",
  "2h": "2h",
  "4h": "4h",
  "8h": "8h",
  "1day": "1d",
  "1week": "1w"
};

const NEWS_CACHE_MS = 5 * 60 * 1000;
const NEWS_FEEDS = [
  { source: "Cointelegraph", url: "https://cointelegraph.com/rss" },
  { source: "CoinDesk", url: "https://www.coindesk.com/arc/outboundfeeds/rss/" }
];
const NEWS_FALLBACK = [
  { source: "Candleflow", title: "Bitcoin holds above the $75k level as institutional inflows continue", link: "#news", pubDate: "", description: "Crypto markets are consolidating after a strong weekly close. Track live prices in the dashboard." },
  { source: "Candleflow", title: "Ethereum network activity picks up as staking deposits rise", link: "#news", pubDate: "", description: "On-chain metrics show growing usage ahead of anticipated network upgrades." },
  { source: "Candleflow", title: "Global equity indices edge higher on softer inflation data", link: "#news", pubDate: "", description: "US and European markets advanced as traders weighed fresh economic data." },
  { source: "Candleflow", title: "Gold steadies near recent highs as yields ease", link: "#news", pubDate: "", description: "Precious metals remain supported with real yields drifting lower." },
  { source: "Candleflow", title: "Demo trading 101: practice your strategy without the risk", link: "faq.html", pubDate: "", description: "Learn how Candleflow's demo account works and how to get the most from simulated funds." }
];

function cachedPromise(key, ttlMs, factory) {
  const hit = cacheStore.get(key);
  const now = Date.now();
  if (hit && now - hit.at < ttlMs) return hit.promise;
  const promise = factory().catch((error) => {
    cacheStore.delete(key);
    throw error;
  });
  cacheStore.set(key, { at: now, promise });
  return promise;
}

function cachedRates() {
  return cachedPromise("exchange-rates", CACHE_TTL_MS, async () => {
    const response = await fetch(`https://v6.exchangerate-api.com/v6/${apiKeys.exchangeRate}/latest/USD`);
    return response.json();
  });
}

async function exchangeRates() {
  return cachedRates();
}

async function binanceKlines(symbol, interval, limit = 200) {
  const binanceSymbol = BINANCE_SYMBOL_MAP[symbol];
  const binanceInterval = BINANCE_INTERVAL_MAP[interval];
  if (!binanceSymbol || !binanceInterval) return null;
  const params = new URLSearchParams({ symbol: binanceSymbol, interval: binanceInterval, limit: String(limit) });
  const response = await fetch(`https://api.binance.com/api/v3/klines?${params}`);
  if (!response.ok) return null;
  const rows = await response.json();
  if (!Array.isArray(rows)) return null;
  return {
    values: rows.map((row) => ({
      datetime: new Date(Number(row[0])).toISOString(),
      open: Number(row[1]),
      high: Number(row[2]),
      low: Number(row[3]),
      close: Number(row[4])
    }))
  };
}

async function fearGreedIndex() {
  return cachedPromise("fear-greed", CACHE_TTL_MS * 5, async () => {
    const response = await fetch("https://api.alternative.me/fng/?limit=1", {
      headers: { "Accept": "application/json" }
    });
    if (!response.ok) throw new Error("Fear and Greed API unavailable.");
    const payload = await response.json();
    const entry = payload?.data?.[0];
    if (!entry) throw new Error("Fear and Greed API returned no data.");
    return {
      value: Number(entry.value),
      classification: entry.value_classification,
      updated: entry.timestamp ? new Date(Number(entry.timestamp) * 1000).toISOString() : null
    };
  });
}

function stripHtml(value) {
  return String(value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function parseRss(xml, source) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null && items.length < 20) {
    const block = match[1];
    const tag = (name) => {
      const found = new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, "i").exec(block);
      return found ? found[1].trim() : "";
    };
    const title = stripHtml(tag("title"));
    const linkMatch = /<link[^>]*>([^<]*)<\/link>/i.exec(block);
    const link = linkMatch ? linkMatch[1].trim().replace(/&amp;/g, "&") : "";
    const pubDate = tag("pubDate");
    const description = stripHtml(tag("description")).slice(0, 280);
    if (!title || !link) continue;
    items.push({ source, title, link, pubDate, description });
  }
  return items;
}

async function fetchNews() {
  return cachedPromise("news", NEWS_CACHE_MS, async () => {
    const key = (process.env.FINNHUB_API_KEY || "").trim();
    if (!key) throw new Error("FINNHUB_API_KEY is not set.");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(
        "https://finnhub.io/api/v1/news?category=general",
        {
          headers: {
            "X-Finnhub-Token": key,
            "Accept": "application/json"
          },
          signal: controller.signal
        }
      );

      if (!response.ok) {
        throw new Error(`Finnhub returned HTTP ${response.status}.`);
      }

      const data = await response.json();
      if (!Array.isArray(data)) {
        throw new Error("Finnhub returned an unexpected news response.");
      }

      const articles = data
        .filter((item) => {
          if (!item || typeof item.headline !== "string" || !item.headline.trim()) {
            return false;
          }
          try {
            return /^https?:$/.test(new URL(item.url).protocol);
          } catch {
            return false;
          }
        })
        .sort((a, b) => Number(b.datetime || 0) - Number(a.datetime || 0))
        .slice(0, 12)
        .map((item) => {
          const timestamp = Number(item.datetime);
          return {
            source: item.source || "Market",
            title: item.headline.trim(),
            url: item.url,
            link: item.url,
            pubDate: Number.isFinite(timestamp) && timestamp > 0
              ? new Date(timestamp * 1000).toISOString()
              : "",
            description: stripHtml(item.summary).slice(0, 280)
          };
        });

      if (!articles.length) {
        throw new Error("Finnhub returned no usable headlines.");
      }

      return articles;
    } finally {
      clearTimeout(timeout);
    }
  });
}

async function fetchTwelve(path, query) {
  const params = new URLSearchParams({ ...query, apikey: apiKeys.twelveData });
  const response = await fetch(`https://api.twelvedata.com/${path}?${params}`);
  return response.json();
}

async function twelvePrice(symbol) {
  return fetchTwelve("price", { symbol });
}

async function twelveQuote(symbol) {
  return fetchTwelve("quote", { symbol });
}

async function twelveQuotes(symbols) {
  return cachedPromise(`quotes:${symbols}`, CACHE_TTL_MS, () => fetchTwelve("quote", { symbol: symbols }));
}

async function twelveTimeSeries(symbol, interval, outputsize) {
  return fetchTwelve("time_series", { symbol, interval, outputsize });
}

async function twelveSearch(query) {
  return fetchTwelve("symbol_search", { symbol: query });
}

async function freeCrypto(path, params) {
  const query = new URLSearchParams(params).toString();
  const url = params ? `${FREE_NET}/${path}?${query}` : `${FREE_NET}/${path}`;
  const response = await fetch(url, {
    headers: { "Authorization": `Bearer ${apiKeys.freeCrypto}` }
  });
  return response.json();
}

async function freeGetData(symbol) {
  let url;
  if (symbol.includes(",")) {
    const joined = symbol.split(",").map((s) => s.trim()).filter(Boolean).join("+");
    url = `${FREE_NET}/getData?symbol=${joined}`;
  } else {
    url = `${FREE_NET}/getData?symbol=${encodeURIComponent(symbol)}`;
  }
  const response = await fetch(url, {
    headers: { "Authorization": `Bearer ${apiKeys.freeCrypto}` }
  });
  return response.json();
}

async function freeConversion(from, to, amount) {
  return freeCrypto("getConversion", { from, to, amount });
}

async function freeFearGreed() {
  return freeCrypto("getFearGreed");
}

async function freeTechnical(symbol) {
  return freeCrypto("getTechnicalAnalysis", { symbol });
}

module.exports = {
  exchangeRates,
  binanceKlines,
  fearGreedIndex,
  fetchNews,
  fetchTwelve,
  twelvePrice,
  twelveQuote,
  twelveQuotes,
  twelveTimeSeries,
  twelveSearch,
  freeGetData,
  freeConversion,
  freeFearGreed,
  freeTechnical
};
