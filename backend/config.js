const path = require("path");
const fs = require("fs");

(function loadEnv() {
  const envPath = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) return;
  const contents = fs.readFileSync(envPath, "utf8");
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
})();

const isProduction = process.env.NODE_ENV === "production";

const sessionSecret = process.env.CANDLEFLOW_SESSION_SECRET || "";

const apiKeys = {
  exchangeRate: process.env.EXCHANGE_RATE_API_KEY || "",
  twelveData: process.env.TWELVE_DATA_API_KEY || "",
  freeCrypto: process.env.FREE_CRYPTO_API_KEY || ""
};

function keyWarning(name, purpose) {
  if (!apiKeys[name]) {
    console.warn(`Warning: ${purpose}. Set ${name} in your environment or .env file.`);
  }
}

let adminPassword = process.env.CANDLEFLOW_ADMIN_PASSWORD || "";
if (!adminPassword) {
  adminPassword = isProduction ? "" : "#aDmin123";
  if (isProduction) {
    console.warn("Warning: CANDLEFLOW_ADMIN_PASSWORD is required in production.");
  }
}

module.exports = {
  isProduction,
  port: Number(process.env.PORT) || 8000,

  sessionSecret,

  apiKeys,

  admin: {
    email: process.env.CANDLEFLOW_ADMIN_EMAIL || "admin@candleflow.io",
    password: adminPassword
  },

  supabase: {
    url: process.env.SUPABASE_URL || "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  },

  paths: {
    backend: __dirname,
    data: path.join(__dirname, "data"),
    staticRoot: path.join(__dirname, "..", "frontend")
  },

  mimeTypes: {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".ico": "image/x-icon"
  },
  keyWarning
};