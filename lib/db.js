// Tiny Supabase (Postgres) helper — talks to the REST API with the server-side key.
const clean = (v) => String(v || "").trim().replace(/^["']|["']$/g, "");   // ignore stray spaces / quotes pasted into Vercel
const configured = () => !!(clean(process.env.SUPABASE_URL) && clean(process.env.SUPABASE_SERVICE_KEY));

async function db(path, { method = "GET", body, prefer } = {}) {
  const key = clean(process.env.SUPABASE_SERVICE_KEY);
  const r = await fetch(clean(process.env.SUPABASE_URL).replace(/\/$/, "") + "/rest/v1/" + path, {
    method,
    headers: {
      apikey: key,
      // legacy service_role keys are JWTs (start with "eyJ"); the newer sb_secret_ keys only go in apikey
      ...(key.startsWith("eyJ") ? { Authorization: "Bearer " + key } : {}),
      "Content-Type": "application/json",
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  const data = text ? JSON.parse(text) : null;
  if (!r.ok) throw new Error((data && data.message) || "Database error " + r.status);
  return data;
}
module.exports = { db, configured };
