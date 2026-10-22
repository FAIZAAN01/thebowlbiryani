// POST /api/create-order  — builds the price on the server and creates a Razorpay order.
// Needs env vars: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET

const P = [180, 360, 90];            // 500 g, 1 kg, 250 g  (same order as the website)
const DS = [0.10, 0.15, 0.05];       // discounts for 500 g, 1 kg, 250 g
const E = P.map((x, i) => Math.round(x * (1 - DS[i])));
const NAMES = ["500 g", "1 kg", "250 g"];

const clip = (v, n) => String(v == null ? "" : v).replace(/[\r\n]+/g, " ").trim().slice(0, n);

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  try {
    const b = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};

    const q = Array.isArray(b.q) ? b.q.map((n) => Math.floor(Number(n))) : [];
    if (q.length !== 3 || q.some((n) => !Number.isFinite(n) || n < 0 || n > 20))
      return res.status(400).json({ error: "Invalid order." });
    const total = q.reduce((s, n, i) => s + n * E[i], 0);
    if (total <= 0) return res.status(400).json({ error: "Your cart is empty." });

    // Orders accepted 7:00 AM – 2:00 PM India time
    const [h, m] = new Date()
      .toLocaleTimeString("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .split(":").map(Number);
    const mins = h * 60 + m;
    if (mins < 420 || mins >= 1440)
      return res.status(400).json({ error: "Orders are accepted between 7 AM and 2 PM." });

    const mode = b.mode === "Pickup" ? "Pickup" : "Delivery";
    const date = clip(b.date, 10), time = clip(b.time, 5);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time) || time < "19:00")
      return res.status(400).json({ error: "Please choose a date and a time from 7:00 PM." });
    const name = clip(b.name, 80), phone = clip(b.phone, 20);
    if (!name || !phone) return res.status(400).json({ error: "Name and phone are required." });

    const keyId = process.env.RAZORPAY_KEY_ID, secret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !secret) return res.status(500).json({ error: "Online payment is not set up yet." });

    const items = q.map((n, i) => (n ? `${n} x ${NAMES[i]}` : "")).filter(Boolean).join(", ");
    const r = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + Buffer.from(keyId + ":" + secret).toString("base64"),
      },
      body: JSON.stringify({
        amount: total * 100, // paise
        currency: "INR",
        receipt: "BB" + Date.now(),
        notes: {
          items,
          name,
          phone,
          type: mode,
          when: `${date} ${time}`,
          address: clip(b.address, 240),
          note: clip(b.notes, 240),
        },
      }),
    });
    const d = await r.json();
    if (!r.ok) return res.status(502).json({ error: (d.error && d.error.description) || "Payment provider error." });
    return res.status(200).json({ orderId: d.id, amount: d.amount, keyId });
  } catch (e) {
    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }
};
