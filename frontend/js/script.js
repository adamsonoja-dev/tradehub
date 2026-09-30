document.addEventListener("DOMContentLoaded", () => {
    const chartContainer = document.getElementById("priceChart");
    if (!chartContainer) return;

    const chart = LightweightCharts.createChart(chartContainer, {
      width: chartContainer.clientWidth,
      height: chartContainer.clientHeight || 340,
      layout: {
        background: { color: "#0a1017" },
        textColor: "#8d99a7"
      },
      grid: {
        vertLines: { color: "#1b2833" },
        horzLines: { color: "#1b2833" }
      },
      rightPriceScale: { borderColor: "#202b36" },
      timeScale: { borderColor: "#202b36", timeVisible: true }
    });

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: "#3daf8b",
      downColor: "#cf5b68",
      borderUpColor: "#3daf8b",
      borderDownColor: "#cf5b68",
      wickUpColor: "#3daf8b",
      wickDownColor: "#cf5b68"
    });

    const marketCategories = {
      crypto: ["BTC/USD", "ETH/USD", "SOL/USD", "ADA/USD", "XRP/USD", "DOGE/USD", "LINK/USD"],
      stocks: ["AAPL/USD", "MSFT/USD", "NVDA/USD", "AMZN/USD", "TSLA/USD"],
      fx: ["XAU/USD", "EUR/USD", "GBP/USD", "JPY/USD", "USD/JPY", "US30/USD", "NQ/USD"]
    };

    const marketData = {
      "BTC/USD": { category: "crypto", name: "Bitcoin", price: 117842.5, change: 2.41, data: [] },
      "ETH/USD": { category: "crypto", name: "Ethereum", price: 4201, change: 1.82, data: [] },
      "SOL/USD": { category: "crypto", name: "Solana", price: 168.24, change: 3.15, data: [] },
      "ADA/USD": { category: "crypto", name: "Cardano", price: 0.74, change: 1.67, data: [] },
      "XRP/USD": { category: "crypto", name: "Ripple", price: 0.62, change: 2.09, data: [] },
      "DOGE/USD": { category: "crypto", name: "Dogecoin", price: 0.18, change: 3.42, data: [] },
      "LINK/USD": { category: "crypto", name: "Chainlink", price: 18.42, change: 1.96, data: [] },
      "AAPL/USD": { category: "stocks", name: "Apple", price: 214.18, change: 1.12, data: [] },
      "MSFT/USD": { category: "stocks", name: "Microsoft", price: 438.91, change: 0.96, data: [] },
      "NVDA/USD": { category: "stocks", name: "NVIDIA", price: 129.34, change: 2.64, data: [] },
      "AMZN/USD": { category: "stocks", name: "Amazon", price: 196.41, change: 1.31, data: [] },
      "TSLA/USD": { category: "stocks", name: "Tesla", price: 248.77, change: -1.04, data: [] },
      "XAU/USD": { category: "fx", name: "Gold", price: 3342, change: -0.34, data: [] },
      "EUR/USD": { category: "fx", name: "Euro / Dollar", price: 1.1682, change: 0.21, data: [] },
      "GBP/USD": { category: "fx", name: "Pound / Dollar", price: 1.2814, change: 0.44, data: [] },
      "JPY/USD": { category: "fx", name: "Yen / Dollar", price: 0.0068, change: -0.18, data: [] },
      "USD/JPY": { category: "fx", name: "Dollar / Yen", price: 146.42, change: 0.18, data: [] },
      "US30/USD": { category: "fx", name: "Dow Jones", price: 42180, change: 0.42, data: [] },
      "NQ/USD": { category: "fx", name: "Nasdaq 100", price: 19870, change: 1.34, data: [] }
    };

    const state = {
      selectedMarket: "BTC/USD",
      selectedMarketCategory: "crypto",
      selectedTimeframe: "1D",
      selectedTradeType: null,
      selectedOrderType: "market",
      accountMode: "demo",
      openTrades: [],
      account: { mode: "demo", balance: 0, trades: [], tradesClosed: [], transactions: [] },
      adminAccounts: [
        { name: "Admin User", email: "admin@candleflow.io", role: "Admin", created: "2026-09-02" },
        { name: "Nia Patel", email: "nia@candleflow.io", role: "Trader", created: "2026-09-01" },
        { name: "Carlos Ruiz", email: "carlos@candleflow.io", role: "Trader", created: "2026-08-30" }
      ],
      adminTradeHistory: [],
      user: {
        name: "Trader",
        email: "trader@candleflow.io",
        role: "Trader",
        isLoggedIn: false
      }
    };

    const $ = (id) => document.getElementById(id);

    function showToast(message, type = "info", duration = 4200) {
      const container = document.getElementById("toastContainer");
      if (!container) return;
      const toast = document.createElement("div");
      toast.className = `toast toast-${type}`;
      const icon = type === "success" ? "✓" : type === "error" ? "!" : "i";
      toast.innerHTML = `<span class="toast-icon">${icon}</span><span>${message}</span>`;
      container.appendChild(toast);
      setTimeout(() => {
        toast.classList.add("toast-leaving");
        setTimeout(() => toast.remove(), 260);
      }, duration);
    }
    const chartTitle = $("chartTitle");
    const chartPrice = $("chartPrice");
    const marketsList = $("marketsList");
    const marketWatchGrid = $("marketWatchGrid");
    const tradesBody = $("tradesBody");
    const adminAccountsBody = $("adminAccountsBody");
    const adminTradesBody = $("adminTradesBody");
    const adminPanel = $("adminPanel");
    const adminTotalAccounts = $("adminTotalAccounts");
    const adminActiveAccounts = $("adminActiveAccounts");
    const adminTradeVolume = $("adminTradeVolume");
    const authModal = $("authModal");
    const authTabs = document.querySelectorAll(".auth-tab");
    const authForms = document.querySelectorAll(".auth-form");
    const userName = $("userName");
    const userInitial = $("userInitial");
    const authToggle = $("authToggle");
    const sessionBadge = $("sessionBadge");
    const logoutBtn = $("logoutBtn");
    const lastUpdated = $("lastUpdated");
    const lotSizeInput = $("lotSize");
    const tradePairSelect = $("tradePair");
    const orderTypeMarket = $("orderTypeMarket");
    const orderTypeLimit = $("orderTypeLimit");
    const entryPriceInput = $("entryPrice");
    const entryPriceWrap = $("entryPriceWrap");
    const buyButton = $("buyButton");
    const sellButton = $("sellButton");
    const placeTradeButton = $("placeTradeButton");
    const fullscreenChartBtn = $("fullscreenChartBtn");
    const chartPanel = document.querySelector(".chart-panel");
    const balanceValue = $("balanceValue");
    const equityValue = $("equityValue");
    const todayPnL = $("todayPnL");
    const fundingBalance = $("fundingBalance");
    const fundingModeLabel = $("fundingModeLabel");
    const fundingAmount = $("fundingAmount");
    const fundingNote = $("fundingNote");
    const potentialLoss = $("potentialLoss");
    const potentialProfit = $("potentialProfit");
    const pipValue = $("pipValue");
    const previewNote = $("previewNote");
    const stopLossInput = $("stopLoss");
    const takeProfitInput = $("takeProfit");
    const marketPulse = $("marketPulse");
    const convertAmount = $("convertAmount");
    const convertFrom = $("convertFrom");
    const convertTo = $("convertTo");
    const convertResult = $("convertResult");
    const convertButton = $("convertButton");
    const convertNote = $("convertNote");
    const tradeConfirmModal = $("tradeConfirmModal");
    const tradeConfirmDetails = $("tradeConfirmDetails");
    const tradeConfirmSubmit = $("tradeConfirmSubmit");
    const tradeConfirmClose = $("tradeConfirmClose");
    const tradeConfirmCancel = $("tradeConfirmCancel");
    const chartLoader = $("chartLoader");
    const COINBASE_WS = "wss://ws-feed.exchange.coinbase.com";
    let marketSocket = null;
    const realtimePairs = new Set(["BTC/USD", "ETH/USD"]);
    const TIMEFRAME_INTERVALS = { "15m": "15min", "1H": "1h", "4H": "4h", "1D": "1day", "1W": "1week" };
    const TWELVE_SYMBOL_MAP = {
      "AAPL/USD": "AAPL",
      "MSFT/USD": "MSFT",
      "NVDA/USD": "NVDA",
      "AMZN/USD": "AMZN",
      "TSLA/USD": "TSLA"
    };

    function formatPrice(value) {
      if (value < 2) return value.toFixed(4);
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(value);
    }

    function formatCompactPrice(pair) {
      const price = marketData[pair]?.price ?? 0;
      if (["EUR/USD", "GBP/USD", "JPY/USD", "USD/JPY"].includes(pair)) return Number(price).toFixed(4);
      if (pair.includes("USD") && price < 100) return `$${Number(price).toFixed(2)}`;
      return `$${Number(price).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
    }

    function getPipSize(pair) {
      if (pair.includes("JPY")) return 0.01;
      if (["EUR/USD", "GBP/USD"].includes(pair)) return 0.0001;
      return 0.01;
    }

    function getContractSize(pair) {
      if (["EUR/USD", "GBP/USD", "JPY/USD", "USD/JPY"].includes(pair)) return 100000;
      if (pair === "XAU/USD") return 100;
      return 1;
    }

    function calculateTradePreview() {
      if (!tradePairSelect || !lotSizeInput) return { potentialProfit: 0, potentialLoss: 0, valuePerPip: 0, entryPrice: 0 };
      const pair = tradePairSelect.value;
      const lotSize = Number(lotSizeInput.value);
      let entryPrice = marketData[pair]?.price || 0;
      if (state.selectedOrderType === "limit") {
        const manualPrice = Number(entryPriceInput?.value);
        if (manualPrice > 0) entryPrice = manualPrice;
      }
      const stopLoss = Number(stopLossInput?.value);
      const takeProfit = Number(takeProfitInput?.value);
      const pipSize = getPipSize(pair);
      const valuePerPip = lotSize > 0 ? getContractSize(pair) * pipSize * lotSize : 0;
      const lossPips = stopLoss > 0 ? Math.abs(entryPrice - stopLoss) / pipSize : 0;
      const profitPips = takeProfit > 0 ? Math.abs(takeProfit - entryPrice) / pipSize : 0;
      const loss = valuePerPip * lossPips;
      const profit = valuePerPip * profitPips;

      if (potentialLoss) potentialLoss.textContent = loss ? `-$${loss.toFixed(2)}` : "$0.00";
      if (potentialProfit) potentialProfit.textContent = profit ? `+$${profit.toFixed(2)}` : "$0.00";
      if (pipValue) pipValue.textContent = `$${valuePerPip.toFixed(2)} / pip`;
      if (previewNote) previewNote.textContent = `${pair} uses a ${pipSize} pip size at ${lotSize || 0} lot(s).`;
      return { potentialProfit: profit, potentialLoss: loss, valuePerPip, entryPrice };
    }

    function calculateTradePnL(trade) {
      const currentPrice = marketData[trade.market]?.price || trade.currentPrice || trade.entryPrice;
      const pipSize = getPipSize(trade.market);
      const pipVal = getContractSize(trade.market) * pipSize * Number(trade.lotSize || 0);
      const direction = trade.type === "BUY" ? 1 : -1;
      return { currentPrice, pl: ((currentPrice - trade.entryPrice) / pipSize) * pipVal * direction };
    }

    function createCandles(basePrice, count, volatility, symbol) {
      const output = [];
      const now = new Date();
      let current = basePrice * 0.96;
      const fxPairs = ["EUR/USD", "GBP/USD", "JPY/USD", "USD/JPY"];

      for (let i = count; i >= 1; i -= 1) {
        const time = new Date(now.getTime() - i * 86400000);
        const open = current;
        const drift = (Math.random() - 0.5) * volatility;
        const close = Math.max(0.01, open + drift);
        const high = Math.max(open, close) + Math.random() * volatility * 0.7;
        const low = Math.min(open, close) - Math.random() * volatility * 0.7;
        const decimals = fxPairs.includes(symbol) ? 4 : 2;

        output.push({
          time: time.toISOString().slice(0, 10),
          open: Number(open.toFixed(decimals)),
          high: Number(high.toFixed(decimals)),
          low: Number(low.toFixed(decimals)),
          close: Number(close.toFixed(decimals))
        });
        current = close;
      }

      return output;
    }

    function seedMarketData() {
      const snapshots = {
        "BTC/USD": { base: 117842.5, volatility: 2800 },
        "ETH/USD": { base: 4201, volatility: 160 },
        "SOL/USD": { base: 168.24, volatility: 8 },
        "ADA/USD": { base: 0.74, volatility: 0.06 },
        "XRP/USD": { base: 0.62, volatility: 0.05 },
        "DOGE/USD": { base: 0.18, volatility: 0.02 },
        "LINK/USD": { base: 18.42, volatility: 1.2 },
        "AAPL/USD": { base: 214.18, volatility: 7 },
        "MSFT/USD": { base: 438.91, volatility: 9 },
        "NVDA/USD": { base: 129.34, volatility: 5 },
        "AMZN/USD": { base: 196.41, volatility: 6 },
        "TSLA/USD": { base: 248.77, volatility: 12 },
        "XAU/USD": { base: 3342, volatility: 90 },
        "EUR/USD": { base: 1.1682, volatility: 0.0085 },
        "GBP/USD": { base: 1.2814, volatility: 0.009 },
        "JPY/USD": { base: 0.0068, volatility: 0.0006 },
        "USD/JPY": { base: 146.42, volatility: 2.4 },
        "US30/USD": { base: 42180, volatility: 600 },
        "NQ/USD": { base: 19870, volatility: 390 }
      };

      Object.entries(snapshots).forEach(([pair, values]) => {
        marketData[pair].data = createCandles(values.base, 25, values.volatility, pair);
        marketData[pair].price = marketData[pair].data[marketData[pair].data.length - 1].close;
      });
    }

    function isIntradayInterval(interval) {
      return ["1min", "5min", "15min", "30min", "45min", "1h", "2h", "4h", "8h"].includes(interval);
    }

    function parseCandleTime(datetime) {
      if (typeof datetime !== "string" || !datetime) return null;

      const timestamp = Math.floor(new Date(datetime).getTime() / 1000);
      return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : null;
    }

    function getCurrentCandleTime(timeframe) {
      const interval = TIMEFRAME_INTERVALS[timeframe] || "1day";

      if (!isIntradayInterval(interval)) {
        const now = new Date();
        return Math.floor(Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate()
        ) / 1000);
      }

      const now = Date.now();
      let ms;

      switch (interval) {
        case "1min": ms = 60000; break;
        case "5min": ms = 300000; break;
        case "15min": ms = 900000; break;
        case "30min": ms = 1800000; break;
        case "1h": ms = 3600000; break;
        case "4h": ms = 14400000; break;
        default: ms = 86400000;
      }

      return Math.floor((now - (now % ms)) / 1000);
    }

    async function fetchTimeSeriesData(symbol, timeframe, fitContent = true) {
      const interval = TIMEFRAME_INTERVALS[timeframe] || "1day";
      const apiSymbol = TWELVE_SYMBOL_MAP[symbol] || symbol;
      if (marketData[symbol].data.length === 0 && chartLoader) chartLoader.classList.remove("hidden");
      try {
        const response = await fetch(`/api/market/time_series?symbol=${encodeURIComponent(apiSymbol)}&interval=${interval}`);
        if (!response.ok) throw new Error("Time series request failed.");
        const payload = await response.json();
        if (payload.code || !payload.values) throw new Error(payload.message || "Invalid time series response.");

        const candles = payload.values
          .map((entry) => ({
            time: parseCandleTime(entry.datetime, interval),
            open: Number(entry.open),
            high: Number(entry.high),
            low: Number(entry.low),
            close: Number(entry.close)
          }))
          .filter((c) => Number.isFinite(c.open) && Number.isFinite(c.high) && Number.isFinite(c.low) && Number.isFinite(c.close));

        if (candles.length > 0) {
          marketData[symbol].data = candles;
          marketData[symbol].price = candles[candles.length - 1].close;
        }

        updateChart({ fitContent });
        renderMarketsList();
        renderMarketWatchGrid();
      } catch (error) {
        console.warn("Time series fetch failed, keeping existing chart data.", error);
      } finally {
        if (chartLoader) chartLoader.classList.add("hidden");
      }
    }

    function updateChart({ fitContent = true } = {}) {
      const selected = marketData[state.selectedMarket];
      if (!selected) return;

      const interval = TIMEFRAME_INTERVALS[state.selectedTimeframe] || "1day";
      const candlesByTime = new Map();

      (selected.data || []).forEach((candle) => {
        if (!candle) return;

        const time =
          typeof candle.time === "number"
            ? candle.time
            : parseCandleTime(candle.time, interval);

        const open = Number(candle.open);
        const high = Number(candle.high);
        const low = Number(candle.low);
        const close = Number(candle.close);

        if (
          !Number.isFinite(time) ||
          time <= 0 ||
          !Number.isFinite(open) ||
          !Number.isFinite(high) ||
          !Number.isFinite(low) ||
          !Number.isFinite(close)
        ) {
          return;
        }

        candlesByTime.set(time, {
          time,
          open,
          high,
          low,
          close
        });
      });

      const valid = Array.from(candlesByTime.values())
        .sort((a, b) => a.time - b.time);

      if (chartTitle) chartTitle.textContent = state.selectedMarket;

      const lastClose = valid.length
        ? valid[valid.length - 1].close
        : Number(selected.price) || 0;

      if (chartPrice) chartPrice.textContent = formatPrice(lastClose);

      candlestickSeries.setData(valid);

      if (fitContent && valid.length) {
        chart.timeScale().fitContent();
      }
    }

    function populateTradePairs() {
      if (!tradePairSelect) return;
      tradePairSelect.innerHTML = "";
      Object.keys(marketData).forEach((pair) => {
        const option = document.createElement("option");
        option.value = pair;
        option.textContent = pair;
        if (pair === state.selectedMarket) option.selected = true;
        tradePairSelect.appendChild(option);
      });
    }

    function renderMarketsList() {
      if (!marketsList) return;
      marketsList.innerHTML = "";

      const visiblePairs = state.selectedMarketCategory ? Object.keys(marketData).filter((pair) => marketData[pair].category === state.selectedMarketCategory) : Object.keys(marketData);

      visiblePairs.forEach((pair) => {
        const market = marketData[pair];
        const card = document.createElement("div");
        card.className = `market-item ${pair === state.selectedMarket ? "active-market" : ""}`;
        card.dataset.market = pair;

        const isPositive = market.change >= 0;

        card.innerHTML = `
          <div>
            <strong>${pair}</strong>
            <small>${market.name}</small>
          </div>
          <div class="right">
            <strong>${formatCompactPrice(pair)}</strong>
            <small class="${isPositive ? "profit" : "loss"}">${isPositive ? "+" : ""}${market.change.toFixed(2)}%</small>
          </div>
        `;

        card.addEventListener("click", () => {
          state.selectedMarket = pair;
          populateTradePairs();
          fetchTimeSeriesData(pair, state.selectedTimeframe);
          updateChart();
          renderMarketsList();
        });

        marketsList.appendChild(card);
      });
    }

    function renderMarketWatchGrid() {
      if (!marketWatchGrid) return;
      marketWatchGrid.innerHTML = "";

      const visiblePairs = marketCategories[state.selectedMarketCategory] || Object.keys(marketData);

      visiblePairs.forEach((pair) => {
        const market = marketData[pair];
        const card = document.createElement("article");
        card.className = "market-card";
        card.dataset.pair = pair;
        const isPositive = market.change >= 0;
        card.innerHTML = `
          <div class="pair-row">
            <h3>${pair}</h3>
            <span class="change-badge ${isPositive ? "" : "negative"}">${isPositive ? "+" : ""}${market.change.toFixed(2)}%</span>
          </div>
          <div class="meta-row">
            <span>${market.name}</span>
            <span>${state.selectedTimeframe}</span>
          </div>
          <div class="price">
            ${formatCompactPrice(pair)}
            ${realtimePairs.has(pair) ? "" : '<span class="sim-badge">Sim</span>'}
          </div>
          <div class="meta-row">
            <span>Market</span>
            <span>${market.category}</span>
          </div>
        `;

        card.addEventListener("click", () => {
          state.selectedMarket = pair;
          populateTradePairs();
          fetchTimeSeriesData(pair, state.selectedTimeframe);
          updateChart();
          renderMarketsList();
          const chartSection = document.querySelector(".chart-panel");
          if (chartSection) chartSection.scrollIntoView({ behavior: "smooth", block: "start" });
        });

        marketWatchGrid.appendChild(card);
      });
    }

    function renderAccountSummary() {
      const balance = Number(state.account.balance) || 0;
      const trades = state.account.trades || [];
      const unrealized = trades.reduce((total, trade) => total + calculateTradePnL(trade).pl, 0);
      const closedTrades = state.account.tradesClosed || [];
      const winners = closedTrades.filter((trade) => (trade.closedPl || 0) > 0).length;
      const winRateValueEl = $("winRateValue");
      if (balanceValue) balanceValue.textContent = `$${balance.toFixed(2)}`;
      if (equityValue) equityValue.textContent = `$${(balance + unrealized).toFixed(2)}`;
      if (todayPnL) {
        todayPnL.textContent = `${unrealized >= 0 ? "+" : "-"}$${Math.abs(unrealized).toFixed(2)}`;
        todayPnL.className = unrealized >= 0 ? "profit" : "loss";
      }
      if (winRateValueEl) {
        winRateValueEl.textContent = closedTrades.length ? `${Math.round((winners / closedTrades.length) * 100)}%` : "—";
        winRateValueEl.style.color = winners >= closedTrades.length / 2 ? "var(--text)" : "var(--muted)";
      }
      if (fundingBalance) fundingBalance.textContent = `$${balance.toFixed(2)}`;
      if (fundingModeLabel) fundingModeLabel.textContent = "Demo account";
      if (fundingNote) fundingNote.textContent = state.user.isLoggedIn ? "Funds are stored in this local account ledger." : "Sign in to manage this account balance.";
    }

    async function loadAccount() {
      if (!state.user.isLoggedIn) {
        state.account = { mode: state.accountMode, balance: 0, trades: [], tradesClosed: [], transactions: [] };
        state.openTrades = [];
        renderAccountSummary();
        renderTradesTable();
        return;
      }
      try {
        const response = await fetch(`/api/account?mode=${state.accountMode}`);
        const payload = await readJson(response).catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || "Could not load account.");
        state.account = payload.account;
        state.openTrades = state.account.trades;
        renderAccountSummary();
        renderTradesTable();
      } catch (error) {
        if (fundingNote) fundingNote.textContent = error.message;
      }
    }

    async function submitFunding(type) {
      if (!state.user.isLoggedIn) {
        if (authModal) authModal.classList.add("open");
        showToast("Sign in before managing account funds.", "info");
        return;
      }
      const amount = Number(fundingAmount?.value);
      if (!amount || amount <= 0) {
        showToast("Enter a positive amount.", "error");
        return;
      }
      try {
        const response = await fetch("/api/account/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: state.accountMode, type, amount })
        });
        const payload = await readJson(response).catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || "Funding request failed.");
        state.account = payload.account;
        if (fundingAmount) fundingAmount.value = "";
        renderAccountSummary();
      } catch (error) {
        showToast(error.message, "error");
      }
    }

    function renderTradesTable() {
      if (!tradesBody) return;
      tradesBody.innerHTML = "";
      if (!state.openTrades.length) {
        tradesBody.innerHTML = `<tr><td colspan="7" class="empty-row">No open positions. Place your first trade to see it here.</td></tr>`;
        return;
      }

      state.openTrades.forEach((trade) => {
        const row = document.createElement("tr");
        const amount = trade.lotSize ? `${trade.lotSize}` : "0.00";
        const marked = calculateTradePnL(trade);
        const profitClass = marked.pl >= 0 ? "profit" : "loss";
        const profitText = marked.pl >= 0 ? `+$${marked.pl.toFixed(2)}` : `-$${Math.abs(marked.pl).toFixed(2)}`;

        row.innerHTML = `
          <td>${trade.market}</td>
          <td class="${trade.type === "BUY" ? "buy" : "sell"}">${trade.type}</td>
          <td>${amount}</td>
          <td>${trade.entryPrice}</td>
          <td>${marked.currentPrice}</td>
          <td class="${profitClass}">${profitText}</td>
          <td><button class="close-position-btn" data-close-trade="${trade.id}" type="button">Close</button></td>
        `;
        tradesBody.appendChild(row);
      });

      tradesBody.querySelectorAll("[data-close-trade]").forEach((button) => {
        button.addEventListener("click", () => {
          const trade = state.openTrades.find((item) => item.id === button.dataset.closeTrade);
          if (trade) closeTrade(trade);
        });
      });
    }

    async function closeTrade(trade) {
      if (!state.user.isLoggedIn) return;
      try {
        const result = await authRequest("/api/trades/close", {
          method: "POST",
          body: JSON.stringify({ mode: state.accountMode, id: trade.id })
        });
        state.account = result.account;
        state.openTrades = state.account.trades;
        const marked = calculateTradePnL(trade);
        renderAccountSummary();
        renderTradesTable();
        showToast(`${trade.type} ${trade.market} closed at ${marked.pl >= 0 ? "+" : ""}$${marked.pl.toFixed(2)} P/L.`, marked.pl >= 0 ? "success" : "info");
      } catch (error) {
        showToast(error.message, "error");
      }
    }

    function renderAdminDashboard() {
      if (adminPanel) adminPanel.style.display = canAccessAdmin() ? "" : "none";
      if (adminTotalAccounts) adminTotalAccounts.textContent = String(state.adminAccounts.length);
      if (adminActiveAccounts) adminActiveAccounts.textContent = String(state.adminAccounts.filter((account) => account.role === "Trader").length + (state.user.isLoggedIn && state.user.role === "Admin" ? 1 : 0));

      const totalVolume = state.adminTradeHistory.reduce((sum, trade) => {
        const notional = trade.lotSize && trade.entryPrice ? Math.abs(trade.lotSize * trade.entryPrice) : Math.abs(trade.pl || 0);
        return sum + notional;
      }, 0);
      if (adminTradeVolume) adminTradeVolume.textContent = `$${totalVolume.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

      if (adminAccountsBody) {
        adminAccountsBody.innerHTML = "";
        state.adminAccounts.forEach((account) => {
          const row = document.createElement("tr");
          row.innerHTML = `
            <td>${account.name}</td>
            <td>${account.email}</td>
            <td>${account.role}</td>
            <td>${account.created}</td>
          `;
          adminAccountsBody.appendChild(row);
        });
      }

      if (adminTradesBody) {
        adminTradesBody.innerHTML = "";
        if (!state.adminTradeHistory.length) {
          adminTradesBody.innerHTML = `<tr><td colspan="4">No trades yet. Trades appear here once users start placing them.</td></tr>`;
        } else {
          state.adminTradeHistory.slice(0, 6).forEach((trade) => {
            const row = document.createElement("tr");
            const profitClass = trade.pl >= 0 ? "profit" : "loss";
            const profitText = trade.pl >= 0 ? `+$${Number(trade.pl || 0).toFixed(2)}` : `-$${Math.abs(trade.pl || 0).toFixed(2)}`;
            row.innerHTML = `
              <td>${trade.market}</td>
              <td>${trade.user}</td>
              <td class="${trade.type === "BUY" ? "buy" : "sell"}">${trade.type}</td>
              <td class="${profitClass}">${profitText}</td>
            `;
            adminTradesBody.appendChild(row);
          });
        }
      }
    }

    function canAccessAdmin() {
      return state.user.isLoggedIn && state.user.role === "Admin";
    }

    async function refreshAdminOverview() {
      if (!canAccessAdmin()) return;

      try {
        const response = await fetch("/api/admin/overview");
        const payload = await readJson(response).catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || "Unable to load admin overview.");
        state.adminAccounts = payload.accounts;
        state.adminTradeHistory = payload.recentTrades || [];
        if (adminTotalAccounts) adminTotalAccounts.textContent = String(payload.totalAccounts);
        if (adminActiveAccounts) adminActiveAccounts.textContent = String(payload.activeTraders);
        renderAdminDashboard();
      } catch (error) {
        console.warn("Could not load the admin overview.", error);
      }
    }

    function setActiveNav(section) {
      const pageMap = {
        home: "index.html",
        dashboard: "dashboard.html",
        markets: "markets.html",
        portfolio: "portfolio.html",
        trades: "trades.html",
        admin: "admin.html",
        contact: "contact.html",
        about: "about.html",
        faq: "faq.html",
        settings: "settings.html",
        learn: "learn.html"
      };
      const target = pageMap[section];
      if (target && section !== "dashboard") {
        window.location.href = target;
      }
      if (section === "admin") refreshAdminOverview();
    }

    function bindNav() {
      document.querySelectorAll("[data-go]").forEach((button) => {
        button.addEventListener("click", () => {
          const section = button.dataset.go;
          if (!section) return;
          if (section === "admin" && !canAccessAdmin()) {
            if (!state.user.isLoggedIn) {
              if (authModal) authModal.classList.add("open");
              showToast("Admin access requires an admin login.", "info");
              return;
            }
            showToast("Only an admin account can access the admin dashboard.", "error");
            return;
          }
          setActiveNav(section);
        });
      });

      document.addEventListener("keydown", (event) => {
        if (event.key === "/" && event.target.tagName !== "INPUT" && event.target.tagName !== "TEXTAREA" && event.target.tagName !== "SELECT") {
          event.preventDefault();
          const searchBtn = $("symbolSearchBtn");
          if (searchBtn) {
            searchBtn.click();
          }
        }
      });
    }

    function setTradeSelection(type) {
      state.selectedTradeType = type;

      if (buyButton) buyButton.style.opacity = (type === "BUY") ? "1" : "0.55";
      if (sellButton) sellButton.style.opacity = (type === "SELL") ? "1" : "0.55";

      if (!type) {
        if (buyButton) buyButton.style.opacity = "1";
        if (sellButton) sellButton.style.opacity = "1";
      }
    }

    function setOrderType(type) {
      state.selectedOrderType = type;
      const isLimit = type === "limit";
      if (orderTypeMarket) orderTypeMarket.classList.toggle("active", !isLimit);
      if (orderTypeLimit) orderTypeLimit.classList.toggle("active", isLimit);
      if (entryPriceWrap) entryPriceWrap.classList.toggle("hidden", !isLimit);
      if (isLimit && entryPriceInput && !Number(entryPriceInput.value)) {
        const price = marketData[state.selectedMarket]?.price || 0;
        entryPriceInput.value = Number(price).toFixed(2);
      }
      calculateTradePreview();
    }

    function bindTradeControls() {
      if (tradePairSelect) {
        tradePairSelect.addEventListener("change", (event) => {
          state.selectedMarket = event.target.value;
          fetchTimeSeriesData(event.target.value, state.selectedTimeframe);
          updateChart();
          renderMarketsList();
          calculateTradePreview();
        });
      }

      if (orderTypeMarket) orderTypeMarket.addEventListener("click", () => setOrderType("market"));
      if (orderTypeLimit) orderTypeLimit.addEventListener("click", () => setOrderType("limit"));

      if (buyButton) {
        buyButton.addEventListener("click", () => {
          setTradeSelection(state.selectedTradeType === "BUY" ? null : "BUY");
        });
      }

      if (sellButton) {
        sellButton.addEventListener("click", () => {
          setTradeSelection(state.selectedTradeType === "SELL" ? null : "SELL");
        });
      }

      if (placeTradeButton) {
        placeTradeButton.addEventListener("click", () => {
          if (!state.user.isLoggedIn) {
            if (authModal) authModal.classList.add("open");
            showToast("Sign in before placing a trade.", "info");
            return;
          }
          if (!state.account.balance || state.account.balance <= 0) {
            showToast("Deposit funds before placing a trade.", "error");
            return;
          }
          if (!state.selectedTradeType) {
            showToast("Please select BUY or SELL first.", "error");
            return;
          }

          const lotSize = Number(lotSizeInput?.value);
          if (!lotSize || lotSize <= 0) {
            showToast("Please enter a valid lot size.", "error");
            return;
          }

          if (state.selectedOrderType === "limit") {
            const limitPrice = Number(entryPriceInput?.value);
            if (!limitPrice || limitPrice <= 0) {
              showToast("Enter a valid limit entry price.", "error");
              return;
            }
          }

          const preview = calculateTradePreview();
          const stopLoss = Number(stopLossInput?.value) || null;
          const takeProfit = Number(takeProfitInput?.value) || null;

          if (tradeConfirmDetails && tradeConfirmModal) {
            const directionClass = state.selectedTradeType === "BUY" ? "buy-row" : "sell-row";
            tradeConfirmDetails.innerHTML = `
              <div class="trade-confirm-row"><span>Market</span><strong>${state.selectedMarket}</strong></div>
              <div class="trade-confirm-row ${directionClass}"><span>Side</span><strong>${state.selectedTradeType}</strong></div>
              <div class="trade-confirm-row"><span>Order type</span><strong>${state.selectedOrderType === "limit" ? "LIMIT" : "MARKET"}</strong></div>
              <div class="trade-confirm-row"><span>Lot size</span><strong>${lotSize}</strong></div>
              <div class="trade-confirm-row"><span>Entry price</span><strong>${formatPrice(preview.entryPrice)}</strong></div>
              <div class="trade-confirm-row"><span>Potential loss</span><strong>-$${preview.potentialLoss.toFixed(2)}</strong></div>
              <div class="trade-confirm-row"><span>Potential profit</span><strong>+$${preview.potentialProfit.toFixed(2)}</strong></div>
            `;
            tradeConfirmModal.classList.add("open");
            const pendingTrade = {
              market: state.selectedMarket,
              type: state.selectedTradeType,
              orderType: state.selectedOrderType,
              lotSize,
              entryPrice: preview.entryPrice,
              currentPrice: preview.entryPrice,
              stopLoss,
              takeProfit,
              potentialProfit: preview.potentialProfit,
              potentialLoss: preview.potentialLoss,
              pl: 0
            };

            const submitHandler = () => {
              tradeConfirmModal.classList.remove("open");
              tradeConfirmSubmit.removeEventListener("click", submitHandler);
              tradeConfirmCancel.removeEventListener("click", cancelHandler);
              tradeConfirmClose.removeEventListener("click", cancelHandler);
              submitTrade(pendingTrade);
            };

            const cancelHandler = () => {
              tradeConfirmModal.classList.remove("open");
              tradeConfirmSubmit.removeEventListener("click", submitHandler);
              tradeConfirmCancel.removeEventListener("click", cancelHandler);
              tradeConfirmClose.removeEventListener("click", cancelHandler);
            };

            tradeConfirmSubmit.addEventListener("click", submitHandler);
            tradeConfirmCancel.addEventListener("click", cancelHandler);
            tradeConfirmClose.addEventListener("click", cancelHandler);
          }
        });
      }

      [lotSizeInput, stopLossInput, takeProfitInput, entryPriceInput].forEach((input) => {
        if (input) input.addEventListener("input", calculateTradePreview);
      });
    }

    async function submitTrade(trade) {
      try {
        const result = await authRequest("/api/trades", {
          method: "POST",
          body: JSON.stringify({ mode: state.accountMode, ...trade })
        });
        state.account = result.account;
        state.openTrades = state.account.trades;
        renderAccountSummary();
        renderTradesTable();
        if (lotSizeInput) lotSizeInput.value = "";
        if (stopLossInput) stopLossInput.value = "";
        if (takeProfitInput) takeProfitInput.value = "";
        setTradeSelection(null);
        calculateTradePreview();
        showToast(`${trade.type} ${trade.market} trade placed successfully.`, "success");
      } catch (error) {
        showToast(error.message, "error");
      }
    }

    function updateLivePrices() {
      const pairs = Object.keys(marketData);

      pairs.forEach((pair) => {
        if (realtimePairs.has(pair) && marketSocket?.readyState === WebSocket.OPEN) return;
        const market = marketData[pair];
        if (!market || !Number.isFinite(market.price)) return;
        const previous = market.price;
        const randomChange = (Math.random() - 0.5) * market.price * 0.0015;
        const newPrice = Math.max(0.01, previous + randomChange);
        market.price = newPrice;
        market.change = previous ? ((newPrice - previous) / previous) * 100 : 0;
        const cardEl = document.querySelector(`.market-card[data-pair="${pair}"]`);
        if (cardEl) {
          const priceEl = cardEl.querySelector(".price");
          if (priceEl) {
            const flashClass = newPrice >= previous ? "price-flash-up" : "price-flash-down";
            priceEl.classList.remove("price-flash-up", "price-flash-down");
            void priceEl.offsetWidth;
            priceEl.classList.add(flashClass);
          }
        }
      });

      if (marketData[state.selectedMarket]) updateChart({ fitContent: false });
      renderMarketsList();
      renderMarketWatchGrid();
      if (lastUpdated) lastUpdated.textContent = `Updated ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    }

    function applyRealtimePrice(pair, price) {
      const market = marketData[pair];
      if (!market || !Number.isFinite(price)) return;

      const previous = market.price;
      market.price = price;
      market.change = previous ? ((price - previous) / previous) * 100 : 0;
      const candleTime = getCurrentCandleTime(state.selectedTimeframe);
      const last = market.data[market.data.length - 1];
      const open = last?.time === candleTime ? last.open : price;
      const candle = {
        time: candleTime,
        open,
        high: Math.max(open, price),
        low: Math.min(open, price),
        close: price
      };

      if (last?.time === candleTime) market.data[market.data.length - 1] = candle;
      else market.data.push(candle);
      if (market.data.length > 300) market.data.shift();
      updateChart({ fitContent: false });
      renderMarketsList();
      renderMarketWatchGrid();
      if (marketPulse) {
        marketPulse.innerHTML = '<span class="pulse-dot"></span>Live';
        marketPulse.style.color = "var(--positive)";
      }
      if (lastUpdated) lastUpdated.textContent = `Live ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    }

    function connectRealtimeFeed() {
      if (typeof WebSocket === "undefined") return;
      marketSocket = new WebSocket(COINBASE_WS);

      marketSocket.addEventListener("open", () => {
        marketSocket.send(JSON.stringify({
          type: "subscribe",
          product_ids: ["BTC-USD", "ETH-USD"],
          channels: ["ticker"]
        }));
        if (marketPulse) {
          marketPulse.innerHTML = '<span class="pulse-dot"></span>Live';
          marketPulse.style.color = "var(--positive)";
        }
      });

      marketSocket.addEventListener("message", (event) => {
        try {
          const message = JSON.parse(event.data);
          const pair = message.product_id?.replace("-", "/");
          const price = Number(message.price);
          if (message.type === "ticker" && realtimePairs.has(pair) && Number.isFinite(price)) {
            applyRealtimePrice(pair, price);
          }
        } catch (error) {
          console.warn("Could not read realtime market update.", error);
        }
      });

      marketSocket.addEventListener("error", () => {
        if (marketPulse) marketPulse.textContent = "Demo fallback";
      });

      marketSocket.addEventListener("close", () => {
        if (marketPulse) marketPulse.textContent = "Reconnecting...";
        setTimeout(connectRealtimeFeed, 10000);
      });
    }

    async function fetchLiveMarketData() {
      const keySymbols = ["BTC/USD", "ETH/USD"];
      const symbolsParam = keySymbols.join(",");
      try {
        const response = await fetch(`/api/market/prices?symbols=${encodeURIComponent(symbolsParam)}`);
        if (response.ok) {
          const data = await response.json();
          if (data && typeof data === "object") {
            keySymbols.forEach((symbol) => {
              if (data[symbol] && data[symbol].price) {
                marketData[symbol].price = Number(data[symbol].price);
              }
            });
          }
        }
      } catch (error) {
        console.warn("Twelve Data market fetch failed, using fallback.", error);
      }

      try {
        const response = await fetch("/api/exchange-rates?symbols=EUR,GBP,JPY");
        if (response.ok) {
          const data = await response.json();
          const rates = data.rates || {};
          if (rates.EUR) marketData["EUR/USD"].price = Number((1 / rates.EUR).toFixed(4));
          if (rates.GBP) marketData["GBP/USD"].price = Number((1 / rates.GBP).toFixed(4));
          if (rates.JPY) {
            marketData["USD/JPY"].price = Number(rates.JPY.toFixed(2));
            marketData["JPY/USD"].price = Number((1 / rates.JPY).toFixed(4));
          }
        }
      } catch (error) {
        console.warn("Could not fetch live exchange rates.", error);
      }

      const price = marketData["BTC/USD"]?.price;
      if (Number.isFinite(price) && convertNote) {
        convertNote.textContent = `1 BTC ≈ $${price.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
      }

      if (marketPulse) {
        marketPulse.innerHTML = '<span class="pulse-dot"></span>Live';
        marketPulse.style.color = "var(--positive)";
      }
      renderMarketsList();
      renderMarketWatchGrid();
      updateChart({ fitContent: false });
      fetchTimeSeriesData(state.selectedMarket, state.selectedTimeframe, false);
    }

    function updateAccountMode() {
      state.accountMode = "demo";
      if (sessionBadge) sessionBadge.textContent = state.user.isLoggedIn ? (state.user.role === "Admin" ? "Admin Access" : "Logged In") : "Guest Mode";
      if (!state.user.isLoggedIn && authToggle) {
        authToggle.textContent = "Login";
      }
      loadAccount();
    }

    function finishLogin() {
      if (userName) userName.textContent = state.user.name;
      if (userInitial) userInitial.textContent = state.user.name.charAt(0).toUpperCase();
      if (sessionBadge) sessionBadge.textContent = state.user.role === "Admin" ? "Admin Access" : "Logged In";
      if (authToggle) authToggle.textContent = "Profile";
      if (logoutBtn) logoutBtn.style.display = "";
      if (authModal) authModal.classList.remove("open");
      const settingsName = $("settingsName");
      const settingsEmail = $("settingsEmail");
      if (settingsName) settingsName.value = state.user.name;
      if (settingsEmail) settingsEmail.value = state.user.email;
      renderAdminDashboard();
      loadAccount();
      if (state.user.role === "Admin") refreshAdminOverview();
      document.dispatchEvent(new CustomEvent("candleflow-auth-change"));
    }

    async function readJson(response) {
      const text = await response.text();
      return text ? JSON.parse(text) : {};
    }

    async function authRequest(endpoint, options = {}) {
      const url = endpoint.startsWith("/") ? endpoint : `/api/auth/${endpoint}`;
      const response = await fetch(url, {
        headers: { "Content-Type": "application/json", ...(options.headers || {}) },
        ...options
      });
      const payload = await readJson(response).catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Authentication request failed.");
      return payload;
    }

    async function bindAuth() {
      try {
        const { user } = await authRequest("me");
        if (user) {
          state.user = { ...user, isLoggedIn: true };
          finishLogin();
        }
      } catch (error) {
        console.warn("Could not restore the server session.", error);
      }

      if (authToggle) {
        authToggle.addEventListener("click", () => {
          if (state.user.isLoggedIn) {
            setActiveNav("settings");
            return;
          }
          if (authModal) authModal.classList.add("open");
        });
      }

      const authModalClose = $("authModalClose");
      if (authModalClose) {
        authModalClose.addEventListener("click", () => {
          if (authModal) authModal.classList.remove("open");
        });
      }

      authTabs.forEach((tab) => {
        tab.addEventListener("click", () => {
          const mode = tab.dataset.auth;
          authTabs.forEach((item) => item.classList.toggle("active", item === tab));
          authForms.forEach((form) => form.classList.toggle("active-form", form.id === `${mode}Form`));
        });
      });

      const loginForm = $("loginForm");
      if (loginForm) {
        loginForm.addEventListener("submit", async (event) => {
          event.preventDefault();

          const email = $("loginEmail")?.value.trim();
          const password = $("loginPassword")?.value.trim();

          try {
            const result = await authRequest("login", {
              method: "POST",
              body: JSON.stringify({ email, password })
            });
            state.user = { ...result.user, isLoggedIn: true };
            finishLogin();
          } catch (error) {
            showToast(error.message, "error");
          }
        });
      }

      const signupForm = $("signupForm");
      if (signupForm) {
        signupForm.addEventListener("submit", async (event) => {
          event.preventDefault();

          const name = $("signupName")?.value.trim();
          const email = $("signupEmail")?.value.trim();
          const password = $("signupPassword")?.value.trim();

          if (!name || !email || !password) {
            showToast("Please complete all sign-up details.", "error");
            return;
          }

          try {
            const result = await authRequest("signup", {
              method: "POST",
              body: JSON.stringify({ name, email, password })
            });
            state.user = { ...result.user, isLoggedIn: true };
            state.adminAccounts = [{ ...result.user }, ...state.adminAccounts];
            finishLogin();
          } catch (error) {
            showToast(error.message, "error");
          }
        });
      }

      const logoutBtnEl = logoutBtn;
      if (logoutBtnEl) {
        logoutBtnEl.addEventListener("click", async () => {
          await authRequest("logout", { method: "POST" });
          state.user = { name: "Trader", email: "trader@candleflow.io", role: "Trader", isLoggedIn: false };
          if (userName) userName.textContent = "Trader";
          if (userInitial) userInitial.textContent = "T";
          if (sessionBadge) sessionBadge.textContent = "Guest Mode";
          if (authToggle) authToggle.textContent = "Login";
          if (logoutBtnEl) logoutBtnEl.style.display = "none";
          if (authModal) authModal.classList.add("open");
          renderAdminDashboard();
          loadAccount();
          showToast("You have been signed out. Sign in to resume trading.", "info");
          document.dispatchEvent(new CustomEvent("candleflow-auth-change"));
        });
      }

      const depositButton = $("depositButton");
      const withdrawButton = $("withdrawButton");
      if (depositButton) depositButton.addEventListener("click", () => submitFunding("deposit"));
      if (withdrawButton) withdrawButton.addEventListener("click", () => submitFunding("withdrawal"));
    }

    function setupTimeframeButtons() {
      document.querySelectorAll(".timeframe-btn").forEach((button) => {
        button.addEventListener("click", () => {
          document.querySelectorAll(".timeframe-btn").forEach((item) => item.classList.toggle("selected", item === button));
          const timeframe = button.textContent.trim();
          state.selectedTimeframe = timeframe;
          fetchTimeSeriesData(state.selectedMarket, timeframe);
        });
      });
    }

    function escapeHtml(value) {
      return String(value).replace(/[&<>"']/g, (char) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
      }[char]));
    }

    function getAvailablePairs() {
      return Object.keys(marketData).map((symbol) => ({
        symbol,
        name: marketData[symbol].name || symbol,
        category: marketData[symbol].category || ""
      }));
    }

    function setupSymbolPicker() {
      const titleEl = $("chartTitle");
      const searchBtn = $("symbolSearchBtn");
      const dropdown = $("symbolDropdown");
      const input = $("symbolSearchInput");
      const results = $("symbolResults");
      const modalClose = $("symbolModalClose");
      if (!dropdown || !input || !results) return;

      const closeDropdown = () => {
        dropdown.hidden = true;
        input.value = "";
        document.body.style.overflow = "";
      };

      const openDropdown = () => {
        dropdown.hidden = false;
        renderSymbolResults("");
        document.body.style.overflow = "hidden";
        setTimeout(() => input.focus(), 50);
      };

      const renderSymbolResults = (query) => {
        const q = query.trim().toLowerCase();
        const pairs = getAvailablePairs().filter((pair) =>
          !q || pair.symbol.toLowerCase().includes(q) || pair.name.toLowerCase().includes(q)
        );

        results.innerHTML = "";

        if (q && pairs.length === 0) {
          const empty = document.createElement("div");
          empty.className = "symbol-empty";
          empty.innerHTML = `<span class="symbol-empty-strong">"${escapeHtml(query.trim())}" is not available.</span><span class="symbol-empty-hint">Check the symbol or search by market name (e.g. "gold", "bitcoin").</span>`;
          results.appendChild(empty);
          return;
        }

        pairs.forEach((pair) => {
          const row = document.createElement("button");
          row.type = "button";
          row.className = "symbol-result";
          row.innerHTML = `<span>${escapeHtml(pair.symbol)}</span><span class="symbol-result-name">${escapeHtml(pair.name)}</span>`;
          row.addEventListener("click", () => {
            state.selectedMarket = pair.symbol;
            populateTradePairs();
            fetchTimeSeriesData(pair.symbol, state.selectedTimeframe);
            updateChart();
            renderMarketsList();
            renderMarketWatchGrid();
            closeDropdown();
          });
          results.appendChild(row);
        });
      };

      if (titleEl) {
        titleEl.addEventListener("click", (event) => {
          event.stopPropagation();
          openDropdown();
        });
      }

      if (searchBtn) {
        searchBtn.addEventListener("click", (event) => {
          event.stopPropagation();
          openDropdown();
        });
      }

      if (modalClose) {
        modalClose.addEventListener("click", closeDropdown);
      }

      dropdown.addEventListener("click", (event) => {
        if (event.target === dropdown) closeDropdown();
      });

      input.addEventListener("input", () => renderSymbolResults(input.value));
      input.addEventListener("keydown", (event) => {
        if (event.key === "Escape") closeDropdown();
      });

      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !dropdown.hidden) closeDropdown();
      });

      document.addEventListener("click", (event) => {
        if (dropdown.hidden) return;
        if (!event.target.closest(".symbol-modal") && !event.target.closest(".symbol-picker")) closeDropdown();
      });
    }

    function bindCategoryTabs() {
      document.querySelectorAll(".category-btn").forEach((button) => {
        button.addEventListener("click", () => {
          state.selectedMarketCategory = button.dataset.category;
          document.querySelectorAll(".category-btn").forEach((item) => item.classList.toggle("active", item === button));
          renderMarketsList();
          renderMarketWatchGrid();
        });
      });
    }

    async function runConversion() {
      const amount = Number(convertAmount?.value) || 0;
      const from = convertFrom?.value || "BTC";
      const to = convertTo?.value || "USD";
      if (!amount || amount <= 0) {
        if (convertResult) convertResult.textContent = "Enter amount";
        return;
      }
      if (convertResult) convertResult.textContent = "Loading...";
      try {
        const response = await fetch(`/api/crypto/convert?from=${from}&to=${to}&amount=${amount}`);
        if (!response.ok) throw new Error("Conversion failed.");
        const data = await readJson(response).catch(() => ({}));
        if (data.result !== undefined && Number.isFinite(data.result)) {
          const fiat = ["USD", "EUR", "GBP", "JPY", "TRY"].includes(to);
          const formatted = fiat
            ? new Intl.NumberFormat("en-US", { style: "currency", currency: to, maximumFractionDigits: 2 }).format(data.result)
            : `${Number(data.result).toFixed(6)} ${to}`;
          if (convertResult) convertResult.textContent = formatted;
          if (convertNote) convertNote.textContent = `${amount} ${from} = ${formatted}`;
        } else {
          if (convertResult) convertResult.textContent = "Unavailable";
        }
      } catch (error) {
        if (convertResult) convertResult.textContent = "Error";
        if (convertNote) convertNote.textContent = error.message;
      }
    }

    function bindCryptoConverter() {
      if (convertButton) convertButton.addEventListener("click", runConversion);
      if (convertAmount) convertAmount.addEventListener("input", runConversion);
    }

    function toggleChartFullscreen() {
      if (!chartPanel || !chartContainer) return;
      const isFullscreen = chartPanel.classList.toggle("chart-fullscreen");
      document.body.classList.toggle("chart-fullscreen-mode", isFullscreen);
      if (fullscreenChartBtn) fullscreenChartBtn.textContent = isFullscreen ? "Exit Full Screen" : "Full Screen";

      const width = isFullscreen ? window.innerWidth - 70 : chartContainer.clientWidth || 700;
      const height = isFullscreen ? window.innerHeight - 190 : chartContainer.clientHeight || 340;

      chart.applyOptions({ width, height });
      chart.timeScale().fitContent();
      requestAnimationFrame(() => chart.timeScale().fitContent());
    }

    function init() {
      seedMarketData();
      populateTradePairs();
      renderMarketWatchGrid();
      renderMarketsList();
      updateChart();
      renderTradesTable();
      bindNav();
      bindTradeControls();
      setupTimeframeButtons();
      setupSymbolPicker();
      bindAuth();
      bindCategoryTabs();
      bindCryptoConverter();
      renderAdminDashboard();
      if (fullscreenChartBtn) fullscreenChartBtn.addEventListener("click", toggleChartFullscreen);
      updateAccountMode();
      renderAccountSummary();
      calculateTradePreview();
      fetchLiveMarketData();
      connectRealtimeFeed();
      setInterval(fetchLiveMarketData, 60000);
      setInterval(updateLivePrices, 8000);
    }

    window.addEventListener("resize", resizeChart);

    function resizeChart() {
      if (!chartContainer || !chartPanel) return;
      const isFullscreen = chartPanel.classList.contains("chart-fullscreen");
      chart.applyOptions({
        width: isFullscreen ? window.innerWidth - 70 : chartContainer.clientWidth || 700,
        height: isFullscreen ? window.innerHeight - 190 : chartContainer.clientHeight || 340
      });
    }

    if (typeof ResizeObserver !== "undefined") {
      const resizeObserver = new ResizeObserver(() => {
        const isFullscreen = chartPanel?.classList.contains("chart-fullscreen");
        if (isFullscreen) return;
        chart.applyOptions({
          width: chartContainer.clientWidth || 700,
          height: chartContainer.clientHeight || 340
        });
      });
      resizeObserver.observe(chartContainer);
    }

    init();
});
