import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const WORKER_URL = "https://gessa-image-restorer.gessa.workers.dev";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Authorization, Content-Type" };

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

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

// base64 to binary conversion helpers
function base64ToUint8Array(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let bin = "";
  const chunkSize = 65536;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    bin += String.fromCharCode.apply(null, chunk as any);
  }
  return btoa(bin);
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
    const base64Data = uint8ArrayToBase64(bytes);

    // Determine MIME type from original image
    const mimeType = imageBlob.type || "image/jpeg";
    const dataUri = `data:${mimeType};base64,${base64Data}`;

    const prompt = mode === "gallery" ? GALLERY_PROMPT : FAITHFUL_PROMPT;

    // Call Cloudflare Worker to generate image with gpt-image-2
    const workerRes = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, image: dataUri }),
    });

    if (!workerRes.ok) {
      const errorText = await workerRes.text();
      throw new Error(`Worker error: ${errorText}`);
    }

    const workerResult = await workerRes.json() as { state?: string; result?: { image?: string }; error?: string };
    
    if (workerResult.error) {
      throw new Error(workerResult.error);
    }

    const generatedImageUrl = workerResult.result?.image;
    if (!generatedImageUrl) throw new Error("No image returned from AI");

    // Download generated image from the URL
    const imageRes = await fetch(generatedImageUrl);
    if (!imageRes.ok) throw new Error(`Failed to download generated image: ${imageRes.status}`);
    const imageBytes = new Uint8Array(await imageRes.arrayBuffer());

    const timestamp = Date.now();
    const restoredPath = `${userId}/artworks/${artworkId}/restored-${timestamp}.png`;

    await supabase.storage.from("artworks").upload(restoredPath, imageBytes, { contentType: "image/png", upsert: false });

    const { data: urlData } = supabase.storage.from("artworks").getPublicUrl(restoredPath);
    const restoredImageUrl = urlData.publicUrl;

    const { data: version } = await supabase.from("ArtworkImageVersion").insert({ artworkId, type: "restored", url: restoredImageUrl, metadata: { mode, model: "gpt-image-2", provider: "cloudflare-workers" } }).select("id").single();

    await supabase.from("Artwork").update({ status: "ready" }).eq("id", artworkId);
    await supabase.rpc("record_transformation", { p_user_id: userId, p_artwork_id: artworkId });

    return jsonResponse({ ok: true, artworkId, restoredImageUrl, versionId: version?.id, mode, status: "ready" }, 200);

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Restoration failed";
    await supabase.from("Artwork").update({ status: "uploaded" }).eq("id", artworkId);
    return jsonResponse({ ok: false, error: { code: "RESTORE_FAILED", message } }, 500);
  }
});
