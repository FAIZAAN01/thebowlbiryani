// POST /api/place-order — saves a pay-on-delivery order and alerts you.
const { parse, readBody } = require("../lib/order");
const { db, configured } = require("../lib/db");
const { telegram, format } = require("../lib/notify");

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  try {
    const { order, error } = parse(readBody(req));
    if (error) return res.status(400).json({ error });
    let id = null;
    if (configured()) {
      const { summary, ...row } = order;
      const saved = await db("orders", { method: "POST", prefer: "return=representation",
        body: { ...row, payment_method: "cod", payment_status: "pay_on_delivery" } });
      id = saved && saved[0] && saved[0].id;
    }
    await telegram(format({ id, name: order.name, phone: order.phone, items: order.items, total: order.total,
      mode: order.mode, when: order.deliver_at, address: order.address, notes: order.notes, paid: false }));
    return res.status(200).json({ ok: true, id });
  } catch (e) {
    return res.status(500).json({ error: "Could not save your order. Please try again." });
  }
};
