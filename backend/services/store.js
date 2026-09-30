const { createClient } = require("@supabase/supabase-js");
const { supabase: supabaseConfig, admin } = require("../config");

if (!supabaseConfig.url || !supabaseConfig.serviceRoleKey) {
  throw new Error(
    "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file."
  );
}

const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});

async function connect() {
  return supabase;
}

function emptyAccounts() {
  return {
    demo: { balance: 0, trades: [], tradesClosed: [], transactions: [] },
    live: { balance: 0, trades: [], tradesClosed: [], transactions: [] }
  };
}

async function findAuthUserByEmail(email) {
  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(error.message);
    const match = data.users.find((user) => user.email === email);
    if (match) return match;
    if (page * perPage >= data.total) return null;
    page++;
  }
}

async function seedAdmin() {
  let authUser = await findAuthUserByEmail(admin.email);

  if (!authUser) {
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email: admin.email,
      password: admin.password,
      email_confirm: true,
      user_metadata: { name: "Admin User" }
    });
    if (createError) {
      throw new Error(`Could not seed admin account: ${createError.message}`);
    }
    authUser = created.user;
  } else {
    await supabase.auth.admin.updateUserById(authUser.id, {
      password: admin.password,
      email_confirm: true,
      user_metadata: { name: "Admin User" }
    });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", authUser.id)
    .maybeSingle();

  const row = {
    id: authUser.id,
    name: "Admin User",
    email: admin.email,
    role: "Admin",
    created: new Date().toISOString().slice(0, 10)
  };
  const { hashPassword } = require("./authService");
  const insert = { ...row, accounts: emptyAccounts(), passwordhash: hashPassword(admin.password) };
  const write = profile
    ? supabase.from("profiles").update(insert).eq("id", authUser.id)
    : supabase.from("profiles").insert(insert);
  const { error: writeError } = await write;
  if (writeError) throw new Error(`Could not seed admin profile: ${writeError.message}`);
  console.log(`Admin ready: ${admin.email}`);
}

async function createAuthUser({ email, password, name }) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name }
  });
  if (error) throw new Error(`Could not create the account: ${error.message}`);
  return data.user;
}

async function readUsers() {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created", { ascending: true });
  if (error) throw new Error(error.message);
  data.forEach(ensureAccounts);
  return data;
}

async function findUserByEmail(email) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("email", email)
    .maybeSingle();
  if (error || !data) return null;
  return ensureAccounts(data);
}

async function findUserById(id) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return ensureAccounts(data);
}

// Postgres folds unquoted column names to lowercase, so the stored columns are
// passwordhash/sessionnonce. Expose them under their camelCase names for the app.
function ensureProfileFields(user) {
  if (user.passwordHash === undefined && user.passwordhash !== undefined) {
    user.passwordHash = user.passwordhash;
  }
  if (user.sessionNonce === undefined && user.sessionnonce !== undefined) {
    user.sessionNonce = user.sessionnonce;
  }
  return user;
}

function ensureAccounts(user) {
  ensureProfileFields(user);
  user.accounts = user.accounts || emptyAccounts();
  user.accounts.demo = user.accounts.demo || { balance: 0, trades: [], tradesClosed: [], transactions: [] };
  user.accounts.live = user.accounts.live || { balance: 0, trades: [], tradesClosed: [], transactions: [] };
  user.accounts.demo.tradesClosed = user.accounts.demo.tradesClosed || [];
  user.accounts.live.tradesClosed = user.accounts.live.tradesClosed || [];
  user.accounts.demo.transactions = user.accounts.demo.transactions || [];
  user.accounts.live.transactions = user.accounts.live.transactions || [];
  return user;
}

function accountSnapshot(user, mode) {
  const account = ensureAccounts(user).accounts[mode];
  return { mode, balance: account.balance, trades: account.trades, tradesClosed: account.tradesClosed, transactions: account.transactions };
}

async function saveUser(user) {
  const row = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    created: user.created,
    accounts: user.accounts || emptyAccounts()
  };
  if (user.passwordHash) row.passwordhash = user.passwordHash;
  if (user.sessionNonce) row.sessionnonce = user.sessionNonce;
  const { error } = await supabase.from("profiles").upsert(row, { onConflict: "id" });
  if (error) throw new Error(error.message);
  return user;
}

async function saveContactMessage(message) {
  const { error } = await supabase.from("contacts").insert(message);
  if (error) throw new Error(error.message);
  return message;
}

module.exports = {
  supabase,
  connect,
  seedAdmin,
  createAuthUser,
  findAuthUserByEmail,
  readUsers,
  findUserByEmail,
  findUserById,
  ensureAccounts,
  accountSnapshot,
  saveUser,
  saveContactMessage
};