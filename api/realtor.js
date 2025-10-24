
// Serverless function: /api/realtor
// Hides your RapidAPI key and proxies only realtor.com URLs.

export default async function handler(req, res) {
  // --- CORS (lock this down to your GHL domain when you know it) ---
  const allowOrigin = process.env.ALLOWED_ORIGIN || "*";
  res.setHeader("Access-Control-Allow-Origin", allowOrigin);
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { url } = req.query || {};
  if (!url) return res.status(400).json({ error: "Missing url" });

  // --- Safety: only allow realtor.com hosts ---
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    const allowed = host === "www.realtor.com" || host === "realtor.com";
    if (!allowed) return res.status(400).json({ error: "Only realtor.com URLs are allowed" });
  } catch {
    return res.status(400).json({ error: "Invalid url" });
  }

  try {
    const upstream = await fetch(
      `https://realtor16.p.rapidapi.com/property/details?url=${encodeURIComponent(url)}`,
      {
        headers: {
          "x-rapidapi-key": process.env.RAPIDAPI_KEY, // <-- stays secret
          "x-rapidapi-host": "realtor16.p.rapidapi.com",
        },
      }
    );

    const text = await upstream.text();
    // Pass through status/content-type for easier debugging
    res.status(upstream.status);
    const ct = upstream.headers.get("content-type") || "application/json";
    res.setHeader("content-type", ct);
    res.send(text);
  } catch (e) {
    res.status(500).json({ error: "Upstream error", details: String(e) });
  }
}
