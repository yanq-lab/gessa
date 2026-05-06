import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { checkRateLimit, getClientIP, rateLimitResponse } from "../_shared/rate-limit.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const WORKER_URL = "https://dev.gessa.art";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, GET, OPTIONS", "Access-Control-Allow-Headers": "Authorization, Content-Type" };

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

// Process restore job in background
async function processRestoreJob(jobId: string, artworkId: string, userId: string, mode: string) {
  try {
    // Update job to processing
    await supabase.from("RestoreJob").update({ 
      status: "processing", 
      startedAt: new Date().toISOString() 
    }).eq("id", jobId);

    const { data: artwork } = await supabase.from("Artwork").select("originalImageUrl").eq("id", artworkId).single();
    if (!artwork?.originalImageUrl) throw new Error("No original image found");

    // Download original image
    const url = new URL(artwork.originalImageUrl);
    const pathParts = url.pathname.split("/");
    const bucketIndex = pathParts.indexOf("artworks");
    const storagePath = bucketIndex >= 0 ? pathParts.slice(bucketIndex + 1).join("/") : artwork.originalImageUrl;
    const { data: imageBlob, error: dlError } = await supabase.storage.from("artworks").download(storagePath);
    if (dlError || !imageBlob) throw new Error("Failed to download original image");

    const arrayBuffer = await imageBlob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const base64Data = uint8ArrayToBase64(bytes);
    const mimeType = imageBlob.type || "image/jpeg";
    const dataUri = `data:${mimeType};base64,${base64Data}`;

    const prompt = mode === "gallery" ? GALLERY_PROMPT : FAITHFUL_PROMPT;

    // Call AI Worker
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
    if (workerResult.error) throw new Error(workerResult.error);

    const generatedImageUrl = workerResult.result?.image;
    if (!generatedImageUrl) throw new Error("No image returned from AI");

    // Download generated image
    const imageRes = await fetch(generatedImageUrl);
    if (!imageRes.ok) throw new Error(`Failed to download generated image: ${imageRes.status}`);
    const imageBytes = new Uint8Array(await imageRes.arrayBuffer());

    // Upload to storage
    const timestamp = Date.now();
    const restoredPath = `${userId}/artworks/${artworkId}/restored-${timestamp}.png`;
    await supabase.storage.from("artworks").upload(restoredPath, imageBytes, { contentType: "image/png", upsert: false });

    const { data: urlData } = supabase.storage.from("artworks").getPublicUrl(restoredPath);
    const restoredImageUrl = urlData.publicUrl;

    // Create image version
    const { data: version } = await supabase.from("ArtworkImageVersion").insert({
      artworkId,
      type: "restored",
      url: restoredImageUrl,
      metadata: { mode, model: "gpt-image-2", provider: "cloudflare-workers" }
    }).select("id").single();

    // Update artwork status
    await supabase.from("Artwork").update({ status: "ready" }).eq("id", artworkId);

    // Record usage
    await supabase.rpc("record_transformation", { p_user_id: userId, p_artwork_id: artworkId });

    // Update job to ready
    await supabase.from("RestoreJob").update({
      status: "ready",
      completedAt: new Date().toISOString(),
    }).eq("id", jobId);

    // Send email notification (don't await, fire and forget)
    const { data: artworkData } = await supabase.from("Artwork").select("title").eq("id", artworkId).single();
    fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/notify-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
      body: JSON.stringify({
        type: "restore_complete",
        userId,
        artworkId,
        artworkTitle: artworkData?.title || "Your artwork",
      }),
    }).catch(console.error);

    console.log(`[RestoreJob ${jobId}] Completed successfully`);

  } catch (err: any) {
    console.error(`[RestoreJob ${jobId}] Failed: ${err.message}`);
    
    // Update job to failed
    await supabase.from("RestoreJob").update({
      status: "failed",
      error: err.message,
      completedAt: new Date().toISOString(),
    }).eq("id", jobId);

    // Reset artwork status
    await supabase.from("Artwork").update({ status: "uploaded" }).eq("id", artworkId);
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method === "GET") {
    // Get restore job status
    const url = new URL(req.url);
    const jobId = url.searchParams.get("jobId");
    
    if (!jobId) {
      return jsonResponse({ ok: false, error: { code: "MISSING_JOB_ID", message: "jobId is required" } }, 400);
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

    const { data: job } = await supabase.from("RestoreJob").select("*").eq("id", jobId).eq("userId", userData.user.id).single();
    
    if (!job) {
      return jsonResponse({ ok: false, error: { code: "JOB_NOT_FOUND", message: "Job not found" } }, 404);
    }

    return jsonResponse({
      ok: true,
      job: {
        id: job.id,
        status: job.status,
        mode: job.mode,
        error: job.error,
        createdAt: job.createdAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
      }
    });
  }

  if (req.method !== "POST") {
    return jsonResponse({ ok: false, error: { code: "METHOD_NOT_ALLOWED", message: "Use POST or GET" } }, 405);
  }

  // Create new restore job
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

  // Rate limiting
  const clientIP = getClientIP(req);
  const ipLimit = checkRateLimit(`ip:${clientIP}`, 10, 60000);
  if (!ipLimit.allowed) return rateLimitResponse(ipLimit.retryAfter);

  const userLimit = checkRateLimit(`user:${userId}`, 5, 60000);
  if (!userLimit.allowed) return rateLimitResponse(userLimit.retryAfter);

  // Verify ownership
  const { data: artwork } = await supabase.from("Artwork").select("id, artistProfileId, originalImageUrl, status").eq("id", artworkId).single();
  if (!artwork) {
    return jsonResponse({ ok: false, error: { code: "ARTWORK_NOT_FOUND", message: "Artwork not found" } }, 404);
  }

  const { data: profile } = await supabase.from("ArtistProfile").select("id").eq("userId", userId).single();
  if (!profile || profile.id !== artwork.artistProfileId) {
    return jsonResponse({ ok: false, error: { code: "FORBIDDEN", message: "You do not own this artwork" } }, 403);
  }

  // Check quota
  const { data: allowed } = await supabase.rpc("check_transformation_allowed", { p_user_id: userId });
  if (!allowed) {
    return jsonResponse({ ok: false, error: { code: "QUOTA_EXCEEDED", message: "Monthly transformation limit reached." } }, 429);
  }

  // Check regeneration limit
  const { count: regenCount } = await supabase.from("ArtworkImageVersion").select("*", { count: "exact", head: true }).eq("artworkId", artworkId).eq("type", "restored");
  if ((regenCount || 0) >= 3) {
    return jsonResponse({ ok: false, error: { code: "REGENERATION_LIMIT", message: "Maximum 3 regenerations per artwork." } }, 429);
  }

  // Create restore job
  const { data: job, error: jobError } = await supabase.from("RestoreJob").insert({
    artworkId,
    userId,
    status: "queued",
    mode,
  }).select("id").single();

  if (jobError || !job) {
    return jsonResponse({ ok: false, error: { code: "JOB_CREATION_FAILED", message: "Failed to create restore job" } }, 500);
  }

  // Update artwork status
  await supabase.from("Artwork").update({ status: "processing" }).eq("id", artworkId);

  // Start background processing (don't await)
  processRestoreJob(job.id, artworkId, userId, mode).catch(console.error);

  // Return immediately with job ID
  return jsonResponse({
    ok: true,
    jobId: job.id,
    status: "queued",
    message: "Restore job created. Use GET /restore-status?jobId=xxx to check progress.",
  });
});
