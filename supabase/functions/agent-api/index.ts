import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const OPENROUTER_KEY = Deno.env.get("OPENAI_API_KEY")!;
const OR_BASE = "https://openrouter.ai/api/v1";

const RESTORE_PROMPT = `Create a faithful digital presentation of this photographed physical artwork.
Identify the artwork as the main subject. Remove distracting background. Straighten and correct perspective.
Reduce uneven lighting, glare, shadows, and color cast. Preserve the artwork exactly.
Do not reinterpret, repaint, beautify, or invent details.
The result should look like a professionally photographed version of the same physical artwork.`;

interface ORResponse {
  choices?: Array<{ message?: { content?: string | null; images?: Array<{ image_url?: { url?: string } }> } }>;
  error?: { message: string };
}

function extractBase64(dataUrl: string): string {
  const comma = dataUrl.indexOf(",");
  return comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
}

async function transformImage(imageBase64: string): Promise<string> {
  const res = await fetch(`${OR_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_KEY}`, "HTTP-Referer": "https://gessa.art", "X-Title": "Gessa", "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openai/gpt-5.4-image-2", modalities: ["image", "text"],
      messages: [{ role: "user", content: [{ type: "text", text: RESTORE_PROMPT }, { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }] }],
      max_tokens: 4096,
    }),
  });
  const data: ORResponse = await res.json();
  if (data.error) throw new Error(data.error.message);
  const images = data.choices?.[0]?.message?.images;
  if (images && images.length > 0) {
    const url = images[0].image_url?.url;
    if (url) return extractBase64(url);
  }
  throw new Error("No image returned from model");
}

serve(async (req: Request) => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer gk_")) {
    return new Response(JSON.stringify({ ok: false, error: "Missing API key" }), { status: 401 });
  }
  const apiKey = authHeader.replace("Bearer ", "");
  const { data: keyData } = await supabase.from("ApiKey").select("userId, scopes, isActive, expiresAt").eq("key", apiKey).single();
  if (!keyData?.isActive) return new Response(JSON.stringify({ ok: false, error: "Invalid API key" }), { status: 401 });
  if (keyData.expiresAt && new Date(keyData.expiresAt) < new Date()) return new Response(JSON.stringify({ ok: false, error: "API key expired" }), { status: 401 });

  const userId = keyData.userId;
  const { data: sub } = await supabase.from("Subscription").select("status, tier").eq("userId", userId).order("createdAt", { ascending: false }).limit(1).single();
  if (!sub || !["active", "trialing"].includes(sub.status)) return new Response(JSON.stringify({ ok: false, error: "No active subscription" }), { status: 402 });
  const { data: tier } = await supabase.from("TierLimit").select("apiAccess").eq("tier", sub.tier).single();
  if (!tier?.apiAccess) return new Response(JSON.stringify({ ok: false, error: "API requires Studio or Gallery tier" }), { status: 402 });
  await supabase.from("ApiKey").update({ lastUsedAt: new Date().toISOString() }).eq("key", apiKey);

  const url = new URL(req.url);
  const path = url.pathname.replace("/functions/v1/agent-api", "");

  if (path === "/transform" && req.method === "POST") {
    const { data: allowed } = await supabase.rpc("check_transformation_allowed", { p_user_id: userId });
    if (!allowed) return new Response(JSON.stringify({ ok: false, error: "Quota exceeded" }), { status: 429 });
    try {
      const { image_url } = await req.json();
      if (!image_url) return new Response(JSON.stringify({ ok: false, error: "image_url required" }), { status: 400 });
      const imageResp = await fetch(image_url);
      if (!imageResp.ok) throw new Error("Failed to fetch image");
      const blob = await imageResp.blob();
      const arrBuf = await blob.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrBuf)));
      const restoredBase64 = await transformImage(base64);
      const byteStr = atob(restoredBase64);
      const buffer = new Uint8Array(byteStr.length);
      for (let i = 0; i < byteStr.length; i++) buffer[i] = byteStr.charCodeAt(i);
      const timestamp = Date.now();
      const pth = `${userId}/agent/restored-${timestamp}.png`;
      await supabase.storage.from("artworks").upload(pth, buffer, { contentType: "image/png", upsert: false });
      const { data: urlData } = supabase.storage.from("artworks").getPublicUrl(pth);
      await supabase.rpc("record_transformation", { p_user_id: userId, p_artwork_id: null });
      return new Response(JSON.stringify({ ok: true, transformed_url: urlData.publicUrl, model: "gpt-5.4-image-2" }));
    } catch (err: unknown) {
      return new Response(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : "Transform failed" }), { status: 500 });
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
