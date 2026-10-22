// GET /api/status — kitchen open/closed settings, read from the "settings" table.
const { db, configured } = require("../lib/db");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (!configured()) return res.status(200).json({ kitchen: null });
  try {
    const rows = await db("settings?key=eq.kitchen&select=value");
    return res.status(200).json({ kitchen: rows && rows[0] ? rows[0].value : null });
  } catch (e) {
    return res.status(200).json({ kitchen: null });
  }
};
