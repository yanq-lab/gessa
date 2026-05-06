import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { checkRateLimit, getClientIP, rateLimitResponse } from "../_shared/rate-limit.ts";

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const WORKER_URL = "https://dev.gessa.art";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, GET, OPTIONS", "Access-Control-Allow-Headers": "Authorization, Content-Type" };

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

const RESTORE_PROMPT = `Faithful digital restoration of this photographed physical artwork.
Identify the artwork as the main subject. Remove distracting background. Straighten and correct perspective.
Reduce uneven lighting, glare, shadows, and color cast. Preserve the artwork exactly.
Do not reinterpret, repaint, beautify, or invent details.
The result should look like a professionally photographed version of the same physical artwork.`;

async function transformImage(imageBase64: string, mimeType: string): Promise<string> {
  const dataUri = `data:${mimeType};base64,${imageBase64}`;
  const res = await fetch(WORKER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: RESTORE_PROMPT, image: dataUri }),
  });
  if (!res.ok) throw new Error(`Worker error: ${await res.text()}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.result?.image;
}

serve(async (req: Request) => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer gk_")) {
    return jsonResponse({ ok: false, error: "Missing API key" }, 401);
  }
  const apiKey = authHeader.replace("Bearer ", "");
  const { data: keyData } = await supabase.from("ApiKey").select("userId, scopes, isActive, expiresAt").eq("key", apiKey).single();
  if (!keyData?.isActive) return jsonResponse({ ok: false, error: "Invalid API key" }, 401);
  if (keyData.expiresAt && new Date(keyData.expiresAt) < new Date()) return jsonResponse({ ok: false, error: "API key expired" }, 401);

  const userId = keyData.userId;

  // Rate limit: 30 requests per minute per API key
  const keyLimit = checkRateLimit(`apikey:${apiKey}`, 30, 60000);
  if (!keyLimit.allowed) {
    return rateLimitResponse(keyLimit.retryAfter);
  }

  // Rate limit: 10 requests per minute per IP
  const clientIP = getClientIP(req);
  const ipLimit = checkRateLimit(`ip:${clientIP}`, 10, 60000);
  if (!ipLimit.allowed) {
    return rateLimitResponse(ipLimit.retryAfter);
  }

  const { data: sub } = await supabase.from("Subscription").select("status, tier").eq("userId", userId).order("createdAt", { ascending: false }).limit(1).single();
  if (!sub || !["active", "trialing"].includes(sub.status)) return jsonResponse({ ok: false, error: "No active subscription" }, 402);
  const { data: tier } = await supabase.from("TierLimit").select("apiAccess").eq("tier", sub.tier).single();
  if (!tier?.apiAccess) return jsonResponse({ ok: false, error: "API requires Studio or Gallery tier" }, 402);
  await supabase.from("ApiKey").update({ lastUsedAt: new Date().toISOString() }).eq("key", apiKey);

  const url = new URL(req.url);
  const path = url.pathname.replace("/functions/v1/agent-api", "");

  if (path === "/transform" && req.method === "POST") {
    const { data: allowed } = await supabase.rpc("check_transformation_allowed", { p_user_id: userId });
    if (!allowed) return jsonResponse({ ok: false, error: "Quota exceeded" }, 429);
    try {
      const { image_url } = await req.json();
      if (!image_url) return jsonResponse({ ok: false, error: "image_url required" }, 400);
      const imageResp = await fetch(image_url);
      if (!imageResp.ok) throw new Error("Failed to fetch image");
      const blob = await imageResp.blob();
      const arrBuf = await blob.arrayBuffer();
      const bytes = new Uint8Array(arrBuf);
      let bin = ""; const chunkSize = 65536;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize) as any);
      }
      const base64 = btoa(bin);
      const mimeType = blob.type || "image/jpeg";
      const resultImageUrl = await transformImage(base64, mimeType);
      if (!resultImageUrl) throw new Error("No image returned");
      const imgResp = await fetch(resultImageUrl);
      if (!imgResp.ok) throw new Error("Failed to download generated image");
      const imgBytes = new Uint8Array(await imgResp.arrayBuffer());
      const timestamp = Date.now();
      const pth = `${userId}/agent/restored-${timestamp}.png`;
      await supabase.storage.from("artworks").upload(pth, imgBytes, { contentType: "image/png", upsert: false });
      const { data: urlData } = supabase.storage.from("artworks").getPublicUrl(pth);
      await supabase.rpc("record_transformation", { p_user_id: userId, p_artwork_id: null });
      return jsonResponse({ ok: true, transformed_url: urlData.publicUrl, model: "gpt-image-2" });
    } catch (err: unknown) {
      return jsonResponse({ ok: false, error: err instanceof Error ? err.message : "Transform failed" }, 500);
    }
  }

  if (path === "/artworks" && req.method === "GET") {
    const { data: profile } = await supabase.from("ArtistProfile").select("id").eq("userId", userId).single();
    const { data: artworks } = await supabase.from("Artwork").select("id,title,year,medium,status,publishedImageUrl,originalImageUrl,slug,createdAt").eq("artistProfileId", profile?.id).order("createdAt", { ascending: false });
    return new Response(JSON.stringify({ artworks: artworks || [] }));
  }

  if (path === "/quota" && req.method === "GET") {
    const { data: profile } = await supabase.from("ArtistProfile").select("transformationCredits").eq("userId", userId).single();
    const { data: s } = await supabase.from("Subscription").select("tier,status").eq("userId", userId).order("createdAt", { ascending: false }).limit(1).single();
    const { data: tl } = await supabase.from("TierLimit").select("monthlyTransformations").eq("tier", s?.tier || "free").single();
    const periodStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const { count: used } = await supabase.from("TransformationUsage").select("*", { count: "exact", head: true }).eq("userId", userId).gte("periodStart", periodStart);
    return new Response(JSON.stringify({ tier: s?.tier || "free", monthly_limit: tl?.monthlyTransformations || 3, used_this_month: used || 0, bonus_credits: profile?.transformationCredits || 0, remaining: Math.max(0, (tl?.monthlyTransformations || 3) - (used || 0)) + (profile?.transformationCredits || 0) }));
  }

  return new Response(JSON.stringify({ ok: true, message: "Gessa Agent API v1", endpoints: { "POST /transform": "Transform artwork", "GET /artworks": "List artworks", "GET /quota": "Check usage" } }));
});
