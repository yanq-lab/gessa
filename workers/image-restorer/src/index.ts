export interface Env {
  AI: Ai;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  CLERK_SECRET_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

const SUPABASE_URL = "https://khqngwvvcoosqgtpmdan.supabase.co";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Max-Age": "86400",
};

const FAITHFUL_PROMPT = `Professional digital reproduction of a physical artwork from a photograph.

CRITICAL CROPPING RULES:
- Crop EXACTLY to the edges of the artwork itself — the painted or drawn surface.
- Remove 100% of the frame, mat, border, wall, table, easel, floor, and any background surface.
- The artwork boundary is where the physical painting/drawing ends. This is the crop line.
- Do NOT leave any border, margin, or non-artwork area around the edges.

RESTORATION RULES:
- Straighten the artwork to be perfectly rectangular.
- Correct perspective distortion so the artwork appears front-facing.
- Even out lighting, remove glare, shadows, and camera color cast.
- Do NOT change the artwork itself: preserve composition, brushwork, texture, colors, signature, and all marks.
- Do NOT repaint, reinterpret, stylize, beautify, or invent any details.
- The result should look like a professional museum-quality scan of the artwork — nothing more, nothing less.`;

const CREDIT_PACKAGES = [
  { id: "starter", credits: 5, price: 1000, label: "Starter" },
  { id: "creator", credits: 20, price: 3000, label: "Creator" },
  { id: "studio", credits: 50, price: 6000, label: "Studio" },
];

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function serviceRoleHeaders(serviceKey: string): Record<string, string> {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
  };
}

async function supabaseServiceGet(env: Env, path: string) {
  const res = await fetch(`${SUPABASE_URL}${path}`, { headers: serviceRoleHeaders(env.SUPABASE_SERVICE_ROLE_KEY) });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase GET ${path}: ${res.status} ${err}`);
  }
  return res;
}

async function supabaseServiceJson(env: Env, path: string, method: string, body?: unknown) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    method,
    headers: {
      ...serviceRoleHeaders(env.SUPABASE_SERVICE_ROLE_KEY),
      "Content-Type": "application/json",
      ...(method === "PATCH" || method === "GET" ? { Prefer: "return=representation" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase ${method} ${path}: ${res.status} ${err}`);
  }
  if (method === "GET") {
    const text = await res.text();
    return text ? JSON.parse(text) : [];
  }
  return null;
}

async function verifyClerkToken(token: string, env: Env): Promise<{ userId: string; email?: string }> {
  const res = await fetch("https://api.clerk.dev/v1/sessions/verify", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.CLERK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token }),
  });
  if (!res.ok) {
    throw new Error(`Clerk auth failed: ${res.status}`);
  }
  const data = (await res.json()) as { user_id: string; status: string };
  if (data.status !== "active") {
    throw new Error("Session not active");
  }
  return { userId: data.user_id };
}

async function getOrCreateUser(env: Env, userId: string, email?: string) {
  const existing = await supabaseServiceJson(env, `/rest/v1/User?id=eq.${userId}&select=*`, "GET") as Array<{ id: string; credits: number }>;
  if (existing.length) {
    return existing[0];
  }
  await supabaseServiceJson(env, "/rest/v1/User", "POST", {
    id: userId,
    email,
    credits: 1,
    createdAt: new Date().toISOString(),
  });
  return { id: userId, credits: 1 };
}

function extractStoragePath(imageUrl: string): string {
  try {
    const u = new URL(imageUrl);
    const parts = u.pathname.split("/");
    const idx = parts.indexOf("artworks");
    if (idx >= 0) return parts.slice(idx + 1).join("/");
  } catch {}
  return imageUrl;
}

async function downloadImage(env: Env, storagePath: string): Promise<{ dataUri: string; size: number }> {
  console.log("[Worker] Downloading image:", storagePath);
  const url = `${SUPABASE_URL}/storage/v1/object/artworks/${storagePath}`;
  const res = await fetch(url, { headers: serviceRoleHeaders(env.SUPABASE_SERVICE_ROLE_KEY) });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to download image: ${res.status} ${err}`);
  }
  const blob = await res.blob();
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let bin = "";
  const chunkSize = 65536;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
  }
  const b64 = btoa(bin);
  const mime = blob.type || "image/jpeg";
  return { dataUri: `data:${mime};base64,${b64}`, size: blob.size };
}

async function uploadImage(env: Env, userId: string, artworkId: string, imageBytes: Uint8Array): Promise<string> {
  const ts = Date.now();
  const objectPath = `${userId}/artworks/${artworkId}/restored-${ts}.png`;
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/artworks/${objectPath}`, {
    method: "POST",
    headers: { ...serviceRoleHeaders(env.SUPABASE_SERVICE_ROLE_KEY), "Content-Type": "image/png" },
    body: imageBytes,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to upload: ${res.status} ${err}`);
  }
  return `${SUPABASE_URL}/storage/v1/object/public/artworks/${objectPath}`;
}

async function handleRestore(request: Request, env: Env): Promise<Response> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ ok: false, error: { code: "UNAUTHORIZED", message: "Missing authorization" } }, 401);
  }
  const token = authHeader.replace("Bearer ", "");

  let userId: string;
  try {
    const clerkUser = await verifyClerkToken(token, env);
    userId = clerkUser.userId;
  } catch {
    return json({ ok: false, error: { code: "UNAUTHORIZED", message: "Invalid authentication" } }, 401);
  }

  let body: { artworkId?: string };
  try {
    body = (await request.json()) as { artworkId?: string };
  } catch {
    return json({ ok: false, error: { code: "INVALID_JSON", message: "Invalid request body" } }, 400);
  }
  const { artworkId } = body;
  if (!artworkId) {
    return json({ ok: false, error: { code: "MISSING_ARTWORK_ID", message: "artworkId is required" } }, 400);
  }

  const user = await getOrCreateUser(env, userId);
  if (user.credits < 1) {
    return json({ ok: false, error: { code: "NO_CREDITS", message: "Insufficient credits. Please purchase more." } }, 402);
  }

  const artwork = (await supabaseServiceJson(env, `/rest/v1/Artwork?id=eq.${artworkId}&select=id,userId,originalImageUrl,status`, "GET")) as Array<{
    id: string;
    userId: string;
    originalImageUrl: string | null;
    status: string;
  }>;
  if (!artwork.length) {
    return json({ ok: false, error: { code: "ARTWORK_NOT_FOUND", message: "Artwork not found" } }, 404);
  }
  const art = artwork[0];

  if (art.userId !== userId) {
    return json({ ok: false, error: { code: "FORBIDDEN", message: "You do not own this artwork" } }, 403);
  }

  if (!art.originalImageUrl) {
    return json({ ok: false, error: { code: "NO_IMAGE", message: "No original image found" } }, 400);
  }

  await supabaseServiceJson(env, `/rest/v1/User?id=eq.${userId}`, "PATCH", { credits: user.credits - 1 });
  await supabaseServiceJson(env, `/rest/v1/Artwork?id=eq.${artworkId}`, "PATCH", { status: "processing" });

  try {
    const storagePath = extractStoragePath(art.originalImageUrl);
    const { dataUri, size } = await downloadImage(env, storagePath);

    console.log("[Worker] Calling Workers AI...");
    const aiResponse = await env.AI.run(
      "openai/gpt-image-2",
      {
        prompt: FAITHFUL_PROMPT,
        quality: "auto",
        size: "1024x1024",
        images: [dataUri],
      },
      { gateway: { id: "default" } }
    );

    const result = aiResponse as { state?: string; result?: { image?: string }; error?: string };
    if (result.error) {
      throw new Error(`AI error: ${result.error}`);
    }

    const generatedUrl = result.result?.image;
    if (!generatedUrl) {
      throw new Error("No image returned from AI");
    }

    const imgRes = await fetch(generatedUrl);
    if (!imgRes.ok) {
      throw new Error(`Failed to download generated image: ${imgRes.status}`);
    }
    const imgBuf = await imgRes.arrayBuffer();
    const imgBytes = new Uint8Array(imgBuf);

    const restoredUrl = await uploadImage(env, userId, artworkId, imgBytes);

    await supabaseServiceJson(env, `/rest/v1/Artwork?id=eq.${artworkId}`, "PATCH", {
      status: "ready",
      restoredImageUrl: restoredUrl,
    });

    return json({
      ok: true,
      job: {
        status: "ready",
        restoredUrl,
        remainingCredits: user.credits - 1,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Worker] Restore failed:", message);
    await supabaseServiceJson(env, `/rest/v1/User?id=eq.${userId}`, "PATCH", { credits: user.credits }).catch(() => {});
    await supabaseServiceJson(env, `/rest/v1/Artwork?id=eq.${artworkId}`, "PATCH", { status: "uploaded" }).catch(() => {});
    return json({ ok: false, error: { code: "RESTORE_FAILED", message } }, 500);
  }
}

async function handleCredits(request: Request, env: Env): Promise<Response> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ ok: false, error: { code: "UNAUTHORIZED", message: "Missing authorization" } }, 401);
  }
  const token = authHeader.replace("Bearer ", "");

  let userId: string;
  try {
    const clerkUser = await verifyClerkToken(token, env);
    userId = clerkUser.userId;
  } catch {
    return json({ ok: false, error: { code: "UNAUTHORIZED", message: "Invalid authentication" } }, 401);
  }

  const user = await getOrCreateUser(env, userId);
  return json({ ok: true, credits: user.credits });
}

async function handleStripeCheckout(request: Request, env: Env): Promise<Response> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ ok: false, error: { code: "UNAUTHORIZED", message: "Missing authorization" } }, 401);
  }
  const token = authHeader.replace("Bearer ", "");

  let userId: string;
  try {
    const clerkUser = await verifyClerkToken(token, env);
    userId = clerkUser.userId;
  } catch {
    return json({ ok: false, error: { code: "UNAUTHORIZED", message: "Invalid authentication" } }, 401);
  }

  let body: { packageId?: string; successUrl?: string; cancelUrl?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ ok: false, error: { code: "INVALID_JSON", message: "Invalid request body" } }, 400);
  }

  const pkg = CREDIT_PACKAGES.find((p) => p.id === body.packageId);
  if (!pkg) {
    return json({ ok: false, error: { code: "INVALID_PACKAGE", message: "Invalid package ID" } }, 400);
  }

  const params = new URLSearchParams();
  params.append("mode", "payment");
  params.append("success_url", body.successUrl || "https://gessa.art/account?success=true");
  params.append("cancel_url", body.cancelUrl || "https://gessa.art/pricing?canceled=true");
  params.append("line_items[0][price_data][currency]", "usd");
  params.append("line_items[0][price_data][product_data][name]", `${pkg.label} Package`);
  params.append("line_items[0][price_data][product_data][description]", `${pkg.credits} restoration credits`);
  params.append("line_items[0][price_data][unit_amount]", String(pkg.price));
  params.append("line_items[0][quantity]", "1");
  params.append("metadata[userId]", userId);
  params.append("metadata[packageId]", pkg.id);
  params.append("metadata[credits]", String(pkg.credits));

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    return json({ ok: false, error: { code: "STRIPE_ERROR", message: err } }, 500);
  }

  const session = (await res.json()) as { url: string };
  return json({ ok: true, url: session.url });
}

async function handleStripeWebhook(request: Request, env: Env): Promise<Response> {
  const payload = await request.text();
  const sig = request.headers.get("stripe-signature");
  if (!sig) {
    return json({ error: "Missing signature" }, 400);
  }

  try {
    const parsed = JSON.parse(payload);
    if (parsed.id) {
      const verifyRes = await fetch(`https://api.stripe.com/v1/events/${parsed.id}`, {
        headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` },
      });
      if (!verifyRes.ok) {
        return json({ error: "Invalid event" }, 400);
      }
      const event = (await verifyRes.json()) as { type: string; data: { object: { metadata?: { userId?: string; credits?: string } } } };
      
      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const userId = session.metadata?.userId;
        const creditsToAdd = parseInt(session.metadata?.credits || "0", 10);

        if (userId && creditsToAdd > 0) {
          const user = await getOrCreateUser(env, userId);
          await supabaseServiceJson(env, `/rest/v1/User?id=eq.${userId}`, "PATCH", {
            credits: user.credits + creditsToAdd,
          });
          console.log(`[Worker] Added ${creditsToAdd} credits to user ${userId}`);
        }
      }
    }
  } catch {
    return json({ error: "Invalid payload" }, 400);
  }

  return json({ received: true });
}

async function handleGetArtworks(request: Request, env: Env): Promise<Response> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ ok: false, error: { code: "UNAUTHORIZED", message: "Missing authorization" } }, 401);
  }
  const token = authHeader.replace("Bearer ", "");

  let userId: string;
  try {
    const clerkUser = await verifyClerkToken(token, env);
    userId = clerkUser.userId;
  } catch {
    return json({ ok: false, error: { code: "UNAUTHORIZED", message: "Invalid authentication" } }, 401);
  }

  const artworks = (await supabaseServiceJson(
    env,
    `/rest/v1/Artwork?userId=eq.${userId}&select=id,title,originalImageUrl,restoredImageUrl,status,createdAt&order=createdAt.desc`,
    "GET"
  )) as Array<Record<string, any>>;

  return json({ ok: true, artworks });
}

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
function checkRateLimit(ip: string, maxRequests: number, windowMs = 60000) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }
  if (entry.count >= maxRequests) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetTime - now) / 1000) };
  }
  entry.count++;
  return { allowed: true, retryAfter: 0 };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const ip = request.headers.get("cf-connecting-ip") || "unknown";
    const limit = checkRateLimit(ip, 30, 60000);
    if (!limit.allowed) {
      return json({ error: "Rate limit exceeded. Try again later." }, 429);
    }

    const url = new URL(request.url);

    if (url.pathname === "/restore" && request.method === "POST") {
      return handleRestore(request, env);
    }

    if (url.pathname === "/credits" && request.method === "GET") {
      return handleCredits(request, env);
    }

    if (url.pathname === "/artworks" && request.method === "GET") {
      return handleGetArtworks(request, env);
    }

    if (url.pathname === "/stripe/checkout" && request.method === "POST") {
      return handleStripeCheckout(request, env);
    }

    if (url.pathname === "/stripe/webhook" && request.method === "POST") {
      return handleStripeWebhook(request, env);
    }

    return json({ error: "Not found" }, 404);
  },
};
