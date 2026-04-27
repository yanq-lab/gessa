"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, ImageIcon, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

async function uploadImageToSupabase(file: File, userId: string): Promise<string | null> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("artworks").upload(path, file, { cacheControl: "3600", upsert: false });
  if (error) { console.error("Storage upload error:", error); return null; }
  const { data } = supabase.storage.from("artworks").getPublicUrl(path);
  return data?.publicUrl || null;
}

export default function UploadArtworkPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [form, setForm] = useState({ title: "", year: "", medium: "", dimensions: "", description: "", price: "", availabilityStatus: "available" as "available" | "sold" | "not for sale" });

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Only image files are allowed"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("File size must be less than 10MB"); return; }
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setUploadingImage(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { toast.error("Please sign in first"); setUploadingImage(false); return; }
    const url = await uploadImageToSupabase(file, userData.user.id);
    if (url) { setImageUrl(url); toast.success("Image uploaded"); }
    else { toast.error("Upload failed. Make sure the 'artworks' bucket exists in Supabase Storage."); setPreviewUrl(null); }
    setUploadingImage(false);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl) { toast.error("Please upload an image first"); return; }
    if (!form.title) { toast.error("Title is required"); return; }
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { toast.error("Please sign in first"); setLoading(false); return; }
    const { data: profile } = await supabase.from("ArtistProfile").select("id").eq("userId", userData.user.id).single();
    if (!profile) { toast.error("Please set up your artist profile first"); setLoading(false); return; }
    const slug = form.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Date.now();
    const { data, error } = await supabase.from("Artwork").insert({
      artistProfileId: profile.id, title: form.title, slug, year: form.year || null, medium: form.medium || null,
      dimensions: form.dimensions || null, description: form.description || null, price: form.price || null,
      availabilityStatus: form.availabilityStatus, originalImageUrl: imageUrl, status: "draft",
    }).select("id").single();
    if (error || !data) { toast.error(error?.message || "Failed to create artwork"); setLoading(false); return; }
    toast.success("Artwork uploaded");
    router.push(`/artwork/${data.id}/review`);
  };

  const clearImage = () => { setPreviewUrl(null); setImageUrl(""); };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6">
      <Link href="/dashboard" className="mb-6 inline-flex items-center gap-1 text-sm text-stone-600 hover:text-stone-900"><ArrowLeft className="h-4 w-4" />Back to dashboard</Link>
      <h1 className="mb-8 font-serif text-3xl text-stone-900">Upload artwork</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="border-stone-200 shadow-none">
          <CardContent className="pt-6">
            <Label className="text-stone-700">Artwork photo *</Label>
            {previewUrl ? (
              <div className="relative mt-2">
                <img src={previewUrl} alt="Preview" className="aspect-[4/3] w-full rounded-sm border border-stone-200 object-contain bg-stone-100" />
                <button type="button" onClick={clearImage} className="absolute right-2 top-2 rounded-full bg-white/90 p-1 text-stone-600 hover:text-red-600"><X className="h-4 w-4" /></button>
              </div>
            ) : (
              <div className="mt-2">
                <label htmlFor="artwork-image" className="flex cursor-pointer flex-col items-center justify-center rounded-sm border border-dashed border-stone-300 bg-stone-50 p-8 hover:bg-stone-100 transition-colors">
                  <ImageIcon className="h-8 w-8 text-stone-400" strokeWidth={1.5} />
                  <p className="mt-2 text-sm text-stone-600">Click to upload a photo</p>
                  <p className="text-xs text-stone-500">JPG, PNG up to 10MB</p>
                  <input id="artwork-image" type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                </label>
              </div>
            )}
            {uploadingImage && <p className="mt-2 text-sm text-stone-500 flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</p>}
          </CardContent>
        </Card>
        <Card className="border-stone-200 shadow-none">
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2"><Label htmlFor="title" className="text-stone-700">Title *</Label><Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className="border-stone-200 focus-visible:ring-stone-400" /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="year" className="text-stone-700">Year</Label><Input id="year" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} className="border-stone-200 focus-visible:ring-stone-400" placeholder="2024" /></div>
              <div className="space-y-2"><Label htmlFor="medium" className="text-stone-700">Medium</Label><Input id="medium" value={form.medium} onChange={(e) => setForm({ ...form, medium: e.target.value })} className="border-stone-200 focus-visible:ring-stone-400" placeholder="Oil on canvas" /></div>
            </div>
            <div className="space-y-2"><Label htmlFor="dimensions" className="text-stone-700">Dimensions</Label><Input id="dimensions" value={form.dimensions} onChange={(e) => setForm({ ...form, dimensions: e.target.value })} className="border-stone-200 focus-visible:ring-stone-400" placeholder="100 × 80 cm" /></div>
            <div className="space-y-2"><Label htmlFor="description" className="text-stone-700">Description</Label><Textarea id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} className="border-stone-200 focus-visible:ring-stone-400 resize-none" /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="price" className="text-stone-700">Price</Label><Input id="price" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="border-stone-200 focus-visible:ring-stone-400" placeholder="Optional" /></div>
              <div className="space-y-2"><Label htmlFor="availability" className="text-stone-700">Availability</Label>
                <select id="availability" value={form.availabilityStatus} onChange={(e) => setForm({ ...form, availabilityStatus: e.target.value as typeof form.availabilityStatus })} className="flex h-9 w-full rounded-md border border-stone-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-400">
                  <option value="available">Available</option><option value="sold">Sold</option><option value="not for sale">Not for sale</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="flex gap-3">
          <Button type="submit" className="bg-stone-900 text-stone-50 hover:bg-stone-800" disabled={loading || uploadingImage || !imageUrl}>{loading ? "Saving..." : "Continue to review"}</Button>
          <Button variant="outline" asChild className="border-stone-200 text-stone-700 hover:bg-stone-100"><Link href="/dashboard">Cancel</Link></Button>
        </div>
      </form>
    </div>
  );
}
