// POST /api/place-order — saves a pay-on-delivery order.
const { parse, readBody } = require("../lib/order");
const { db, configured } = require("../lib/db");

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  try {
    const { order, error } = parse(readBody(req));
    if (error) return res.status(400).json({ error });
    if (!configured()) return res.status(200).json({ ok: true, saved: false });
    const { summary, ...row } = order;
    const saved = await db("orders", {
      method: "POST", prefer: "return=representation",
      body: { ...row, payment_method: "cod", payment_status: "pay_on_delivery" },
    });
    return res.status(200).json({ ok: true, saved: true, id: saved && saved[0] && saved[0].id });
  } catch (e) {
    return res.status(500).json({ error: "Could not save your order. Please try again." });
  }
};
