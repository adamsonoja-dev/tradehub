# Candleflow

Candleflow is a self-contained trading workspace for **crypto, stocks, forex, and commodities**.
It combines a live market monitor, an interactive candle chart, a risk-free demo trading desk
(market/limit orders, stop-loss and take-profit, P/L tracking), account funding, currency
conversion, crypto fear & greed and technical analysis, market news, and a role-gated admin
dashboard — all in one place.

The stack is intentionally minimal:

- **Backend** — plain Node.js (`http` module, no web framework), CommonJS modules.
- **Frontend** — static HTML/CSS/vanilla JS (no build step, no bundler).
- **Database & Auth** — [Supabase](https://supabase.com) (Postgres) using the service-role key.
- **Market data** — [Twelve Data](https://twelvedata.com), [FreeCryptoAPI](https://freecryptoapi.com),
  [Binance](https://binance.com) klines, [exchangerate-api.com](https://www.exchangerate-api.com),
  [alternative.me](https://alternative.me) Fear & Greed, [Finnhub](https://finnhub.io) news, and the
  Coinbase WebSocket feed for real-time BTC/ETH ticks.

---

## Table of contents

- [Features](#features)
- [Requirements](#requirements)
- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
- [npm scripts](#npm-scripts)
- [Project structure](#project-structure)
- [Pages](#pages)
- [API reference](#api-reference)
- [Data model](#data-model)
- [Security](#security)
- [Development notes & limitations](#development-notes--limitations)

---

## Features

- **Multi-asset market monitor** — 19 pairs across crypto, stocks, and FX/indices
  (BTC, ETH, SOL, ADA, XRP, DOGE, LINK · AAPL, MSFT, NVDA, AMZN, TSLA · XAU, EUR/USD, GBP/USD,
  JPY/USD, USD/JPY, US30, NQ).
- **Real-time ticks** — the frontend subscribes to the Coinbase WebSocket feed for BTC/USD and ETH/USD.
- **Interactive charting** — candle charts with selectable timeframes (15m, 1H, 4H, 1D, 1W),
  Binance klines for crypto and Twelve Data time series for other instruments.
- **Demo trading desk** — deposit/withdraw from a demo balance, place market or limit orders,
  set stop-loss and take-profit, and close positions with pip-aware P/L. Every trade is persisted
  server-side against the signed-in user's account.
- **Funding & history** — deposit/withdrawal transactions and open/closed trade history per account.
- **Market context tools** — currency conversion, crypto Fear & Greed index, technical analysis,
  and a curated market news feed.
- **Accounts & sessions** — signup/login/logout, editable display name, scrypt-hashed passwords,
  and HMAC-signed session cookies.
- **Admin dashboard** — platform overview (total accounts, active traders, recent trades) plus a
  filterable activity log of signups, logins, deposits, trades, and contact messages.

## Requirements

- **Node.js 18+** (the backend uses the global `fetch` and the `node --watch` dev flag).
- **npm** (only dependency is `@supabase/supabase-js`).
- A **Supabase project** — the backend refuses to start without `SUPABASE_URL` and
  `SUPABASE_SERVICE_ROLE_KEY`.
- Third-party **API keys** for live market data (optional — see [limitations](#development-notes--limitations)).

## Quick start

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create and prepare a Supabase project**

   - Create a project at <https://supabase.com>.
   - Open **Database → SQL Editor** and run [`db/schema.sql`](./db/schema.sql). This creates the
     `profiles`, `activities`, and `contacts` tables and their indexes.
   - Copy the **Project URL** and **service_role key** from **Settings → API**.

3. **Configure environment variables**

   ```bash
   cp .env.example .env
   ```

   Then edit `.env` and fill in at least `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
   `CANDLEFLOW_SESSION_SECRET`, and the admin credentials. See
   [Environment variables](#environment-variables).

4. **Start the server**

   ```bash
   npm start
   ```

   The server seeds/updates the admin account on startup and then serves the app at
   **<http://localhost:8000>**.

5. **Sign in**

   Log in with the admin credentials from your `.env` to access `admin.html`, or create a regular
   (Trader) account from the signup page.

## Environment variables

The backend loads `.env` from the project root on startup (existing `process.env` values win).
Copy [`.env.example`](./.env.example) to `.env` to get started.

| Variable | Required | Description |
| --- | --- | --- |
| `PORT` | No | HTTP port. Defaults to `8000`. |
| `CANDLEFLOW_SESSION_SECRET` | Recommended | Secret used to HMAC-sign session cookies. Use a long random value (`openssl rand -hex 32`). A fallback dev secret is used if unset (not safe for production). |
| `SUPABASE_URL` | **Yes** | Supabase project URL. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | Supabase service-role key (server-side only — bypasses RLS). |
| `CANDLEFLOW_ADMIN_EMAIL` | No | Email for the seeded admin account. Defaults to `admin@candleflow.io`. |
| `CANDLEFLOW_ADMIN_PASSWORD` | Yes (prod) | Password for the seeded admin account. In non-production it falls back to `#aDmin123`; production requires an explicit value. |
| `EXCHANGE_RATE_API_KEY` | Optional | exchangerate-api.com v6 key — FX conversions (`/api/exchange-rates`). |
| `TWELVE_DATA_API_KEY` | Optional | Twelve Data key — stocks/FX quotes and time series. |
| `FREE_CRYPTO_API_KEY` | Optional | FreeCryptoAPI key — crypto data, conversions, Fear & Greed, technical analysis. |
| `FINNHUB_API_KEY` | Optional | Finnhub token — market news (`/api/news`). Read directly from `process.env` in `marketService.js`. |
| `NODE_ENV` | No | Set to `production` to enable secure cookies, HSTS, and require an admin password. |

Missing market-data keys do not stop the server; it logs warnings and those endpoints return an
error, while the frontend falls back to seeded sample data.

## npm scripts

| Script | Command | Purpose |
| --- | --- | --- |
| `npm start` | `node backend/server.js` | Run the server. |
| `npm run dev` | `node --watch backend/server.js` | Run with auto-restart on file changes. |
| `npm run check` | `node --check <each source file>` | Syntax-check every backend and frontend JS file. |

## Project structure

```text
tradehub/
├── backend/
│   ├── config.js              # .env loader, config, API keys, MIME types
│   ├── server.js              # HTTP server, security headers, routing entry
│   ├── routes/
│   │   ├── auth.js            # auth, account, trades, admin, contact endpoints
│   │   ├── market.js          # market data & crypto endpoints
│   │   └── static.js          # static file serving + admin.html guard
│   └── services/
│       ├── authService.js     # hashing, sessions, cookies, rate limits, helpers
│       ├── activityService.js # activity log read/write + summary
│       ├── marketService.js   # upstream market/news API clients + caching
│       └── store.js           # Supabase client, profile/contact persistence
├── db/
│   └── schema.sql             # Supabase tables: profiles, activities, contacts
├── frontend/
│   ├── *.html                 # pages (see below)
│   ├── css/style.css
│   ├── js/                    # per-page and shared scripts
│   └── assets/                # logo and illustrations
├── .env.example
├── package.json
└── README.md
```

## Pages

| Page | Description |
| --- | --- |
| `index.html` | Landing page with hero, feature grid, and news preview. |
| `signup.html` | Create an account. |
| `dashboard.html` | Main trading desk: chart, market watch, order ticket, account panel. |
| `markets.html` | Market overview across all supported instruments. |
| `trades.html` | Open and closed positions. |
| `portfolio.html` | Account balance, equity, and transaction history. |
| `settings.html` | Profile and account settings. |
| `learn.html` / `faq.html` | Educational content and FAQ. |
| `about.html` / `contact.html` | About and contact form (stored in `contacts`). |
| `admin.html` | Admin-only dashboard (server-redirected for non-admins). |

## API reference

All endpoints are under `/api` and return JSON. Authentication uses the `candleflow_session`
cookie set by login.

### Auth & account — `backend/routes/auth.js`

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/api/auth/signup` | — | Create an account (rate limited: 5/hour/IP). |
| `POST` | `/api/auth/login` | — | Sign in and set the session cookie (rate limited: 8/15min/IP). |
| `POST` | `/api/auth/logout` | Session | Invalidate the session and clear the cookie. |
| `GET` | `/api/auth/me` | — | Return the current user or `null`. |
| `PUT` | `/api/auth/me` | Session | Update the display name (1–50 chars). |
| `GET` | `/api/account` | Session | Demo account snapshot (balance, trades, transactions). |
| `POST` | `/api/account/transactions` | Session | Deposit (`type: "deposit"`) or withdraw (`type: "withdrawal"`). |
| `POST` | `/api/trades` | Session | Open a market/limit trade (`market`, `type` `BUY`/`SELL`, `lotSize`, …). |
| `POST` | `/api/trades/close` | Session | Close an open position by `id`, settle P/L to the balance. |
| `GET` | `/api/admin/overview` | Admin | Totals, account list, recent activity, recent trades. |
| `GET` | `/api/admin/activity` | Admin | Activity log; filters: `type`, `email`, `limit`. |
| `POST` | `/api/contact` | — | Submit a contact message (rate limited: 5/hour/IP). |

### Market data — `backend/routes/market.js`

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/exchange-rates` | Fiat exchange rates (`?symbols=EUR,GBP,JPY`). |
| `GET` | `/api/market/price` | Single price (`?symbol=BTC/USD`). |
| `GET` | `/api/market/prices` | Normalized prices for a symbol list (`?symbols=...`). |
| `GET` | `/api/market/quote` | Twelve Data quote for one symbol. |
| `GET` | `/api/market/batch-quotes` | Quotes for multiple symbols. |
| `GET` | `/api/market/live-quotes` | Live quotes with change % for a fixed default set. |
| `GET` | `/api/market/time_series` | Candles (`?symbol=&interval=1day`); Binance first for crypto, else Twelve Data. |
| `GET` | `/api/market/search` | Symbol search (`?q=`). |
| `GET` | `/api/crypto/data` | FreeCryptoAPI data for a crypto symbol. |
| `GET` | `/api/crypto/convert` | Crypto/fiat conversion (`?from=&to=&amount=`). |
| `GET` | `/api/crypto/fear-greed` | Crypto Fear & Greed index (alternative.me, FreeCryptoAPI fallback). |
| `GET` | `/api/crypto/technical` | Technical analysis for a crypto symbol. |
| `GET` | `/api/news` | Market news headlines (Finnhub). |

Unreachable upstreams return **502**; unknown `/api/*` paths return **404**.

## Data model

Defined in [`db/schema.sql`](./db/schema.sql) (run it in the Supabase SQL editor before starting):

- **`profiles`** — one row per user: `id` (matches the Supabase auth user), `name`, `email`,
  `role` (`Admin`/`Trader`), `created`, `accounts` (JSONB demo/live balances, trades, transactions),
  `passwordhash`, `sessionnonce`.
  > Postgres folds unquoted identifiers to lowercase, so the stored columns are `passwordhash` and
  > `sessionnonce`; the backend maps them to camelCase in application code.
- **`activities`** — append-only audit log (`signup`, `login`, `logout`, `deposit`, `withdrawal`,
  `trade`, `close`, `contact`, `profile-update`) with an index on `timestamp`.
- **`contacts`** — contact-form submissions.

Signup creates the Supabase Auth user first, then inserts the matching `profiles` row. The admin
account is created/updated automatically on server startup.

## Security

- **Security headers** on every response: CSP, `X-Content-Type-Options`, `X-Frame-Options`,
  `Referrer-Policy`, `Permissions-Policy`, and HSTS when served over TLS.
- **Passwords** are hashed with `scrypt` (per-user random salt); verification is constant-time.
- **Sessions** are stateless HMAC-SHA256-signed cookies (`HttpOnly`, `SameSite=Lax`, 7-day TTL,
  `Secure` in production) invalidated by rotating a per-user session nonce on logout.
- **Rate limiting** on signup, login, and contact endpoints.
- **Path traversal protection** and a server-side admin guard for `admin.html`.
- **Request body cap** of 100 KB with strict JSON parsing.

> Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser — it belongs only in the server `.env`.

## Development notes & limitations

- **Only demo mode is active.** The account/trade routes currently hardcode `mode = "demo"`; the
  `live` account structure exists but is not wired to a broker.
- Validate the whole codebase with:

  ```bash
  npm run check
  ```

- **VS Code Live Server option.** `.vscode/settings.json` configures Live Server (port `5500`) to
  serve `/frontend` and proxy `/api` to `http://127.0.0.1:8000/api`. If you use it, run the backend
  separately (`npm start`) so API calls resolve.
- **Graceful degradation.** Without market API keys, the server logs warnings and the affected
  endpoints fail; the frontend seeds fallback/simulated prices and candles so the UI still renders.
- **Bundled `mongodb/`** contains a standalone MongoDB distribution but is **not referenced by the
  application** (it uses Supabase). It is safe to ignore or remove.
- **Not financial advice.** Candleflow is a demo/educational workspace; it does not connect to a real
  brokerage or execute real orders.
