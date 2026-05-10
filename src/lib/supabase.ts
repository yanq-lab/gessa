import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://khqngwvvcoosqgtpmdan.supabase.co";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_fA9fti-EZ5v7hVvVvhm-tg_QsUzhM5E";

export const supabase = createClient(supabaseUrl, supabaseKey);

// Storage-only client for image uploads
export async function uploadArtworkImage(file: File, userId: string): Promise<string | null> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/${Date.now()}.${ext}`;
  try {
    const { data, error } = await supabase.storage.from("artworks").upload(path, file, { cacheControl: "3600", upsert: false });
    if (error) { console.error("Storage upload error:", error.message); return null; }
    if (!data) { console.error("No data returned from upload"); return null; }
    const { data: urlData } = supabase.storage.from("artworks").getPublicUrl(path);
    return urlData?.publicUrl || null;
  } catch (err) {
    console.error("Upload exception:", err);
    return null;
  }
}
