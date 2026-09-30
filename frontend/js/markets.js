document.addEventListener("DOMContentLoaded", () => {
    const grid = document.getElementById("marketGrid");
    if (!grid) return;

    const marketData = {
        "BTC/USD": { category: "crypto", name: "Bitcoin", price: 117842.5, change: 2.41, btc: 1 },
        "ETH/USD": { category: "crypto", name: "Ethereum", price: 4201, change: 1.82, btc: 0.0356 },
        "SOL/USD": { category: "crypto", name: "Solana", price: 168.24, change: 3.15, btc: 0.0014 },
        "ADA/USD": { category: "crypto", name: "Cardano", price: 0.74, change: 1.67, btc: 0.0000063 },
        "XRP/USD": { category: "crypto", name: "Ripple", price: 0.62, change: 2.09, btc: 0.0000053 },
        "DOGE/USD": { category: "crypto", name: "Dogecoin", price: 0.18, change: 3.42, btc: 0.0000015 },
        "LINK/USD": { category: "crypto", name: "Chainlink", price: 18.42, change: 1.96, btc: 0.000156 },
        "AAPL/USD": { category: "stocks", name: "Apple", price: 214.18, change: 1.12 },
        "MSFT/USD": { category: "stocks", name: "Microsoft", price: 438.91, change: 0.96 },
        "NVDA/USD": { category: "stocks", name: "NVIDIA", price: 129.34, change: 2.64 },
        "AMZN/USD": { category: "stocks", name: "Amazon", price: 196.41, change: 1.31 },
        "TSLA/USD": { category: "stocks", name: "Tesla", price: 248.77, change: -1.04 },
        "XAU/USD": { category: "fx", name: "Gold", price: 3342, change: -0.34 },
        "EUR/USD": { category: "fx", name: "Euro / Dollar", price: 1.1682, change: 0.21 },
        "GBP/USD": { category: "fx", name: "Pound / Dollar", price: 1.2814, change: 0.44 },
        "JPY/USD": { category: "fx", name: "Yen / Dollar", price: 0.0068, change: -0.18 },
        "USD/JPY": { category: "fx", name: "Dollar / Yen", price: 146.42, change: 0.18 },
        "US30/USD": { category: "fx", name: "Dow Jones", price: 42180, change: 0.42 },
        "NQ/USD": { category: "fx", name: "Nasdaq 100", price: 19870, change: 1.34 }
    };

    const LIVE_QUOTE_SYMBOLS = ["AAPL/USD", "MSFT/USD", "NVDA/USD", "AMZN/USD", "TSLA/USD", "XAU/USD"];
    const categoryLabels = { crypto: "Crypto", stocks: "Stocks", fx: "Forex & Commodities" };
    let activeCategory = "crypto";

    const lastUpdatedEl = document.getElementById("marketUpdated");

    function setLastUpdated(text) {
        if (lastUpdatedEl) lastUpdatedEl.textContent = text;
    }

    function showSkeleton() {
        grid.innerHTML = "";
        for (let i = 0; i < 6; i += 1) {
            const skeleton = document.createElement("div");
            skeleton.className = "skeleton-card";
            grid.appendChild(skeleton);
        }
    }

    function formatPrice(pair, value) {
        const price = Number(value);
        if (["EUR/USD", "GBP/USD", "JPY/USD", "USD/JPY"].includes(pair)) return price.toFixed(4);
        if (price >= 1000) return `$${price.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
        if (price < 1) return `$${price.toFixed(4)}`;
        return `$${price.toFixed(2)}`;
    }

    function render() {
        grid.innerHTML = "";
        Object.entries(marketData).forEach(([pair, market]) => {
            if (market.category !== activeCategory) return;
            const card = document.createElement("article");
            card.className = "market-card";
            card.title = `${market.name} (${pair}) \u2014 select to trade on the dashboard`;
            const isPositive = market.change >= 0;
            let btcRate = "";
            if (market.category === "crypto") {
                const btc = pair === "BTC/USD" ? "1 BTC" : `${Number(market.btc).toExponential(4)} BTC`;
                btcRate = `<div class="meta-row"><span>Rate (BTC)</span><span>${btc}</span></div>`;
            }
            card.innerHTML = `
                <div class="pair-row">
                    <h3>${pair}</h3>
                    <span class="change-badge ${isPositive ? "" : "negative"}">${isPositive ? "+" : ""}${market.change.toFixed(2)}%</span>
                </div>
                <div class="meta-row"><span>${market.name}</span><span>${categoryLabels[market.category]}</span></div>
                <div class="price">${formatPrice(pair, market.price)}</div>
                <div class="meta-row"><span>Market</span><span>${categoryLabels[market.category]}</span></div>
                ${btcRate}
                <a class="card-trade-link" href="dashboard.html">Trade ${pair} &rarr;</a>
            `;
            grid.appendChild(card);
        });
    }

    document.querySelectorAll(".category-btn").forEach((button) => {
        button.addEventListener("click", () => {
            document.querySelectorAll(".category-btn").forEach((item) => item.classList.toggle("active", item === button));
            activeCategory = button.dataset.category || activeCategory;
            render();
        });
    });

    async function parseJson(response) {
        const text = await response.text();
        return text ? JSON.parse(text) : {};
    }

    async function fetchCrypto() {
        const coins = ["BTC", "ETH", "SOL", "ADA", "XRP", "DOGE", "LINK"];
        try {
            const response = await fetch(`/api/crypto/data?symbol=${coins.join(",")}`);
            if (!response.ok) return;
            const data = await parseJson(response);
            (data.symbols || []).forEach((coin) => {
                let pair = `${coin.symbol}/USD`;
                if (!marketData[pair] && String(coin.symbol || "").endsWith("USD") && coin.symbol.length > 3) {
                    pair = `${coin.symbol.slice(0, -3)}/USD`;
                }
                if (marketData[pair]) {
                    if (Number.isFinite(Number(coin.last))) marketData[pair].price = Number(coin.last);
                    if (Number.isFinite(Number(coin.daily_change_percentage))) marketData[pair].change = Number(coin.daily_change_percentage);
                    if (Number.isFinite(Number(coin.last_btc))) marketData[pair].btc = Number(coin.last_btc);
                }
            });
            const btc = data.symbols?.find((c) => {
                const raw = String(c.symbol || "");
                return raw === "BTC" || raw === "BTCUSD";
            });
            if (btc && Number(btc.last) > 0) {
                Object.entries(marketData).forEach(([pair, m]) => {
                    if (m.category === "crypto") {
                        m.btc = pair === "BTC/USD" ? 1 : Number(m.price) / Number(btc.last);
                    }
                });
            }
            setLastUpdated(`Crypto updated ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`);
            render();
        } catch (error) {
            console.warn("Could not fetch crypto market data.", error);
        }
    }

    async function fetchLiveQuotes() {
        try {
            const response = await fetch(`/api/market/live-quotes?symbols=${encodeURIComponent(LIVE_QUOTE_SYMBOLS.join(","))}`);
            if (!response.ok) return;
            const payload = await parseJson(response);
            const quotes = payload.quotes || {};
            Object.entries(quotes).forEach(([pair, quote]) => {
                if (!marketData[pair]) return;
                if (Number.isFinite(quote.price) && quote.price > 0) marketData[pair].price = quote.price;
                if (Number.isFinite(quote.change)) marketData[pair].change = quote.change;
            });
            setLastUpdated(`Stocks & commodities updated ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`);
            render();
        } catch (error) {
            console.warn("Could not fetch live quotes.", error);
        }
    }

    async function fetchFx() {
        try {
            const response = await fetch("/api/exchange-rates?symbols=EUR,GBP,JPY");
            if (!response.ok) return;
            const payload = await parseJson(response);
            const rates = payload.rates || {};
            if (Number.isFinite(Number(rates.EUR)) && rates.EUR > 0) {
                marketData["EUR/USD"].price = Number((1 / rates.EUR).toFixed(4));
            }
            if (Number.isFinite(Number(rates.GBP)) && rates.GBP > 0) {
                marketData["GBP/USD"].price = Number((1 / rates.GBP).toFixed(4));
            }
            if (Number.isFinite(Number(rates.JPY)) && rates.JPY > 0) {
                marketData["USD/JPY"].price = Number(rates.JPY.toFixed(2));
                marketData["JPY/USD"].price = Number((1 / rates.JPY).toFixed(4));
            }
            setLastUpdated(`Forex updated ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`);
            render();
        } catch (error) {
            console.warn("Could not fetch forex rates.", error);
        }
    }

    const active = document.querySelector(".category-btn.active");
    if (active) activeCategory = active.dataset.category || "crypto";

    showSkeleton();
    render();
    Promise.all([fetchCrypto(), fetchLiveQuotes(), fetchFx()]).finally(() => setLastUpdated(`Prices update automatically \u00b7 ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`));
    setInterval(fetchCrypto, 30000);
    setInterval(fetchLiveQuotes, 60000);
    setInterval(fetchFx, 60000);
});