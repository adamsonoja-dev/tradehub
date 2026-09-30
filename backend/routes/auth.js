const crypto = require("crypto");
const auth = require("../services/authService");
const store = require("../services/store");
const activity = require("../services/activityService");
const market = require("../services/marketService");

const LOGIN_LIMIT = { rate: 8, windowMs: 15 * 60 * 1000 };
const SIGNUP_LIMIT = { rate: 5, windowMs: 60 * 60 * 1000 };
const CONTACT_LIMIT = { rate: 5, windowMs: 60 * 60 * 1000 };

function limited(response, limit) {
  const minutes = Math.ceil(limit.windowMs / 60000);
  return auth.sendJson(response, 429, { error: `Too many attempts. Please try again in ${minutes} minute(s).` });
}

function pipSizeFor(pair) {
  if (pair.includes("JPY")) return 0.01;
  if (["EUR/USD", "GBP/USD"].includes(pair)) return 0.0001;
  return 0.01;
}

function contractSizeFor(pair) {
  if (["EUR/USD", "GBP/USD", "JPY/USD", "USD/JPY"].includes(pair)) return 100000;
  if (pair === "XAU/USD") return 100;
  return 1;
}


async function handle(request, response, requestUrl) {
  const { pathname, searchParams } = requestUrl;

  if (pathname === "/api/account" && request.method === "GET") {
    const user = await auth.currentUser(request);
    if (!user) return auth.sendJson(response, 401, { error: "Sign in to access account data." });
    const mode = "demo";
    return auth.sendJson(response, 200, { account: store.accountSnapshot(user, mode) });
  }

  if (pathname === "/api/account/transactions" && request.method === "POST") {
    const user = await auth.currentUser(request);
    if (!user) return auth.sendJson(response, 401, { error: "Sign in to manage account funds." });
    const body = await auth.readJsonBody(request);
    const mode = "demo";
    const type = body.type === "withdrawal" ? "withdrawal" : "deposit";
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return auth.sendJson(response, 400, { error: "Enter a positive amount." });
    }
    const storedUser = await store.findUserById(user.id);
    const account = store.ensureAccounts(storedUser).accounts[mode];
    if (type === "withdrawal" && amount > account.balance) {
      return auth.sendJson(response, 400, { error: "Withdrawal exceeds the account balance." });
    }
    account.balance += type === "deposit" ? amount : -amount;
    account.transactions.unshift({ id: crypto.randomUUID(), type, amount, created: new Date().toISOString() });
    await store.saveUser(storedUser);
    await activity.logEvent(type, {
      user: storedUser.id, name: storedUser.name, email: storedUser.email,
      amount, mode, detail: `${type === "deposit" ? "Deposited" : "Withdrew"} $${amount.toFixed(2)}`
    });
    return auth.sendJson(response, 200, { account: store.accountSnapshot(storedUser, mode) });
  }

  if (pathname === "/api/trades" && request.method === "POST") {
    const user = await auth.currentUser(request);
    if (!user) return auth.sendJson(response, 401, { error: "Sign in to place trades." });
    const body = await auth.readJsonBody(request);
    const mode = "demo";
    const lotSize = Number(body.lotSize);
    const orderType = body.orderType === "limit" ? "limit" : "market";
    const entryPrice = Number(body.entryPrice) || 0;
    const potentialProfit = Number(body.potentialProfit) || 0;
    const potentialLoss = Number(body.potentialLoss) || 0;
    if (!body.market || !["BUY", "SELL"].includes(body.type) || !Number.isFinite(lotSize) || lotSize <= 0) {
      return auth.sendJson(response, 400, { error: "Pair, trade side, and a valid lot size are required." });
    }
    if (orderType === "limit" && (!Number.isFinite(entryPrice) || entryPrice <= 0)) {
      return auth.sendJson(response, 400, { error: "A valid limit entry price is required." });
    }
    const storedUser = await store.findUserById(user.id);
    const account = store.ensureAccounts(storedUser).accounts[mode];
    if (!account.balance || account.balance <= 0) {
      return auth.sendJson(response, 400, { error: "Deposit funds before placing a trade." });
    }
    const trade = {
      id: crypto.randomUUID(), market: String(body.market), type: body.type, orderType, lotSize,
      entryPrice, currentPrice: entryPrice,
      stopLoss: Number(body.stopLoss) || null,
      takeProfit: Number(body.takeProfit) || null,
      potentialProfit, potentialLoss, pl: 0, created: new Date().toISOString()
    };
    account.trades.unshift(trade);
    await store.saveUser(storedUser);
    await activity.logEvent("trade", {
      user: storedUser.id, name: storedUser.name, email: storedUser.email,
      mode, detail: `${trade.type} ${trade.market} · ${trade.lotSize} lots @ $${trade.entryPrice || 0}`
    });
    return auth.sendJson(response, 201, { trade, account: store.accountSnapshot(storedUser, mode) });
  }

  if (pathname === "/api/trades/close" && request.method === "POST") {
    const user = await auth.currentUser(request);
    if (!user) return auth.sendJson(response, 401, { error: "Sign in to close trades." });
    const body = await auth.readJsonBody(request);
    const mode = "demo";
    const storedUser = await store.findUserById(user.id);
    const account = store.ensureAccounts(storedUser).accounts[mode];
    const tradeIndex = account.trades.findIndex((trade) => trade.id === body.id);
    if (tradeIndex === -1) {
      return auth.sendJson(response, 404, { error: "Open position not found." });
    }
    const [trade] = account.trades.splice(tradeIndex, 1);

    let currentPrice = trade.currentPrice || trade.entryPrice;
    try {
      const quote = await market.twelvePrice(trade.market);
      if (quote && Number.isFinite(Number(quote.price))) currentPrice = Number(quote.price);
    } catch {
      currentPrice = trade.currentPrice || trade.entryPrice;
    }

    const pipSize = pipSizeFor(trade.market);
    const pipVal = contractSizeFor(trade.market) * pipSize * Number(trade.lotSize || 0);
    const direction = trade.type === "BUY" ? 1 : -1;
    const pl = ((currentPrice - Number(trade.entryPrice || 0)) / pipSize) * pipVal * direction;
    account.balance = Number(account.balance || 0) + pl;
    account.tradesClosed = account.tradesClosed || [];
    account.tradesClosed.unshift({ ...trade, currentPrice, closedPl: pl, closedAt: new Date().toISOString() });

    await store.saveUser(storedUser);
    await activity.logEvent("close", {
      user: storedUser.id, name: storedUser.name, email: storedUser.email,
      mode, detail: `Closed ${trade.type} ${trade.market} · P/L $${pl.toFixed(2)}`
    });
    return auth.sendJson(response, 200, { account: store.accountSnapshot(storedUser, mode), closedPl: pl });
  }

  if (pathname === "/api/admin/overview" && request.method === "GET") {
    if (!await auth.requireAdmin(request, response)) return true;
    const users = await store.readUsers();
    const activityLog = await activity.readLog();

    const recentTrades = [];
    users.forEach((user) => {
      const accounts = user.accounts || {};
      ["demo", "live"].forEach((mode) => {
        const acc = accounts[mode] || {};
        [...(acc.trades || []), ...(acc.tradesClosed || [])].forEach((trade) => {
          recentTrades.push({
            id: trade.id,
            market: trade.market,
            user: user.name,
            email: user.email,
            type: trade.type,
            lotSize: trade.lotSize,
            entryPrice: trade.entryPrice,
            pl: trade.closedPl || trade.pl || 0,
            created: trade.created
          });
        });
      });
    });
    recentTrades.sort((a, b) => new Date(b.created) - new Date(a.created));

    return auth.sendJson(response, 200, {
      totalAccounts: users.length,
      activeTraders: users.filter((user) => user.role === "Trader").length,
      accounts: users.map(auth.publicUser),
      activity: activity.summarize(activityLog),
      recentActivity: activityLog.slice(0, 20),
      recentTrades: recentTrades.slice(0, 20)
    });
  }

  if (pathname === "/api/admin/activity" && request.method === "GET") {
    if (!await auth.requireAdmin(request, response)) return true;
    const type = requestUrl.searchParams.get("type");
    const limit = Number(requestUrl.searchParams.get("limit")) || 200;
    const email = (requestUrl.searchParams.get("email") || "").trim().toLowerCase();
    let activityLog = await activity.readLog();
    if (type && type !== "all") activityLog = activityLog.filter((entry) => entry.type === type);
    if (email) activityLog = activityLog.filter((entry) => (entry.email || "").toLowerCase() === email);
    return auth.sendJson(response, 200, { activity: activityLog.slice(0, limit), total: activityLog.length });
  }

  if (pathname === "/api/auth/me" && request.method === "GET") {
    const user = await auth.currentUser(request);
    return auth.sendJson(response, 200, { user: user ? auth.publicUser(user) : null });
  }

  if (pathname === "/api/auth/signup" && request.method === "POST") {
    const ip = auth.clientIp(request);
    const limiter = auth.rateLimit(`signup:${ip}`, SIGNUP_LIMIT.rate, SIGNUP_LIMIT.windowMs);
    if (!limiter.allowed) return limited(response, SIGNUP_LIMIT);
    const body = await auth.readJsonBody(request);
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (!name || !email || !password) {
      return auth.sendJson(response, 400, { error: "Name, email, and password are required." });
    }
    if (!auth.validateEmail(email)) {
      return auth.sendJson(response, 400, { error: "Please enter a valid email address." });
    }
    const passwordError = auth.validatePassword(password);
    if (passwordError) {
      return auth.sendJson(response, 400, { error: passwordError });
    }
    if (await store.findUserByEmail(email)) {
      return auth.sendJson(response, 409, { error: "An account with that email already exists." });
    }
    // profiles.id references auth.users, so the Supabase Auth user must exist first.
    const authUser = await store.findAuthUserByEmail(email)
      || await store.createAuthUser({ email, password, name });
    const user = {
      id: authUser.id, name, email, role: "Trader",
      passwordHash: auth.hashPassword(password),
      created: new Date().toISOString().slice(0, 10),
      accounts: {
        demo: { balance: 0, trades: [], transactions: [] },
        live: { balance: 0, trades: [], transactions: [] }
      }
    };
    await store.saveUser(user);
    await activity.logEvent("signup", {
      user: user.id, name: user.name, email: user.email, role: user.role,
      detail: `${user.name} created an account (${user.email})`
    });
    const sessionId = await auth.createSession(user);
    return auth.sendJson(response, 201, { user: auth.publicUser(user) },
      { "Set-Cookie": auth.sessionCookie(sessionId) });
  }

  if (pathname === "/api/auth/login" && request.method === "POST") {
    const ip = auth.clientIp(request);
    const limiter = auth.rateLimit(`login:${ip}`, LOGIN_LIMIT.rate, LOGIN_LIMIT.windowMs);
    if (!limiter.allowed) return limited(response, LOGIN_LIMIT);
    const body = await auth.readJsonBody(request);
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (!email || !password) {
      return auth.sendJson(response, 400, { error: "Email and password are required." });
    }
    const user = await store.findUserByEmail(email);
    if (!user || !auth.verifyPassword(password, user.passwordHash)) {
      return auth.sendJson(response, 401, { error: "Invalid email or password." });
    }
    await activity.logEvent("login", {
      user: user.id, name: user.name, email: user.email, role: user.role,
      detail: `${user.name} signed in`
    });
    const sessionId = await auth.createSession(user);
    return auth.sendJson(response, 200, { user: auth.publicUser(user) },
      { "Set-Cookie": auth.sessionCookie(sessionId) });
  }

  if (pathname === "/api/auth/logout" && request.method === "POST") {
    const user = await auth.invalidateSession(request);
    if (user) {
      await activity.logEvent("logout", {
        user: user.id, name: user.name, email: user.email, role: user.role,
        detail: `${user.name} signed out`
      });
    }
    return auth.sendJson(response, 200, { ok: true },
      { "Set-Cookie": auth.clearCookie() });
  }

  if (pathname === "/api/auth/me" && request.method === "PUT") {
    const user = await auth.currentUser(request);
    if (!user) return auth.sendJson(response, 401, { error: "Sign in to update your profile." });
    const body = await auth.readJsonBody(request);
    const newName = String(body.name || "").trim();
    if (!newName || newName.length < 1 || newName.length > 50) {
      return auth.sendJson(response, 400, { error: "Display name must be between 1 and 50 characters." });
    }
    if (newName === user.name) return auth.sendJson(response, 200, { user: auth.publicUser(user) });
    const stored = await store.findUserById(user.id);
    if (!stored) return auth.sendJson(response, 404, { error: "Account not found." });
    stored.name = newName;
    await store.saveUser(stored);
    await activity.logEvent("profile-update", {
      user: stored.id, name: stored.name, email: stored.email, role: stored.role,
      detail: `${stored.name} updated profile`
    });
    return auth.sendJson(response, 200, { user: auth.publicUser(stored) });
  }

  if (pathname === "/api/contact" && request.method === "POST") {
    const ip = auth.clientIp(request);
    const limiter = auth.rateLimit(`contact:${ip}`, CONTACT_LIMIT.rate, CONTACT_LIMIT.windowMs);
    if (!limiter.allowed) return limited(response, CONTACT_LIMIT);
    const body = await auth.readJsonBody(request);
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const message = String(body.message || "").trim();
    if (!name || !email || !message) {
      return auth.sendJson(response, 400, { error: "Please fill in all fields." });
    }
    if (!auth.validateEmail(email)) {
      return auth.sendJson(response, 400, { error: "Please enter a valid email address." });
    }
    const doc = {
      id: crypto.randomUUID(), name, email, message,
      ip, created: new Date().toISOString()
    };
    await store.saveContactMessage(doc);
    await activity.logEvent("contact", {
      name, email, detail: `Message from ${name} (${email})`
    });
    return auth.sendJson(response, 201, { ok: true });
  }

  return false;
}

module.exports = { handle };
