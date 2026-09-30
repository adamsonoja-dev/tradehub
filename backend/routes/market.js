const market = require("../services/marketService");
const auth = require("../services/authService");

const TWELVE_SYMBOL_MAP = {
  "AAPL/USD": "AAPL",
  "MSFT/USD": "MSFT",
  "NVDA/USD": "NVDA",
  "AMZN/USD": "AMZN",
  "TSLA/USD": "TSLA",
  "US30/USD": "US30",
  "NQ/USD": "NAS100"
};

function isQuoteListItem(value) {
  return value && typeof value === "object" && typeof value.symbol === "string" && Number.isFinite(Number(value.close));
}

function isFlatQuote(data) {
  return data && typeof data === "object" && typeof data.symbol === "string" && typeof data.close === "string" && !(data.data && Array.isArray(data.data));
}

async function liveQuotes(symbolsParam) {
  const symbolsList = symbolsParam.split(",").map((s) => s.trim()).filter(Boolean);
  const twelveList = symbolsList.map((s) => TWELVE_SYMBOL_MAP[s] || s);
  const quotes = {};
  const BATCH_LIMIT = 8;

  for (let i = 0; i < twelveList.length; i += BATCH_LIMIT) {
    const batch = twelveList.slice(i, i + BATCH_LIMIT);
    const data = await market.twelveQuotes(batch.join(","));
    if (!data || typeof data !== "object") continue;
    if (data.code || Number.isFinite(Number(data.status))) continue;

    const entries = Array.isArray(data.data)
      ? Object.fromEntries((data.data || []).map((quote) => [quote.symbol, quote]))
      : isFlatQuote(data)
        ? { [data.symbol]: data }
        : data;

    for (const [twelveSymbol, value] of Object.entries(entries)) {
      if (typeof value !== "object" || !value || !isQuoteListItem(value)) continue;
      const internal = symbolsList.find((s) => (TWELVE_SYMBOL_MAP[s] || s) === value.symbol) || twelveSymbol;
      if (!quotes[internal]) {
        quotes[internal] = {
          symbol: value.symbol,
          name: value.name || internal,
          price: Number(value.close) || Number(value.previous_close) || 0,
          change: Number(value.percent_change) || 0,
          previous_close: Number(value.previous_close) || 0
        };
      }
    }
  }

  return quotes;
}

async function handle(request, response, requestUrl) {
  const { pathname, searchParams } = requestUrl;

  if (pathname === "/api/exchange-rates" && request.method === "GET") {
    try {
      const data = await market.exchangeRates();
      if (data.result !== "success") {
        return auth.sendJson(response, 502, { error: "Exchange rate API returned an error." });
      }
      return auth.sendJson(response, 200, { base: "USD", rates: data.conversion_rates || {}, updated: data.time_last_update_utc });
    } catch {
      return auth.sendJson(response, 502, { error: "Could not reach exchange rate API." });
    }
  }

  if (pathname === "/api/market/price" && request.method === "GET") {
    try {
      const symbol = searchParams.get("symbol") || "BTC/USD";
      const data = await market.twelvePrice(symbol);
      if (data.code) return auth.sendJson(response, 502, { error: data.message || "Twelve Data error." });
      return auth.sendJson(response, 200, { symbol, price: Number(data.price) });
    } catch {
      return auth.sendJson(response, 502, { error: "Could not reach Twelve Data API." });
    }
  }

  if (pathname === "/api/market/prices" && request.method === "GET") {
    try {
      const symbols = searchParams.get("symbols") || "BTC/USD,ETH/USD";
      const quotes = await liveQuotes(symbols);
      const normalized = {};
      const symbolList = symbols.split(",").map((s) => s.trim()).filter(Boolean);
      symbolList.forEach((symbol) => {
        const quote = quotes[symbol];
        if (quote && Number.isFinite(Number(quote.price))) {
          normalized[symbol] = { price: Number(quote.price), change: Number(quote.change) || 0 };
        }
      });
      return auth.sendJson(response, 200, normalized);
    } catch {
      return auth.sendJson(response, 502, { error: "Could not reach Twelve Data API." });
    }
  }

  if (pathname === "/api/market/quote" && request.method === "GET") {
    try {
      const symbol = searchParams.get("symbol") || "BTC/USD";
      const data = await market.twelveQuote(symbol);
      if (data.code) return auth.sendJson(response, 502, { error: data.message || "Twelve Data error." });
      return auth.sendJson(response, 200, data);
    } catch {
      return auth.sendJson(response, 502, { error: "Could not reach Twelve Data API." });
    }
  }

  if (pathname === "/api/market/batch-quotes" && request.method === "GET") {
    try {
      const symbols = searchParams.get("symbols") || "BTC/USD";
      const symbolList = symbols.split(",").map((s) => s.trim()).filter(Boolean);
      const results = {};
      await Promise.all(symbolList.map(async (symbol) => {
        try {
          const data = await market.twelveQuote(symbol);
          if (!data.code) {
            results[symbol] = {
              percent_change: Number(data.percent_change) || 0,
              price: Number(data.close) || 0,
              name: data.name || symbol
            };
          }
        } catch { /* skip failed symbol */ }
      }));
      return auth.sendJson(response, 200, results);
    } catch {
      return auth.sendJson(response, 502, { error: "Could not reach Twelve Data API." });
    }
  }

  if (pathname === "/api/market/live-quotes" && request.method === "GET") {
    try {
      const symbols = searchParams.get("symbols") || "AAPL/USD,MSFT/USD,NVDA/USD,AMZN/USD,TSLA/USD,XAU/USD,EUR/USD,GBP/USD,JPY/USD,USD/JPY";
      const quotes = await liveQuotes(symbols);
      return auth.sendJson(response, 200, { quotes, updated: new Date().toISOString() });
    } catch {
      return auth.sendJson(response, 502, { error: "Could not reach Twelve Data API." });
    }
  }

  if (pathname === "/api/market/time_series" && request.method === "GET") {
    try {
      const symbol = searchParams.get("symbol") || "BTC/USD";
      const interval = searchParams.get("interval") || "1day";
      const binance = await market.binanceKlines(symbol, interval);
      if (binance) return auth.sendJson(response, 200, binance);
      const data = await market.twelveTimeSeries(symbol, interval, 200);
      if (data.code) return auth.sendJson(response, 502, { error: data.message || "Twelve Data error." });
      return auth.sendJson(response, 200, data);
    } catch {
      return auth.sendJson(response, 502, { error: "Could not reach market data API." });
    }
  }

  if (pathname === "/api/market/search" && request.method === "GET") {
    try {
      const query = searchParams.get("q") || "";
      const data = await market.twelveSearch(query);
      if (data.code) return auth.sendJson(response, 502, { error: data.message || "Twelve Data error." });
      return auth.sendJson(response, 200, data);
    } catch {
      return auth.sendJson(response, 502, { error: "Could not reach Twelve Data API." });
    }
  }

  if (pathname === "/api/crypto/data" && request.method === "GET") {
    try {
      const symbol = searchParams.get("symbol") || "BTC";
      const data = await market.freeGetData(symbol);
      if (data.error) return auth.sendJson(response, 502, { error: data.error });
      return auth.sendJson(response, 200, data);
    } catch {
      return auth.sendJson(response, 502, { error: "Could not reach FreeCryptoAPI." });
    }
  }

  if (pathname === "/api/crypto/convert" && request.method === "GET") {
    try {
      const from = searchParams.get("from") || "BTC";
      const to = searchParams.get("to") || "USD";
      const amountNum = Number(searchParams.get("amount")) || 0;
      const fiatCurrencies = new Set(["USD", "EUR", "GBP", "JPY", "TRY"]);

      if (!fiatCurrencies.has(to)) {
        const data = await market.freeConversion(from, to, amountNum);
        if (data.error) return auth.sendJson(response, 502, { error: data.error });
        return auth.sendJson(response, 200, { from, to, amount: amountNum, result: Number(data.result) });
      }

      const payload = await market.freeGetData(from);
      const usdPrice = Number(payload?.symbols?.[0]?.last);
      let result = usdPrice * amountNum;
      if (to !== "USD") {
        const fx = await market.exchangeRates();
        const rate = fx?.conversion_rates?.[to];
        if (rate) result = result * rate;
      }
      return auth.sendJson(response, 200, { from, to, amount: amountNum, result });
    } catch {
      return auth.sendJson(response, 502, { error: "Could not reach FreeCryptoAPI." });
    }
  }

  if (pathname === "/api/crypto/fear-greed" && request.method === "GET") {
    try {
      const data = await market.fearGreedIndex();
      return auth.sendJson(response, 200, data);
    } catch {
      try {
        const data = await market.freeFearGreed();
        if (data.error) return auth.sendJson(response, 502, { error: data.error });
        return auth.sendJson(response, 200, data);
      } catch {
        return auth.sendJson(response, 502, { error: "Could not reach the Fear and Greed index." });
      }
    }
  }

  if (pathname === "/api/crypto/technical" && request.method === "GET") {
    try {
      const symbol = searchParams.get("symbol") || "BTC";
      const data = await market.freeTechnical(symbol);
      if (data.error) return auth.sendJson(response, 502, { error: data.error });
      return auth.sendJson(response, 200, data);
    } catch {
      return auth.sendJson(response, 502, { error: "Could not reach FreeCryptoAPI." });
    }
  }

  if (pathname === "/api/news" && request.method === "GET") {
    try {
      const articles = await market.fetchNews();
      return auth.sendJson(response, 200, { articles, updated: new Date().toISOString() });
    } catch {
      return auth.sendJson(response, 502, { error: "Could not load market news." });
    }
  }

  return false;
}

module.exports = { handle };
