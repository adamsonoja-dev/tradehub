const crypto = require("crypto");
const { supabase } = require("./store");

const MAX_ENTRIES = 5000;

async function readLog() {
  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .order("timestamp", { ascending: false })
    .limit(MAX_ENTRIES);
  if (error) throw new Error(error.message);
  return data || [];
}

async function logEvent(type, payload) {
  const entry = {
    id: crypto.randomUUID(),
    type,
    timestamp: new Date().toISOString(),
    ...payload
  };
  const { count, error: countError } = await supabase
    .from("activities")
    .select("*", { count: "exact", head: true });
  if (countError) throw new Error(countError.message);
  if (Number(count || 0) >= MAX_ENTRIES) {
    const { data: oldest } = await supabase
      .from("activities")
      .select("id")
      .order("timestamp", { ascending: true })
      .limit(1);
    if (oldest && oldest.length) {
      await supabase.from("activities").delete().eq("id", oldest[0].id);
    }
  }
  const { error: insertError } = await supabase.from("activities").insert({
    id: entry.id,
    type: entry.type,
    timestamp: entry.timestamp,
    user_id: entry.user,
    name: entry.name,
    email: entry.email,
    role: entry.role,
    detail: entry.detail,
    amount: entry.amount,
    mode: entry.mode,
    ip: entry.ip
  });
  if (insertError) throw new Error(insertError.message);
  return entry;
}

function summarize(log) {
  const summarizeType = (type) => log.filter((entry) => entry.type === type).length;
  return {
    totalSignups: summarizeType("signup"),
    totalLogins: summarizeType("login"),
    totalLogouts: summarizeType("logout"),
    deposits: summarizeType("deposit"),
    withdrawals: summarizeType("withdrawal"),
    trades: summarizeType("trade")
  };
}

module.exports = { logEvent, readLog, summarize };