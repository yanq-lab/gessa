import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import OpenAI from "npm:openai@4";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY")! });

const RESTORE_PROMPT = `Create a faithful digital presentation of this photographed physical artwork.
Identify the artwork as the main subject. Remove distracting background. Straighten and correct perspective.
Reduce uneven lighting, glare, shadows, and color cast. Preserve the artwork exactly — composition, subject, brushwork, texture, edges, signature, marks, imperfections. Do not reinterpret, repaint, beautify, or invent details.
The result should look like a professionally photographed version of the same physical artwork.`;

serve(async (req: Request) => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer gk_")) {
    return new Response(JSON.stringify({ ok: false, error: "Missing or invalid API key. Use: Authorization: Bearer gk_..." }), { status: 401 });
  }

  const apiKey = authHeader.replace("Bearer ", "");

  // Validate API key
  const { data: keyData } = await supabase
    .from("ApiKey")
    .select("userId, scopes, isActive, expiresAt")
    .eq("key", apiKey)
    .single();

  if (!keyData || !keyData.isActive) {
    return new Response(JSON.stringify({ ok: false, error: "Invalid or inactive API key" }), { status: 401 });
  }

  if (keyData.expiresAt && new Date(keyData.expiresAt) < new Date()) {
    return new Response(JSON.stringify({ ok: false, error: "API key has expired" }), { status: 401 });
  }

  const userId = keyData.userId;

  // Check subscription
  const { data: subscription } = await supabase
    .from("Subscription")
    .select("status, tier")
    .eq("userId", userId)
    .order("createdAt", { ascending: false })
    .limit(1)
    .single();

  if (!subscription || !["active", "trialing"].includes(subscription.status)) {
    return new Response(JSON.stringify({ ok: false, error: "No active subscription. Subscribe at https://gessa.art" }), { status: 402 });
  }

  // Check tier has API access
  const { data: tier } = await supabase
    .from("TierLimit")
    .select("apiAccess")
    .eq("tier", subscription.tier)
    .single();

  if (!tier?.apiAccess) {
    return new Response(JSON.stringify({ ok: false, error: "API access requires Studio or Gallery tier" }), { status: 402 });
  }

  // Update last used
  await supabase.from("ApiKey").update({ lastUsedAt: new Date().toISOString() }).eq("key", apiKey);

  // Route by path
  const url = new URL(req.url);
  const path = url.pathname.replace("/functions/v1/agent-api", "");

  if (path === "/transform" && req.method === "POST") {
    return handleTransform(req, userId);
  }

  if (path === "/artworks" && req.method === "GET") {
    return handleListArtworks(req, userId);
  }

  if (path === "/quota" && req.method === "GET") {
    return handleQuota(req, userId);
  }

  return new Response(JSON.stringify({
    ok: true,
    message: "Gessa Agent API v1",
    endpoints: {
      "POST /transform": "Transform an artwork image",
      "GET /artworks": "List your artworks",
      "GET /quota": "Check remaining transformations",
    },
  }), { headers: { "Content-Type": "application/json" } });
});

async function handleTransform(req: Request, userId: string) {
  let body;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ ok: false, error: "Invalid JSON body. Send { image_url: string }" }), { status: 400 });
  }

  const { image_url } = body;
  if (!image_url) {
    return new Response(JSON.stringify({ ok: false, error: "image_url is required" }), { status: 400 });
  }

  // Check quota
  const { data: allowed } = await supabase.rpc("check_transformation_allowed", { p_user_id: userId });
  if (!allowed) {
    return new Response(JSON.stringify({ ok: false, error: "Transformation quota exceeded. Upgrade your plan." }), { status: 429 });
  }

  try {
    // Download image
    const imageResp = await fetch(image_url);
    if (!imageResp.ok) throw new Error(`Failed to fetch image: ${imageResp.status}`);
    const imageBlob = await imageResp.blob();
    const imageFile = new File([imageBlob], "image.jpg", { type: imageBlob.type || "image/jpeg" });

    // Call OpenAI
    const result = await openai.images.edit({
      model: "gpt-image-2",
      image: imageFile,
      prompt: RESTORE_PROMPT,
      size: "1024x1024",
      quality: "high",
      n: 1,
    });

    const b64 = result.data?.[0]?.b64_json;
    if (!b64) throw new Error("No image returned");

    // Upload to storage
    const timestamp = Date.now();
    const artworkId = crypto.randomUUID();
    const restoredPath = `${userId}/agent/restored-${timestamp}.png`;
    const restoredBuffer = new Uint8Array([...atob(b64)].map(c => c.charCodeAt(0)));

    await supabase.storage.from("artworks").upload(restoredPath, restoredBuffer, {
      contentType: "image/png",
      upsert: false,
    });

    const { data: urlData } = supabase.storage.from("artworks").getPublicUrl(restoredPath);

    // Record usage
    await supabase.rpc("record_transformation", { p_user_id: userId, p_artwork_id: null });

    return new Response(JSON.stringify({
      ok: true,
      transformed_url: urlData.publicUrl,
      model: "gpt-image-2",
      mode: "faithful",
    }), { headers: { "Content-Type": "application/json" } });

  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), { status: 500 });
  }
}

async function handleListArtworks(_req: Request, userId: string) {
  const { data: profile } = await supabase.from("ArtistProfile").select("id").eq("userId", userId).single();
  if (!profile) return new Response(JSON.stringify({ artworks: [] }));

  const { data: artworks } = await supabase
    .from("Artwork")
    .select("id, title, year, medium, status, publishedImageUrl, originalImageUrl, slug, createdAt")
    .eq("artistProfileId", profile.id)
    .order("createdAt", { ascending: false });

  return new Response(JSON.stringify({ artworks: artworks || [] }));
}

async function handleQuota(_req: Request, userId: string) {
  const { data: profile } = await supabase.from("ArtistProfile").select("transformationCredits").eq("userId", userId).single();

  const { data: subscription } = await supabase
    .from("Subscription")
    .select("tier, status")
    .eq("userId", userId)
    .order("createdAt", { ascending: false })
    .limit(1)
    .single();

  const { data: tier } = await supabase.from("TierLimit").select("monthlyTransformations").eq("tier", subscription?.tier || "free").single();

  const { count: used } = await supabase
    .from("TransformationUsage")
    .select("*", { count: "exact", head: true })
    .eq("userId", userId)
    .gte("periodStart", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

  return new Response(JSON.stringify({
    tier: subscription?.tier || "free",
    monthly_limit: tier?.monthlyTransformations || 3,
    used_this_month: used || 0,
    bonus_credits: profile?.transformationCredits || 0,
    remaining: Math.max(0, (tier?.monthlyTransformations || 3) - (used || 0)) + (profile?.transformationCredits || 0),
  }));
}
