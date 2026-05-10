"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { uploadArtworkImage } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, ImageIcon, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function UploadArtworkPage() {
  const router = useRouter();
  const { userId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [form, setForm] = useState({ title: "", description: "" });

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Only image files are allowed"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("File size must be less than 10MB"); return; }
    if (!userId) { toast.error("Please sign in first"); return; }
    
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setUploadingImage(true);
    
    const url = await uploadArtworkImage(file, userId);
    if (url) { setImageUrl(url); toast.success("Image uploaded"); }
    else { toast.error("Upload failed"); setPreviewUrl(null); }
    setUploadingImage(false);
  }, [userId]);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await handleFile(file);
  }, [handleFile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl) { toast.error("Please upload an image first"); return; }
    if (!form.title) { toast.error("Title is required"); return; }
    if (!userId) { toast.error("Please sign in first"); return; }
    setLoading(true);
    
    try {
      const { supabase } = await import("@/lib/supabase");
      const { data, error } = await supabase.from("Artwork").insert({
        userId,
        title: form.title,
        description: form.description || null,
        originalImageUrl: imageUrl,
        status: "uploaded",
      }).select("id").single();
      
      if (error || !data) { 
        toast.error(error?.message || "Failed to create artwork"); 
        setLoading(false); 
        return; 
      }
      
      toast.success("Artwork uploaded");
      router.push(`/artwork/review?id=${data.id}`);
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error(err?.message || "Failed to upload artwork");
      setLoading(false);
    }
  };

  const clearImage = () => { setPreviewUrl(null); setImageUrl(""); };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6">
      <Link href="/" className="mb-6 inline-flex items-center gap-1 text-sm text-stone-600 hover:text-stone-900"><ArrowLeft className="h-4 w-4" />Back to home</Link>
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
                <label
                  htmlFor="artwork-image"
                  className={`flex cursor-pointer flex-col items-center justify-center rounded-sm border-2 border-dashed p-8 transition-colors ${
                    isDragging 
                      ? "border-stone-900 bg-stone-100" 
                      : "border-stone-300 bg-stone-50 hover:bg-stone-100"
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <ImageIcon className="h-8 w-8 text-stone-400" strokeWidth={1.5} />
                  <p className="mt-2 text-sm text-stone-600">
                    {isDragging ? "Drop your image here" : "Click or drag to upload a photo"}
                  </p>
                  <p className="text-xs text-stone-500">JPG, PNG, WebP up to 10MB</p>
                  <p className="mt-1 text-xs text-stone-400">For best results, use a high-resolution scan or photo in natural light</p>
                  <input id="artwork-image" type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFileChange} className="hidden" />
                </label>
              </div>
            )}
            {uploadingImage && <p className="mt-2 text-sm text-stone-500 flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</p>}
          </CardContent>
        </Card>
        <Card className="border-stone-200 shadow-none">
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2"><Label htmlFor="title" className="text-stone-700">Title *</Label><Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className="border-stone-200 focus-visible:ring-stone-400" /></div>
            <div className="space-y-2"><Label htmlFor="description" className="text-stone-700">Description</Label><Textarea id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} className="border-stone-200 focus-visible:ring-stone-400 resize-none" /></div>
          </CardContent>
        </Card>
        <div className="flex gap-3">
          <Button type="submit" className="bg-stone-900 text-stone-50 hover:bg-stone-800" disabled={loading || uploadingImage || !imageUrl}>{loading ? "Saving..." : "Continue to review"}</Button>
          <Button variant="outline" asChild className="border-stone-200 text-stone-700 hover:bg-stone-100"><Link href="/">Cancel</Link></Button>
        </div>
      </form>
    </div>
  );
}
