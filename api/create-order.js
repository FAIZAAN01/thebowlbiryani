// POST /api/create-order — creates a Razorpay order and saves the order as "pending".
// Needs env vars: RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET (or key_id + key_secret)
const { parse, readBody } = require("../lib/order");
const { db, configured } = require("../lib/db");

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  try {
    const { order, error } = parse(readBody(req));
    if (error) return res.status(400).json({ error });

    const keyId = process.env.RAZORPAY_KEY_ID || process.env.key_id,
      secret = process.env.RAZORPAY_KEY_SECRET || process.env.key_secret;
    if (!keyId || !secret) return res.status(500).json({ error: "Online payment is not set up yet." });

    const r = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Basic " + Buffer.from(keyId + ":" + secret).toString("base64") },
      body: JSON.stringify({
        amount: order.total * 100, currency: "INR", receipt: "BB" + Date.now(),
        notes: { items: order.summary, name: order.name, phone: order.phone, type: order.mode, when: order.deliver_at, address: order.address, note: order.notes },
      }),
    });
    const d = await r.json();
    if (!r.ok) return res.status(502).json({ error: (d.error && d.error.description) || "Payment provider error." });

    if (configured()) {
      try {
        const { summary, ...row } = order;
        await db("orders", { method: "POST", prefer: "return=minimal",
          body: { ...row, payment_method: "online", payment_status: "pending", razorpay_order_id: d.id } });
      } catch (e) { /* payment can still go ahead; details are also in the Razorpay order notes */ }
    }
    return res.status(200).json({ orderId: d.id, amount: d.amount, keyId });
  } catch (e) {
    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }
};
