// Marks an online order as paid and sends the alert — exactly once, whichever of
// /api/verify-payment or the Razorpay webhook gets there first.
const { db, configured } = require("./db");
const { telegram, format } = require("./notify");

async function rzpOrder(id) {
  const k = process.env.RAZORPAY_KEY_ID || process.env.key_id, s = process.env.RAZORPAY_KEY_SECRET || process.env.key_secret;
  if (!k || !s) return null;
  const r = await fetch("https://api.razorpay.com/v1/orders/" + encodeURIComponent(id), {
    headers: { Authorization: "Basic " + Buffer.from(k + ":" + s).toString("base64") },
  });
  return r.ok ? r.json() : null;
}

async function markPaidAndNotify(orderId, payId) {
  let o = null;
  if (configured()) {
    try {
      const q = "orders?razorpay_order_id=eq." + encodeURIComponent(orderId);
      const r = await db(q + "&payment_status=neq.paid", { method: "PATCH", prefer: "return=representation",
        body: { payment_status: "paid", razorpay_payment_id: payId } });
      if (r && r[0]) {
        const x = r[0];
        o = { id: x.id, name: x.name, phone: x.phone, items: x.items, total: x.total, mode: x.mode, when: x.deliver_at, address: x.address, notes: x.notes };
      } else {
        const e = await db(q + "&select=id");
        if (e && e[0]) return { duplicate: true };       // already marked paid and notified
      }
    } catch (e) { /* fall back to the Razorpay order below */ }
  }
  if (!o) {
    const ro = await rzpOrder(orderId);
    if (!ro) return { error: true };
    const n = ro.notes || {};
    o = { name: n.name, phone: n.phone, items: n.items, total: ro.amount / 100, mode: n.type, when: n.when, address: n.address, notes: n.note };
  }
  o.paid = true; o.payId = payId;
  await telegram(format(o));
  return { notified: true };
}
module.exports = { markPaidAndNotify };
