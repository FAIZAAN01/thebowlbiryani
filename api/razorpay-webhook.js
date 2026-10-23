// POST /api/razorpay-webhook — Razorpay tells us a payment succeeded (works even if the customer closed the page).
// Env var: RAZORPAY_WEBHOOK_SECRET (the secret you typed when creating the webhook in Razorpay)
const crypto = require("crypto");
const { markPaidAndNotify } = require("../lib/pay");

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();
  try {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const raw = Buffer.concat(chunks).toString("utf8");
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET, sig = String(req.headers["x-razorpay-signature"] || "");
    if (!secret) return res.status(500).json({ ok: false });
    const exp = crypto.createHmac("sha256", secret).update(raw).digest("hex");
    if (exp.length !== sig.length || !crypto.timingSafeEqual(Buffer.from(exp), Buffer.from(sig)))
      return res.status(400).json({ ok: false });
    const ev = JSON.parse(raw), pay = ev.payload && ev.payload.payment && ev.payload.payment.entity;
    if ((ev.event === "order.paid" || ev.event === "payment.captured") && pay && pay.order_id)
      await markPaidAndNotify(pay.order_id, pay.id);
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(200).json({ ok: false }); // 200 so Razorpay doesn't keep retrying on our own bugs
  }
};
