const http = require("http");
const { port, isProduction, apiKeys, sessionSecret, keyWarning } = require("./config");
const store = require("./services/store");
const auth = require("./services/authService");
const authRoutes = require("./routes/auth");
const marketRoutes = require("./routes/market");
const staticRoutes = require("./routes/static");

const CSP_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self' https://unpkg.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data:",
  "connect-src 'self' wss://ws-feed.exchange.coinbase.com",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "upgrade-insecure-requests"
].join("; ");

function applySecurityHeaders(response, secureRequest) {
  const headers = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Content-Security-Policy": CSP_DIRECTIVES
  };
  if (secureRequest) {
    headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";
  }
  for (const [name, value] of Object.entries(headers)) {
    if (!response.getHeader(name)) response.setHeader(name, value);
  }
}

function isSecureRequest(request) {
  return request.socket.encrypted || request.headers["x-forwarded-proto"] === "https";
}

const server = http.createServer((request, response) => {
  applySecurityHeaders(response, isSecureRequest(request));

  let requestUrl;
  try {
    requestUrl = new URL(request.url, `http://localhost:${port}`);
  } catch {
    auth.sendJson(response, 400, { error: "Malformed request URL." });
    return;
  }

  if (requestUrl.pathname.startsWith("/api/")) {
    Promise.resolve()
      .then(async () => {
        if (await authRoutes.handle(request, response, requestUrl)) return;
        if (await marketRoutes.handle(request, response, requestUrl)) return;
        auth.sendJson(response, 404, { error: "API endpoint not found." });
      })
      .catch((error) => {
        const status = error.message === "Invalid JSON" ? 400 : error.message === "Request body too large" ? 413 : 500;
        auth.sendJson(response, status, { error: error.message });
      });
    return;
  }

  Promise.resolve(staticRoutes.serve(request, response, requestUrl)).catch((error) => {
    console.error("Static route error:", error);
  });
});

async function start() {
  await store.connect();
  await store.seedAdmin();
  server.listen(port, () => {
    console.log(`Candleflow running at http://localhost:${port}`);
    keyWarning("exchangeRate", "exchange-rate conversions will be unavailable");
    keyWarning("freeCrypto", "live crypto prices will be unavailable");
    keyWarning("twelveData", "stocks/FX chart data will fall back to simulated data");
    if (!sessionSecret) {
      console.warn("Warning: using the fallback session secret. Set CANDLEFLOW_SESSION_SECRET to a long random value.");
    }
    if (isProduction && !apiKeys.exchangeRate) {
      console.warn("Warning: EXCHANGE_RATE_API_KEY must be set before deployment.");
    }
  });
}

start().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
});

process.on("unhandledRejection", (error) => {
  console.error("Unhandled rejection:", error);
});
