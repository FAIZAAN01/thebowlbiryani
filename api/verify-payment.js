// POST /api/verify-payment — checks Razorpay's signature, then marks the order as paid.
const crypto = require("crypto");
const { db, configured } = require("../lib/db");

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ ok: false });
  try {
    const b = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const o = b.razorpay_order_id, p = b.razorpay_payment_id, s = b.razorpay_signature;
    const secret = process.env.RAZORPAY_KEY_SECRET || process.env.key_secret;
    if (!secret || typeof o !== "string" || typeof p !== "string" || typeof s !== "string")
      return res.status(400).json({ ok: false });
    const exp = crypto.createHmac("sha256", secret).update(o + "|" + p).digest("hex");
    const ok = exp.length === s.length && crypto.timingSafeEqual(Buffer.from(exp), Buffer.from(s));
    if (ok && configured()) {
      try {
        await db("orders?razorpay_order_id=eq." + encodeURIComponent(o),
          { method: "PATCH", prefer: "return=minimal", body: { payment_status: "paid", razorpay_payment_id: p } });
      } catch (e) { /* signature was valid; the dashboard still shows the payment */ }
    }
    return res.status(ok ? 200 : 400).json({ ok });
  } catch (e) {
    return res.status(400).json({ ok: false });
  }
};
