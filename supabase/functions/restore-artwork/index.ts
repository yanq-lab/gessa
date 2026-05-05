import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const OPENROUTER_KEY = Deno.env.get("OPENAI_API_KEY")!;
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Authorization, Content-Type" };

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

const FAITHFUL_PROMPT = `Create a faithful digital presentation of this photographed physical artwork.
Identify the artwork as the main subject.
Remove distracting background outside the artwork.
Straighten the artwork and correct perspective distortion where possible.
Reduce uneven lighting, glare, shadows, and camera color cast.
Preserve the artwork itself exactly, including composition, subject, brushwork, paper texture, canvas texture, edges, signature, marks, and imperfections.
Do not reinterpret, repaint, redesign, beautify, or invent details.
Do not change the artist's style.
Do not remove the artist's signature or intentional marks.
The result should look like a professionally photographed or digitized version of the same physical artwork.`;

const GALLERY_PROMPT = `Create a clean online gallery presentation of this physical artwork.
Keep the artwork itself faithful and unchanged.
Remove distracting background around the artwork.
Straighten and crop the artwork.
Correct lighting and color cast.
Present it as a front-facing artwork image on a clean neutral background.
Do not stylize, repaint, reinterpret, improve, or invent details.
The result must remain a faithful representation of the uploaded physical artwork.`;

interface OpenRouterResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
      images?: Array<{ image_url?: { url?: string } }>;
    };
  }>;
  error?: { message: string };
}

async function callOpenRouter(imageBase64: string, prompt: string): Promise<string> {
  const body = {
    model: "openai/gpt-5.4-image-2",
    modalities: ["image", "text"],
    messages: [{
      role: "user",
      content: [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
      ],
    }],
    max_tokens: 4096,
  };

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_KEY}`,
      "HTTP-Referer": "https://gessa.art",
      "X-Title": "Gessa",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data: OpenRouterResponse = await res.json();
  if (data.error) throw new Error(data.error.message);

  // Try to get image from message.images field
  const images = data.choices?.[0]?.message?.images;
  if (images && images.length > 0) {
    const url = images[0].image_url?.url;
    if (url) {
      // Extract base64 from data URL if present
      if (url.startsWith("data:image")) {
        const comma = url.indexOf(",");
        return comma >= 0 ? url.slice(comma + 1) : url;
      }
      return url;
    }
  }

  // Fallback: try to extract from text content
  const content = data.choices?.[0]?.message?.content;
  if (content) {
    const dataUrlMatch = content.match(/data:image\/[^;]+;base64,([A-Za-z0-9+/=]+)/);
    if (dataUrlMatch) return dataUrlMatch[1];
  }

  throw new Error("No image returned from model");
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Authorization, Content-Type",
      },
    });
  }

  if (req.method !== "POST") {
    return jsonResponse({ ok: false, error: { code: "METHOD_NOT_ALLOWED", message: "Use POST" } }, 405);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse({ ok: false, error: { code: "UNAUTHORIZED", message: "Missing authorization" } }, 401);
  }

  const token = authHeader.replace("Bearer ", "");
  const { data: userData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !userData.user) {
    return jsonResponse({ ok: false, error: { code: "UNAUTHORIZED", message: "Invalid token" } }, 401);
  }

  const userId = userData.user.id;
  const { artworkId, mode = "faithful" } = await req.json();

  if (!artworkId) {
    return jsonResponse({ ok: false, error: { code: "MISSING_ARTWORK_ID", message: "artworkId is required" } }, 400);
  }

  const { data: artwork, error: artworkError } = await supabase.from("Artwork").select("id, artistProfileId, originalImageUrl, status").eq("id", artworkId).single();
  if (artworkError || !artwork) {
    return jsonResponse({ ok: false, error: { code: "ARTWORK_NOT_FOUND", message: "Artwork not found" } }, 404);
  }

  const { data: profile } = await supabase.from("ArtistProfile").select("id").eq("userId", userId).single();
  if (!profile || profile.id !== artwork.artistProfileId) {
    return jsonResponse({ ok: false, error: { code: "FORBIDDEN", message: "You do not own this artwork" } }, 403);
  }

  const { data: allowed } = await supabase.rpc("check_transformation_allowed", { p_user_id: userId });
  if (!allowed) {
    return jsonResponse({ ok: false, error: { code: "QUOTA_EXCEEDED", message: "Monthly transformation limit reached." } }, 429);
  }

  const { count: regenCount } = await supabase.from("ArtworkImageVersion").select("*", { count: "exact", head: true }).eq("artworkId", artworkId).eq("type", "restored");
  if ((regenCount || 0) >= 3) {
    return jsonResponse({ ok: false, error: { code: "REGENERATION_LIMIT", message: "Maximum 3 regenerations per artwork." } }, 429);
  }

  await supabase.from("Artwork").update({ status: "processing" }).eq("id", artworkId);

  try {
    if (!artwork.originalImageUrl) throw new Error("No original image found");

    const url = new URL(artwork.originalImageUrl);
    const pathParts = url.pathname.split("/");
    const bucketIndex = pathParts.indexOf("artworks");
    const storagePath = bucketIndex >= 0 ? pathParts.slice(bucketIndex + 1).join("/") : artwork.originalImageUrl;
    const { data: imageBlob, error: dlError } = await supabase.storage.from("artworks").download(storagePath);
    if (dlError || !imageBlob) throw new Error("Failed to download original image");

    const arrayBuffer = await imageBlob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = "";
    const len = bytes.length;
    const chunkSize = 65536;
    for (let i = 0; i < len; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, chunk as any);
    }
    const base64 = btoa(binary);

    const prompt = mode === "gallery" ? GALLERY_PROMPT : FAITHFUL_PROMPT;
    const restoredBase64 = await callOpenRouter(base64, prompt);

    const timestamp = Date.now();
    const restoredPath = `${userId}/artworks/${artworkId}/restored-${timestamp}.png`;

    const byteStr = atob(restoredBase64);
    const restoredBuffer = new Uint8Array(byteStr.length);
    for (let i = 0; i < byteStr.length; i++) restoredBuffer[i] = byteStr.charCodeAt(i);

    await supabase.storage.from("artworks").upload(restoredPath, restoredBuffer, { contentType: "image/png", upsert: false });

    const { data: urlData } = supabase.storage.from("artworks").getPublicUrl(restoredPath);
    const restoredImageUrl = urlData.publicUrl;

    const { data: version } = await supabase.from("ArtworkImageVersion").insert({ artworkId, type: "restored", url: restoredImageUrl, metadata: { mode, model: "gpt-5.4-image-2", provider: "openrouter" } }).select("id").single();

    await supabase.from("Artwork").update({ status: "ready" }).eq("id", artworkId);
    await supabase.rpc("record_transformation", { p_user_id: userId, p_artwork_id: artworkId });

    return jsonResponse({ ok: true, artworkId, restoredImageUrl, versionId: version?.id, mode, status: "ready" }, 200);

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Restoration failed";
    await supabase.from("Artwork").update({ status: "uploaded" }).eq("id", artworkId);
    return jsonResponse({ ok: false, error: { code: "RESTORE_FAILED", message } }, 500);
  }
});
