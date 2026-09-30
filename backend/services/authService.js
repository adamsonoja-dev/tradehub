const crypto = require("crypto");
const { sessionSecret, isProduction } = require("../config");

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const SESSION_SECRET = sessionSecret || "candleflow-dev-secret-change-me";

const rateLimitBuckets = new Map();

function rateLimit(key, limit, windowMs) {
  const now = Date.now();
  const entry = rateLimitBuckets.get(key);
  const resetAt = entry ? entry.resetAt : now + windowMs;
  if (!entry || now > resetAt) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }
  const count = entry.count + 1;
  rateLimitBuckets.set(key, { count, resetAt });
  return { allowed: count <= limit, remaining: Math.max(0, limit - count), resetAt };
}

function clientIp(request) {
  const forwarded = request.headers["x-forwarded-for"];
  if (forwarded) return String(forwarded).split(",")[0].trim();
  return request.socket.remoteAddress || "unknown";
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

function validatePassword(password) {
  if (typeof password !== "string" || password.length < 8) {
    return "Password must be at least 8 characters.";
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return "Password must contain at least one letter and one number.";
  }
  return null;
}

function sign(value) {
  return crypto.createHmac("sha256", SESSION_SECRET).update(value).digest("base64url");
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  const [salt, hash] = String(storedHash || "").split(":");
  if (!salt || !hash) return false;
  const derivedHash = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(derivedHash, "hex"));
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role, created: user.created };
}

function parseCookies(request) {
  return Object.fromEntries((request.headers.cookie || "").split(";").filter(Boolean).map((cookie) => {
    const [name, ...value] = cookie.trim().split("=");
    if (!name) return null;
    let decoded;
    try { decoded = decodeURIComponent(value.join("=")); } catch { decoded = value.join("="); }
    return [name, decoded];
  }).filter(Boolean));
}

async function createSession(user) {
  if (!user.sessionNonce) {
    user.sessionNonce = crypto.randomBytes(16).toString("hex");
    const store = require("./store");
    await store.saveUser(user);
  }
  const payload = Buffer.from(JSON.stringify({
    uid: user.id,
    n: user.sessionNonce,
    exp: Date.now() + SESSION_TTL_MS
  })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

async function currentUser(request) {
  const token = parseCookies(request).candleflow_session;
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = sign(payload);
  const expectedBuf = Buffer.from(expected);
  const sigBuf = Buffer.from(sig);
  if (expectedBuf.length !== sigBuf.length || !crypto.timingSafeEqual(expectedBuf, sigBuf)) return null;
  let data;
  try {
    data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!data.uid || Date.now() > data.exp) return null;
  const store = require("./store");
  const user = await store.findUserById(data.uid);
  if (!user) return null;
  if (data.n && user.sessionNonce !== data.n) return null;
  return user;
}

async function invalidateSession(request) {
  const user = await currentUser(request);
  if (user) {
    user.sessionNonce = crypto.randomBytes(16).toString("hex");
    const store = require("./store");
    await store.saveUser(user);
  }
  return user;
}

function sessionCookie(sessionId) {
  const secure = isProduction ? "; Secure" : "";
  return `candleflow_session=${sessionId}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}${secure}`;
}

function clearCookie() {
  const secure = isProduction ? "; Secure" : "";
  return `candleflow_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`;
}

function sendJson(response, statusCode, payload, headers = {}) {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8", ...headers });
  response.end(JSON.stringify(payload));
  return true;
}

async function requireAdmin(request, response) {
  const user = await currentUser(request);
  if (!user || user.role !== "Admin") {
    sendJson(response, 403, { error: "Admin access required." });
    return null;
  }
  return user;
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    let settled = false;
    const fail = (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };
    const succeed = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    request.on("data", (chunk) => {
      if (body.length <= 100000) body += chunk;
      if (body.length > 100000) fail(new Error("Request body too large"));
    });
    request.on("end", () => {
      try { succeed(body ? JSON.parse(body) : {}); } catch { fail(new Error("Invalid JSON")); }
    });
    request.on("error", fail);
  });
}

module.exports = {
  hashPassword,
  verifyPassword,
  publicUser,
  parseCookies,
  currentUser,
  createSession,
  invalidateSession,
  sessionCookie,
  clearCookie,
  sendJson,
  requireAdmin,
  readJsonBody,
  rateLimit,
  clientIp,
  validateEmail,
  validatePassword
};
