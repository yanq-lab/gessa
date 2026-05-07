export interface Env {
  AI: Ai;
}

const SUPABASE_URL = "https://khqngwvvcoosqgtpmdan.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_fA9fti-EZ5v7hVvVvhm-tg_QsUzhM5E";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Max-Age": "86400",
};

const FAITHFUL_PROMPT = `Faithful digital restoration of this photographed physical artwork.
Identify the artwork as the main subject.
Remove distracting background outside the artwork.
Straighten the artwork and correct perspective distortion.
Reduce uneven lighting, glare, shadows, and camera color cast.
Preserve the artwork exactly: composition, subject, brushwork, paper texture, canvas texture, edges, signature, marks, and imperfections.
Do not reinterpret, repaint, redesign, beautify, or invent details.
Do not change the artist's style.
Do not remove the artist's signature or intentional marks.
The result should look like a professionally photographed or digitized version of the same physical artwork.`;

const GALLERY_PROMPT = `Clean online gallery presentation of this physical artwork.
Keep the artwork itself faithful and unchanged.
Remove distracting background around the artwork.
Straighten and crop the artwork.
Correct lighting and color cast.
Present it as a front-facing artwork image on a clean neutral background.
Do not stylize, repaint, reinterpret, improve, or invent details.
The result must remain a faithful representation of the uploaded physical artwork.`;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function supabaseHeaders(jwt: string): Record<string, string> {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${jwt}`,
  };
}

async function supabaseGet(jwt: string, path: string) {
  const res = await fetch(`${SUPABASE_URL}${path}`, { headers: supabaseHeaders(jwt) });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase GET ${path}: ${res.status} ${err}`);
  }
  return res;
}

async function supabaseJson(jwt: string, path: string, method: string, body?: unknown) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    method,
    headers: { ...supabaseHeaders(jwt), "Content-Type": "application/json", ...(method === "PATCH" ? { Prefer: "return=representation" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase ${method} ${path}: ${res.status} ${err}`);
  }
  return method === "GET" || method === "POST" ? res.json() : null;
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

async function downloadImage(jwt: string, storagePath: string): Promise<{ dataUri: string; size: number }> {
  console.log("[Worker] Downloading image from storage:", storagePath);
  const url = `${SUPABASE_URL}/storage/v1/object/${storagePath}`;
  const res = await fetch(url, { headers: supabaseHeaders(jwt) });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to download image: ${res.status} ${err}`);
  }
  const blob = await res.blob();
  console.log("[Worker] Downloaded image, size:", blob.size);

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

async function uploadImage(jwt: string, userId: string, artworkId: string, imageBytes: Uint8Array): Promise<string> {
  const ts = Date.now();
  const path = `${userId}/artworks/${artworkId}/restored-${ts}.png`;
  console.log("[Worker] Uploading restored image:", path);

  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/artworks/${path}`, {
    method: "POST",
    headers: { ...supabaseHeaders(jwt), "Content-Type": "image/png" },
    body: imageBytes,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to upload restored image: ${res.status} ${err}`);
  }

  const data = (await res.json()) as { Id?: string; Key?: string };
  const filePath = data.Key || path;

  // Get public URL
  const publicUrlRes = await supabaseGet(jwt, `/storage/v1/object/public/artworks/${encodeURIComponent(filePath)}`);
  console.log("[Worker] Public URL:", publicUrlRes.url);

  // Construct public URL manually
  return `${SUPABASE_URL}/storage/v1/object/public/artworks/${filePath}`;
}

async function handleRestore(request: Request, env: Env): Promise<Response> {
  // Read auth header
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ ok: false, error: { code: "UNAUTHORIZED", message: "Missing authorization" } }, 401);
  }
  const jwt = authHeader.replace("Bearer ", "");

  // Validate user JWT and get user ID
  console.log("[Worker] Validating user JWT...");
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${jwt}` },
  });
  if (!userRes.ok) {
    const err = await userRes.text();
    console.error("[Worker] Auth validation failed:", err);
    return json({ ok: false, error: { code: "UNAUTHORIZED", message: "Invalid authentication" } }, 401);
  }
  const userData = (await userRes.json()) as { id: string; email?: string };
  const userId = userData.id;
  console.log("[Worker] Authenticated user:", userId);

  // Read request body
  let body: { artworkId?: string; mode?: string };
  try {
    body = (await request.json()) as { artworkId?: string; mode?: string };
  } catch {
    return json({ ok: false, error: { code: "INVALID_JSON", message: "Invalid request body" } }, 400);
  }
  const { artworkId, mode = "faithful" } = body;
  if (!artworkId) {
    return json({ ok: false, error: { code: "MISSING_ARTWORK_ID", message: "artworkId is required" } }, 400);
  }
  console.log("[Worker] Restore request: artworkId=", artworkId, "mode=", mode);

  // Fetch artwork
  const artwork = (await supabaseJson(jwt, `/rest/v1/Artwork?id=eq.${artworkId}&select=id,artistProfileId,originalImageUrl,status`, "GET")) as Array<{
    id: string;
    artistProfileId: string;
    originalImageUrl: string | null;
    status: string;
  }>;
  if (!artwork.length) {
    return json({ ok: false, error: { code: "ARTWORK_NOT_FOUND", message: "Artwork not found" } }, 404);
  }
  const art = artwork[0];

  // Verify ownership via ArtistProfile
  const profiles = (await supabaseJson(jwt, `/rest/v1/ArtistProfile?id=eq.${art.artistProfileId}&select=userId`, "GET")) as Array<{ userId: string }>;
  if (!profiles.length || profiles[0].userId !== userId) {
    return json({ ok: false, error: { code: "FORBIDDEN", message: "You do not own this artwork" } }, 403);
  }

  if (!art.originalImageUrl) {
    return json({ ok: false, error: { code: "NO_IMAGE", message: "No original image found" } }, 400);
  }

  // Check regeneration limit
  const regenCount = (await supabaseJson(jwt, `/rest/v1/ArtworkImageVersion?artworkId=eq.${artworkId}&type=eq.restored&select=id`, "GET")) as Array<unknown>;
  if ((regenCount?.length || 0) >= 3) {
    return json({ ok: false, error: { code: "REGENERATION_LIMIT", message: "Maximum 3 regenerations per artwork." } }, 429);
  }

  // Update artwork status to processing
  console.log("[Worker] Updating artwork status to processing...");
  await supabaseJson(jwt, `/rest/v1/Artwork?id=eq.${artworkId}`, "PATCH", { status: "processing" });

  try {
    // Download original image
    const storagePath = extractStoragePath(art.originalImageUrl);
    const { dataUri, size } = await downloadImage(jwt, storagePath);
    console.log("[Worker] Original image converted to base64, size:", size);

    // Call Workers AI
    const prompt = mode === "gallery" ? GALLERY_PROMPT : FAITHFUL_PROMPT;
    console.log("[Worker] Calling Workers AI with gpt-image-2...");
    const aiResponse = await env.AI.run(
      "openai/gpt-image-2",
      {
        prompt,
        quality: "auto",
        size: "1024x1024",
        images: [dataUri],
      },
      { gateway: { id: "default" } }
    );
    console.log("[Worker] AI response:", JSON.stringify(aiResponse).substring(0, 200));

    const result = aiResponse as { state?: string; result?: { image?: string }; error?: string };
    if (result.error) {
      throw new Error(`AI error: ${result.error}`);
    }

    const generatedUrl = result.result?.image;
    if (!generatedUrl) {
      throw new Error("No image returned from AI");
    }

    // Download generated image
    console.log("[Worker] Downloading generated image...");
    const imgRes = await fetch(generatedUrl);
    if (!imgRes.ok) {
      throw new Error(`Failed to download generated image: ${imgRes.status}`);
    }
    const imgBuf = await imgRes.arrayBuffer();
    const imgBytes = new Uint8Array(imgBuf);
    console.log("[Worker] Generated image downloaded, size:", imgBytes.length);

    // Upload to Supabase Storage
    const restoredUrl = await uploadImage(jwt, userId, artworkId, imgBytes);

    // Create ArtworkImageVersion
    console.log("[Worker] Creating ArtworkImageVersion...");
    const version = (await supabaseJson(jwt, "/rest/v1/ArtworkImageVersion", "POST", {
      artworkId,
      type: "restored",
      url: restoredUrl,
      metadata: { mode, model: "gpt-image-2", provider: "cloudflare-workers" },
    })) as Array<{ id: string }>;
    console.log("[Worker] Version created:", version?.[0]?.id);

    // Update artwork status
    await supabaseJson(jwt, `/rest/v1/Artwork?id=eq.${artworkId}`, "PATCH", { status: "ready" });

    // Record usage (best-effort)
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/rpc/record_transformation`, {
        method: "POST",
        headers: { ...supabaseHeaders(jwt), "Content-Type": "application/json" },
        body: JSON.stringify({ p_user_id: userId, p_artwork_id: artworkId }),
      });
    } catch {
      console.log("[Worker] Failed to record usage (non-critical)");
    }

    console.log("[Worker] Restore complete!");

    return json({
      ok: true,
      job: {
        status: "ready",
        mode,
        restoredUrl,
        versionId: version?.[0]?.id,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Worker] Restore failed:", message);

    // Reset artwork status
    await supabaseJson(jwt, `/rest/v1/Artwork?id=eq.${artworkId}`, "PATCH", { status: "uploaded" }).catch(() => {});

    return json({ ok: false, error: { code: "RESTORE_FAILED", message } }, 500);
  }
}

async function handleImageGeneration(request: Request, env: Env): Promise<Response> {
  try {
    const body = (await request.json()) as { prompt: string; image?: string };
    const { prompt, image } = body;

    if (!prompt) {
      return json({ error: "Missing prompt" }, 400);
    }

    const input: Record<string, unknown> = { prompt, quality: "auto", size: "1024x1024" };
    if (image && image !== "none") {
      input.images = [image];
    }

    console.log("[Worker] Calling Workers AI (legacy)...");
    const response = await env.AI.run("openai/gpt-image-2", input, { gateway: { id: "default" } });
    return json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return json({ error: message }, 500);
  }
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
    const limit = checkRateLimit(ip, 10, 60000);
    if (!limit.allowed) {
      return json({ error: "Rate limit exceeded. Try again later." }, 429);
    }

    const url = new URL(request.url);
    if (url.pathname === "/restore" && request.method === "POST") {
      return handleRestore(request, env);
    }

    if (request.method === "POST") {
      return handleImageGeneration(request, env);
    }

    return json({ error: "Use POST /restore or POST /" }, 405);
  },
};