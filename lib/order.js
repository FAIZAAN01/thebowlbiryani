// Shared order rules (prices are always calculated here, never trusted from the browser).
const P = [180, 360, 90];                 // 500 g, 1 kg, 250 g  (same order as the website)
const DS = [0.10, 0.15, 0.05];            // discounts for 500 g, 1 kg, 250 g
const NAMES = ["500 g", "1 kg", "250 g"];
const E = P.map((x, i) => Math.round(x * (1 - DS[i])));
const OPEN_FROM = 420, OPEN_TO = 1080;    // minutes after midnight, India time: 7:00 AM – 6:00 PM (TESTING; normal is 840 = 2:00 PM)

const clip = (v, n) => String(v == null ? "" : v).replace(/[\r\n]+/g, " ").trim().slice(0, n);
const readBody = (req) => (typeof req.body === "string" ? JSON.parse(req.body) : req.body || {});

function parse(b) {
  const q = Array.isArray(b.q) ? b.q.map((n) => Math.floor(Number(n))) : [];
  if (q.length !== 3 || q.some((n) => !Number.isFinite(n) || n < 0 || n > 20)) return { error: "Invalid order." };
  const total = q.reduce((s, n, i) => s + n * E[i], 0);
  if (total <= 0) return { error: "Your cart is empty." };

  const [h, m] = new Date()
    .toLocaleTimeString("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .split(":").map(Number);
  const mins = h * 60 + m;
  if (mins < OPEN_FROM || mins >= OPEN_TO) return { error: "Orders are accepted between 7 AM and 6 PM." };

  const date = clip(b.date, 10), time = clip(b.time, 5);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time) || time < "19:00")
    return { error: "Please choose a date and a time from 7:00 PM." };
  const name = clip(b.name, 80), phone = clip(b.phone, 20);
  if (!name || !phone) return { error: "Name and phone are required." };

  const items = {};
  q.forEach((n, i) => { if (n) items[NAMES[i]] = n; });
  return {
    order: {
      name, phone,
      mode: b.mode === "Pickup" ? "Pickup" : "Delivery",
      address: clip(b.address, 240),
      notes: clip(b.notes, 240),
      deliver_at: `${date} ${time}`,
      items, total,
      summary: Object.entries(items).map(([k, n]) => `${n} x ${k}`).join(", "),
    },
  };
}
module.exports = { parse, readBody };
