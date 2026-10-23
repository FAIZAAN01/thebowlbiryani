// GET /api/health — shows what is set up correctly (never shows your secret values). Delete this file when you're done testing.
const { db, configured } = require("../lib/db");
const has = (...n) => n.some((k) => !!process.env[k]);

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const url = String(process.env.SUPABASE_URL || "").trim(), key = String(process.env.SUPABASE_SERVICE_KEY || "").trim();
  let keyType = key ? "unknown format" : "MISSING";
  if (key.startsWith("sb_secret_")) keyType = "secret key (good)";
  else if (key.startsWith("sb_publishable_")) keyType = "PUBLISHABLE key — WRONG, use the secret key";
  else if (key.startsWith("eyJ")) {
    try { keyType = "legacy key, role = " + JSON.parse(Buffer.from(key.split(".")[1], "base64").toString()).role + " (must be service_role)"; }
    catch (e) { keyType = "legacy key (could not read)"; }
  }
  const out = {
    supabaseUrl: !url ? "MISSING" : /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url) ? "looks right" : "LOOKS WRONG — should be like https://abcdxyz.supabase.co",
    supabaseKey: keyType,
    razorpayKeys: has("RAZORPAY_KEY_ID", "key_id") && has("RAZORPAY_KEY_SECRET", "key_secret") ? "set" : "MISSING",
    razorpayWebhookSecret: has("RAZORPAY_WEBHOOK_SECRET") ? "set" : "not set (optional)",
    telegram: has("TELEGRAM_BOT_TOKEN") && has("TELEGRAM_CHAT_ID") ? "set" : "not set",
  };
  if (configured()) {
    for (const t of ["orders", "settings"]) {
      try { await db(`${t}?select=*&limit=1`); out[t + "Table"] = "OK"; }
      catch (e) { out[t + "Table"] = "ERROR: " + e.message; }
    }
  }
  res.status(200).json(out);
};
