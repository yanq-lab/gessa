"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, RotateCcw, Check, Eye, Save } from "lucide-react";
import { toast } from "sonner";

interface Artwork { id: string; title: string; originalImageUrl: string | null; restoredImageUrl: string | null; publishedImageUrl: string | null; status: string; }

export default function ArtworkReviewPage() {
  const params = useParams(); const router = useRouter(); const id = params.id as string;
  const [artwork, setArtwork] = useState<Artwork | null>(null);
  const [loading, setLoading] = useState(true); const [processing, setProcessing] = useState(false); const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("Artwork").select("id, title, originalImageUrl, restoredImageUrl, publishedImageUrl, status").eq("id", id).single();
      if (!data) { toast.error("Artwork not found"); router.push("/dashboard"); return; }
      setArtwork(data); setLoading(false);
    }
    load();
  }, [id, router]);

  const handleRestore = async () => {
    if (!artwork?.originalImageUrl) return;
    setProcessing(true);
    const { error } = await supabase.from("Artwork").update({ restoredImageUrl: artwork.originalImageUrl, status: "ready" }).eq("id", id);
    if (error) toast.error("Restore failed");
    else { toast.success("Restoration complete (simulated)"); setArtwork({ ...artwork, restoredImageUrl: artwork.originalImageUrl, status: "ready" }); }
    setProcessing(false);
  };

  const handleUseRestored = async () => {
    if (!artwork?.restoredImageUrl) return;
    const { error } = await supabase.from("Artwork").update({ publishedImageUrl: artwork.restoredImageUrl, status: "ready" }).eq("id", id);
    if (error) toast.error("Failed to select version"); else { toast.success("Restored version selected"); setArtwork({ ...artwork, publishedImageUrl: artwork.restoredImageUrl, status: "ready" }); }
  };

  const handleUseOriginal = async () => {
    if (!artwork?.originalImageUrl) return;
    const { error } = await supabase.from("Artwork").update({ publishedImageUrl: artwork.originalImageUrl, status: "ready" }).eq("id", id);
    if (error) toast.error("Failed to select version"); else { toast.success("Original version selected"); setArtwork({ ...artwork, publishedImageUrl: artwork.originalImageUrl, status: "ready" }); }
  };

  const handlePublish = async () => {
    setPublishing(true);
    const { error } = await supabase.from("Artwork").update({ status: "published" }).eq("id", id);
    if (error) toast.error("Failed to publish"); else { toast.success("Artwork published"); setArtwork((prev) => (prev ? { ...prev, status: "published" } : null)); }
    setPublishing(false);
  };

  const handleSaveDraft = async () => {
    const { error } = await supabase.from("Artwork").update({ status: "draft" }).eq("id", id);
    if (error) toast.error("Failed to save draft"); else { toast.success("Saved as draft"); setArtwork((prev) => (prev ? { ...prev, status: "draft" } : null)); }
  };

  if (loading) return <div className="mx-auto flex w-full max-w-6xl items-center justify-center px-4 py-24 sm:px-6"><Loader2 className="h-6 w-6 animate-spin text-stone-400" /></div>;
  if (!artwork) return null;
  const hasRestored = !!artwork.restoredImageUrl; const hasPublishedImage = !!artwork.publishedImageUrl;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <Link href="/dashboard" className="mb-6 inline-flex items-center gap-1 text-sm text-stone-600 hover:text-stone-900"><ArrowLeft className="h-4 w-4" />Back to dashboard</Link>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="font-serif text-3xl text-stone-900">{artwork.title}</h1><p className="mt-1 text-sm text-stone-600">Review and confirm how your artwork will be presented.</p></div>
        <Badge variant="secondary" className="w-fit bg-stone-100 text-stone-700">{artwork.status}</Badge>
      </div>
      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <Card className="border-stone-200 shadow-none">
          <CardContent className="pt-6">
            <p className="mb-3 text-xs uppercase tracking-widest text-stone-500">Original photo</p>
            {artwork.originalImageUrl ? <img src={artwork.originalImageUrl} alt="Original" className="w-full rounded-sm border border-stone-200 object-contain bg-stone-100" /> : <div className="flex aspect-[4/3] items-center justify-center rounded-sm border border-stone-200 bg-stone-100"><p className="text-sm text-stone-500">No original image</p></div>}
          </CardContent>
        </Card>
        <Card className="border-stone-200 shadow-none">
          <CardContent className="pt-6">
            <p className="mb-3 text-xs uppercase tracking-widest text-stone-500">Restored version</p>
            {hasRestored ? <img src={artwork.restoredImageUrl!} alt="Restored" className="w-full rounded-sm border border-stone-200 object-contain bg-stone-100" /> : (
              <div className="flex aspect-[4/3] flex-col items-center justify-center rounded-sm border border-stone-200 bg-stone-100">
                <p className="text-sm text-stone-500">No restored version yet</p>
                <Button variant="outline" size="sm" onClick={handleRestore} disabled={processing || !artwork.originalImageUrl} className="mt-3 border-stone-300 text-stone-700 hover:bg-stone-100">
                  {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}{processing ? "Processing..." : "Generate restored version"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <div className="flex flex-wrap gap-3">
        {hasRestored && <Button onClick={handleUseRestored} disabled={hasPublishedImage && artwork.publishedImageUrl === artwork.restoredImageUrl} className="bg-stone-900 text-stone-50 hover:bg-stone-800"><Check className="mr-2 h-4 w-4" />Use restored version</Button>}
        <Button variant="outline" onClick={handleUseOriginal} disabled={hasPublishedImage && artwork.publishedImageUrl === artwork.originalImageUrl} className="border-stone-300 text-stone-700 hover:bg-stone-100"><Eye className="mr-2 h-4 w-4" />Keep original</Button>
        {hasRestored && <Button variant="outline" onClick={handleRestore} disabled={processing} className="border-stone-300 text-stone-700 hover:bg-stone-100"><RotateCcw className="mr-2 h-4 w-4" />Regenerate</Button>}
        <Button variant="outline" onClick={handleSaveDraft} className="border-stone-300 text-stone-700 hover:bg-stone-100"><Save className="mr-2 h-4 w-4" />Save as draft</Button>
        <Button onClick={handlePublish} disabled={publishing || !hasPublishedImage} className="bg-stone-900 text-stone-50 hover:bg-stone-800">{publishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}Publish</Button>
      </div>
      {!hasPublishedImage && <p className="mt-3 text-sm text-stone-500">Select a version (restored or original) before publishing.</p>}
    </div>
  );
}
