// POST /api/verify-payment — checks Razorpay's signature, then marks the order paid and alerts you.
const crypto = require("crypto");
const { markPaidAndNotify } = require("../lib/pay");

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
    if (ok) { try { await markPaidAndNotify(o, p); } catch (e) { /* payment is still valid */ } }
    return res.status(ok ? 200 : 400).json({ ok });
  } catch (e) {
    return res.status(400).json({ ok: false });
  }
};
