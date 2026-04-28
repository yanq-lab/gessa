import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import OpenAI from "npm:openai@4";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY")! });

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
  const body = await req.json();
  const { artworkId, mode = "faithful" } = body;

  if (!artworkId) {
    return new Response(JSON.stringify({ ok: false, error: { code: "MISSING_ARTWORK_ID", message: "artworkId is required" } }), { status: 400 });
  }

  const { data: artwork, error: artworkError } = await supabase
    .from("Artwork")
    .select("id, artistProfileId, originalImageUrl, status")
    .eq("id", artworkId)
    .single();

  if (artworkError || !artwork) {
    return new Response(JSON.stringify({ ok: false, error: { code: "ARTWORK_NOT_FOUND", message: "Artwork not found" } }), { status: 404 });
  }

  const { data: profile } = await supabase.from("ArtistProfile").select("id").eq("userId", userId).single();
  if (!profile || profile.id !== artwork.artistProfileId) {
    return new Response(JSON.stringify({ ok: false, error: { code: "FORBIDDEN", message: "You do not own this artwork" } }), { status: 403 });
  }

  // Check quota
  const { data: allowed } = await supabase.rpc("check_transformation_allowed", { p_user_id: userId });
  if (!allowed) {
    return new Response(JSON.stringify({ ok: false, error: { code: "QUOTA_EXCEEDED", message: "Monthly transformation limit reached. Upgrade your plan or earn referral credits." } }), { status: 429 });
  }

  // Check regeneration limit
  const { count: regenCount } = await supabase
    .from("ArtworkImageVersion")
    .select("*", { count: "exact", head: true })
    .eq("artworkId", artworkId)
    .eq("type", "restored");

  const { data: tierData } = await supabase.from("TierLimit").select("maxRegenerations").eq("tier", "free").single();
  const maxRegen = tierData?.maxRegenerations || 3;
  if ((regenCount || 0) >= maxRegen) {
    return new Response(JSON.stringify({ ok: false, error: { code: "REGENERATION_LIMIT", message: `Maximum ${maxRegen} regenerations per artwork on your plan` } }), { status: 429 });
  }

  // Update status to processing
  await supabase.from("Artwork").update({ status: "processing" }).eq("id", artworkId);

  try {
    // Download original image from storage
    if (!artwork.originalImageUrl) {
      throw new Error("No original image found");
    }

    const storagePath = artwork.originalImageUrl.split("/").slice(-3).join("/");
    const { data: imageBlob } = await supabase.storage.from("artworks").download(storagePath);
    if (!imageBlob) throw new Error("Failed to download original image");

    const imageFile = new File([imageBlob], "original.jpg", { type: imageBlob.type || "image/jpeg" });

    // Call OpenAI
    const prompt = mode === "gallery" ? GALLERY_PROMPT : FAITHFUL_PROMPT;
    const result = await openai.images.edit({
      model: "gpt-image-2",
      image: imageFile,
      prompt,
      size: "1024x1024",
      quality: "high",
      n: 1,
    });

    const b64 = result.data?.[0]?.b64_json;
    if (!b64) throw new Error("OpenAI returned no image");

    // Upload restored to storage
    const timestamp = Date.now();
    const restoredPath = `${userId}/artworks/${artworkId}/restored-${timestamp}.png`;
    const restoredBuffer = new Uint8Array([...atob(b64)].map(c => c.charCodeAt(0)));

    await supabase.storage.from("artworks").upload(restoredPath, restoredBuffer, {
      contentType: "image/png",
      upsert: false,
    });

    const { data: urlData } = supabase.storage.from("artworks").getPublicUrl(restoredPath);
    const restoredImageUrl = urlData.publicUrl;

    // Create version record
    const { data: version } = await supabase.from("ArtworkImageVersion").insert({
      artworkId,
      type: "restored",
      url: restoredImageUrl,
      metadata: { mode, model: "gpt-image-2", quality: "high" },
    }).select("id").single();

    // Update artwork
    await supabase.from("Artwork").update({ status: "ready" }).eq("id", artworkId);

    // Record usage
    await supabase.rpc("record_transformation", { p_user_id: userId, p_artwork_id: artworkId });

    return new Response(JSON.stringify({
      ok: true,
      artworkId,
      restoredImageUrl,
      versionId: version?.id,
      mode,
      status: "ready",
    }), { headers: { "Content-Type": "application/json" } });

  } catch (err: any) {
    await supabase.from("Artwork").update({ status: "uploaded" }).eq("id", artworkId);
    return new Response(JSON.stringify({
      ok: false,
      error: { code: "RESTORE_FAILED", message: err.message || "Restoration failed. Try again or upload a clearer photo." },
    }), { status: 500 });
  }
});
