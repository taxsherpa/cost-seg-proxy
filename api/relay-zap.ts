// api/relay-zap.ts
export const config = { runtime: "edge" }; // Use Node if you prefer

const ALLOWLIST = [
  "https://www.taxsherpa.com",
  "https://taxsherpa.com",
  // add your GoHighLevel page origin(s) if different, e.g.:
  // "https://your-subdomain.gohighlevel.com"
];

function corsHeaders(origin = "*") {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

function isAllowed(origin: string | null) {
  if (!origin) return false;
  return ALLOWLIST.some((o) => origin.toLowerCase().startsWith(o.toLowerCase()));
}

export default async function handler(req: Request) {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin || "*") });
  }
  if (!isAllowed(origin)) {
    return new Response("Forbidden origin", { status: 403, headers: corsHeaders(origin || "*") });
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400, headers: corsHeaders(origin || "*") });
  }

  const email = payload?.lead?.email;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
    return new Response("Missing/invalid email", { status: 400, headers: corsHeaders(origin || "*") });
  }

  // Optional: very light abuse guard
  if (JSON.stringify(payload).length > 300_000) {
    return new Response("Payload too large", { status: 413, headers: corsHeaders(origin || "*") });
  }

  // Forward to Zapier
  const zapUrl = process.env.ZAPIER_HOOK_URL; // set in Vercel → Settings → Environment Variables
  if (!zapUrl) {
    return new Response("Server not configured", { status: 500, headers: corsHeaders(origin || "*") });
  }

  const upstream = await fetch(zapUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const text = await upstream.text(); // Zapier usually returns JSON but text keeps it robust
  const status = upstream.ok ? 200 : 502;

  return new Response(text, { status, headers: { ...corsHeaders(origin || "*"), "Content-Type": "application/json" } });
}
