import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const OPENROUTER_KEY = Deno.env.get("OPENAI_API_KEY")!;
const OR_BASE = "https://openrouter.ai/api/v1";

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

interface ORResponse {
  choices?: Array<{ message?: { content?: string | null; images?: Array<{ image_url?: { url?: string } }> } }>;
  error?: { message: string };
}

function extractBase64(dataUrl: string): string {
  const comma = dataUrl.indexOf(",");
  return comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
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

  const res = await fetch(`${OR_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_KEY}`,
      "HTTP-Referer": "https://gessa.art",
      "X-Title": "Gessa",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data: ORResponse = await res.json();
  if (data.error) throw new Error(data.error.message);

  const images = data.choices?.[0]?.message?.images;
  if (images && images.length > 0) {
    const url = images[0].image_url?.url;
    if (url) return extractBase64(url);
  }

  const content = data.choices?.[0]?.message?.content;
  if (content) {
    const dataUrlMatch = content.match(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/);
    if (dataUrlMatch) return extractBase64(dataUrlMatch[0]);
  }

  throw new Error("No image returned from model");
}

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: { code: "METHOD_NOT_ALLOWED", message: "Use POST" } }), { status: 405 });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ ok: false, error: { code: "UNAUTHORIZED", message: "Missing authorization" } }), { status: 401 });
  }

  const token = authHeader.replace("Bearer ", "");
  const { data: userData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !userData.user) {
    return new Response(JSON.stringify({ ok: false, error: { code: "UNAUTHORIZED", message: "Invalid token" } }), { status: 401 });
  }

  const userId = userData.user.id;
  const { artworkId, mode = "faithful" } = await req.json();

  if (!artworkId) {
    return new Response(JSON.stringify({ ok: false, error: { code: "MISSING_ARTWORK_ID", message: "artworkId is required" } }), { status: 400 });
  }

  const { data: artwork, error: artworkError } = await supabase.from("Artwork").select("id, artistProfileId, originalImageUrl, status").eq("id", artworkId).single();
  if (artworkError || !artwork) {
    return new Response(JSON.stringify({ ok: false, error: { code: "ARTWORK_NOT_FOUND", message: "Artwork not found" } }), { status: 404 });
  }

  const { data: profile } = await supabase.from("ArtistProfile").select("id").eq("userId", userId).single();
  if (!profile || profile.id !== artwork.artistProfileId) {
    return new Response(JSON.stringify({ ok: false, error: { code: "FORBIDDEN", message: "You do not own this artwork" } }), { status: 403 });
  }

  const { data: allowed } = await supabase.rpc("check_transformation_allowed", { p_user_id: userId });
  if (!allowed) {
    return new Response(JSON.stringify({ ok: false, error: { code: "QUOTA_EXCEEDED", message: "Monthly transformation limit reached." } }), { status: 429 });
  }

  const { count: regenCount } = await supabase.from("ArtworkImageVersion").select("*", { count: "exact", head: true }).eq("artworkId", artworkId).eq("type", "restored");
  if ((regenCount || 0) >= 3) {
    return new Response(JSON.stringify({ ok: false, error: { code: "REGENERATION_LIMIT", message: "Maximum 3 regenerations per artwork." } }), { status: 429 });
  }

  await supabase.from("Artwork").update({ status: "processing" }).eq("id", artworkId);

  try {
    if (!artwork.originalImageUrl) throw new Error("No original image found");

    const storagePath = artwork.originalImageUrl.split("/").slice(-3).join("/");
    const { data: imageBlob, error: dlError } = await supabase.storage.from("artworks").download(storagePath);
    if (dlError || !imageBlob) throw new Error("Failed to download original image");

    const arrayBuffer = await imageBlob.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

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

    return new Response(JSON.stringify({ ok: true, artworkId, restoredImageUrl, versionId: version?.id, mode, status: "ready" }), { headers: { "Content-Type": "application/json" } });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Restoration failed";
    await supabase.from("Artwork").update({ status: "uploaded" }).eq("id", artworkId);
    return new Response(JSON.stringify({ ok: false, error: { code: "RESTORE_FAILED", message } }), { status: 500 });
  }
});
