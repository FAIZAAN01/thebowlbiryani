// Telegram alerts (free, instant push). Env vars: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
// (several chat ids can be separated by commas, e.g. you + your kitchen group)
const itemsText = (it) =>
  !it ? "" : typeof it === "string" ? it : Object.entries(it).map(([k, n]) => `${n} × ${k}`).join(", ");

function format(o) {
  const pay = o.paid
    ? `✅ PAID — ₹${o.total}`
    : `❌ UNPAID — collect ₹${o.total} ${o.mode === "Pickup" ? "at pickup" : "on delivery"}`;
  const where = o.mode === "Pickup" ? "🏪 Pickup" : `📍 Delivery to: ${o.address || "(no address given)"}`;
  return [
    `🛎 NEW ORDER${o.id ? " #" + o.id : ""} — The Bowl Biryani`,
    pay,
    `👤 ${o.name || "Customer"} — ${o.phone || ""}`,
    `🍗 ${itemsText(o.items)}`,
    where,
    o.when ? `🕖 For: ${o.when}` : "",
    o.notes ? `📝 ${o.notes}` : "",
  ].filter(Boolean).join("\n");
}

async function telegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN, chats = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chats) return false;
  await Promise.all(chats.split(",").map((c) => c.trim()).filter(Boolean).map((chat_id) =>
    fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id, text }),
    }).catch(() => null)));
  return true;
}
module.exports = { telegram, format };
