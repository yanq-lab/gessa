"use client";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Sparkles, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

interface Artwork { id: string; title: string; year: string | null; medium: string | null; originalImageUrl: string | null; status: string; artistProfileId: string; slug: string; }
interface ImageVersion { id: string; type: string; url: string; createdAt: string; metadata: { mode?: string; model?: string; quality?: string } | null; }

function ReviewContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get("id");

  const [artwork, setArtwork] = useState<Artwork | null>(null);
  const [versions, setVersions] = useState<ImageVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [selectedVersionType, setSelectedVersionType] = useState<string | null>(null);
  const [compared, setCompared] = useState(false);
  const [suitable, setSuitable] = useState(false);
  const [toolOnly, setToolOnly] = useState(false);
  const [mode, setMode] = useState<"faithful" | "gallery">("faithful");

  const latestRestored = versions.filter(v => v.type === "restored").sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  const fetchArtwork = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/auth/signin"); return; }
    const { data: artworkData } = await supabase.from("Artwork").select("*").eq("id", id).single();
    if (!artworkData) { router.push("/dashboard"); return; }
    setArtwork(artworkData);
    const { data: versionData } = await supabase.from("ArtworkImageVersion").select("*").eq("artworkId", id).order("createdAt", { ascending: false });
    setVersions(versionData || []);
    if (artworkData.publishedImageUrl) {
      setSelectedImage(artworkData.publishedImageUrl);
    } else if (versionData?.some(v => v.type === "restored")) {
      const latest = versionData.filter(v => v.type === "restored")[0];
      setSelectedImage(latest.url);
      setSelectedVersionId(latest.id);
      setSelectedVersionType("restored");
    } else {
      setSelectedImage(artworkData.originalImageUrl);
    }
    setLoading(false);
  }, [id, router]);

  useEffect(() => { fetchArtwork(); }, [fetchArtwork]);

  const handleRestore = async () => {
    setRestoring(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { toast.error("Please sign in"); setRestoring(false); return; }
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/restore-artwork`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ artworkId: id, mode }),
      });
      const data = await res.json();
      if (!data.ok) { toast.error(data.error?.message || "Restore failed"); setRestoring(false); return; }
      toast.success("Restoration complete");
      await fetchArtwork();
    } catch { toast.error("Network error. Please try again."); }
    setRestoring(false);
  };

  const handleRegenerate = async () => {
    const regenCount = versions.filter(v => v.type === "restored").length;
    if (regenCount >= 3) { toast.error("Maximum 3 regenerations per artwork on free plan"); return; }
    await handleRestore();
  };

  const handleKeepOriginal = () => {
    setSelectedImage(artwork?.originalImageUrl || null);
    setSelectedVersionId(null);
    setSelectedVersionType("original");
  };

  const handleUseRestored = () => {
    if (latestRestored) {
      setSelectedImage(latestRestored.url);
      setSelectedVersionId(latestRestored.id);
      setSelectedVersionType("restored");
    }
  };

  const canPublish = compared && suitable && toolOnly && selectedImage;

  const handlePublish = async () => {
    if (!canPublish || !artwork) return;
    setPublishing(true);
    const { error } = await supabase.from("Artwork").update({
      publishedImageUrl: selectedImage,
      status: "published",
      userConfirmed: true,
      disclaimerAccepted: true,
      confirmedAt: new Date().toISOString(),
      disclaimerAcceptedAt: new Date().toISOString(),
      publishedSourceVersionId: selectedVersionId,
      publishedSourceVersionType: selectedVersionType,
    }).eq("id", id);
    if (error) { toast.error("Failed to publish"); setPublishing(false); return; }
    toast.success("Artwork published");
    router.push("/dashboard");
  };

  const handleSaveDraft = async () => {
    await supabase.from("Artwork").update({ status: "draft" }).eq("id", id);
    toast.success("Saved as draft");
    router.push("/dashboard");
  };

  if (loading) {
    return <div className="mx-auto flex w-full max-w-6xl items-center justify-center px-4 py-24"><Loader2 className="h-6 w-6 animate-spin text-stone-400" /></div>;
  }
  if (!id || !artwork) {
    if (!id) router.push("/dashboard");
    return null;
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <Link href="/dashboard" className="mb-6 inline-flex items-center gap-1 text-sm text-stone-600 hover:text-stone-900"><ArrowLeft className="h-4 w-4" />Back to dashboard</Link>
      <h1 className="mb-2 font-serif text-3xl text-stone-900">Review restoration</h1>
      <p className="mb-8 text-sm text-stone-600">Compare the restored image with your physical artwork before publishing.</p>

      {artwork.status === "uploaded" && !latestRestored && (
        <div className="mb-10 rounded-sm border border-stone-200 bg-stone-50 p-8 text-center">
          <Sparkles className="mx-auto h-10 w-10 text-stone-400" strokeWidth={1.5} />
          <h2 className="mt-4 font-serif text-xl text-stone-900">Ready to restore</h2>
          <p className="mt-2 text-sm text-stone-600">Gessa will create a faithful digital presentation based on your uploaded photo.</p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <select value={mode} onChange={(e) => setMode(e.target.value as "faithful" | "gallery")} className="h-9 rounded-md border border-stone-200 bg-white px-3 py-1 text-sm text-stone-700">
              <option value="faithful">Faithful — preserve original</option>
              <option value="gallery">Gallery — clean presentation</option>
            </select>
            <Button onClick={handleRestore} disabled={restoring} className="bg-stone-900 text-stone-50 hover:bg-stone-800">
              {restoring ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Restoring...</> : "Restore artwork"}
            </Button>
          </div>
        </div>
      )}

      {restoring && (
        <div className="mb-10 rounded-sm border border-stone-200 bg-stone-50 p-8 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-stone-400" />
          <p className="mt-3 font-serif text-lg text-stone-900">Restoring your artwork image...</p>
          <p className="mt-1 text-sm text-stone-500">Gessa is creating a faithful digital presentation based on your uploaded photo.</p>
        </div>
      )}

      {latestRestored && (
        <>
          <div className="mb-10 grid gap-6 sm:grid-cols-2">
            <div className="flex flex-col">
              <div className="relative aspect-[4/3] overflow-hidden rounded-sm border border-stone-200 bg-stone-100">
                {artwork.originalImageUrl && <img src={artwork.originalImageUrl} alt="Original" className="h-full w-full object-contain" />}
                {selectedVersionType === "original" && <div className="absolute left-2 top-2 rounded-sm bg-stone-900 px-2 py-0.5 text-xs text-stone-50">Selected</div>}
              </div>
              <p className="mt-3 text-center text-xs uppercase tracking-widest text-stone-500">Original Photo</p>
            </div>
            <div className="flex flex-col">
              <div className="relative aspect-[4/3] overflow-hidden rounded-sm border border-stone-200 bg-stone-100">
                <img src={latestRestored.url} alt="Restored" className="h-full w-full object-contain" />
                {selectedVersionType === "restored" && <div className="absolute left-2 top-2 rounded-sm bg-stone-900 px-2 py-0.5 text-xs text-stone-50">Selected</div>}
              </div>
              <p className="mt-3 text-center text-xs uppercase tracking-widest text-stone-500">Gessa Restored</p>
            </div>
          </div>

          <div className="mb-10 flex flex-wrap items-center justify-center gap-3">
            <Button variant="outline" onClick={handleRegenerate} className="border-stone-200 text-stone-700 hover:bg-stone-100">Regenerate</Button>
            <Button variant="outline" onClick={handleKeepOriginal} className={`border-stone-200 hover:bg-stone-100 ${selectedVersionType === "original" ? "bg-stone-100 text-stone-900" : "text-stone-700"}`}>Keep original</Button>
            <Button variant="outline" onClick={handleUseRestored} className={`border-stone-200 hover:bg-stone-100 ${selectedVersionType === "restored" ? "bg-stone-100 text-stone-900" : "text-stone-700"}`}>Use restored version</Button>
            <Button variant="outline" onClick={handleSaveDraft} className="border-stone-200 text-stone-700 hover:bg-stone-100">Save draft</Button>
          </div>
        </>
      )}

      <div className="mx-auto max-w-lg rounded-sm border border-stone-200 bg-stone-50 p-6">
        <h3 className="mb-4 font-serif text-lg text-stone-900">Before publishing</h3>
        <div className="space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={compared} onChange={(e) => setCompared(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-stone-300 text-stone-900 focus:ring-stone-400" />
            <span className="text-sm text-stone-700">I have compared the restored image with my physical artwork.</span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={suitable} onChange={(e) => setSuitable(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-stone-300 text-stone-900 focus:ring-stone-400" />
            <span className="text-sm text-stone-700">I confirm this image is suitable for public display.</span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={toolOnly} onChange={(e) => setToolOnly(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-stone-300 text-stone-900 focus:ring-stone-400" />
            <span className="text-sm text-stone-700">I understand Gessa provides technical tools only, and I am responsible for final approval.</span>
          </label>
        </div>
        <div className="mt-4 flex items-start gap-2 rounded-sm border border-stone-200 bg-white p-3">
          <ShieldAlert className="mt-0.5 h-4 w-4 flex-shrink-0 text-stone-400" />
          <p className="text-xs text-stone-500">Gessa provides AI-assisted image processing and digital presentation tools only. AI-restored results may differ from the physical artwork. You are responsible for reviewing and approving the final image before publication.</p>
        </div>
        <Button onClick={handlePublish} disabled={!canPublish || publishing} className="mt-6 w-full bg-stone-900 text-stone-50 hover:bg-stone-800">
          {publishing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Publishing...</> : "Publish artwork"}
        </Button>
        <p className="mt-3 text-center text-xs text-stone-400">By publishing, you confirm the restored image is approved for public display. Gessa does not guarantee perfect consistency between the restored image and the physical artwork.</p>
      </div>
    </div>
  );
}

export default function ArtworkReviewPage() {
  return <Suspense fallback={<div className="mx-auto flex w-full max-w-6xl items-center justify-center px-4 py-24"><Loader2 className="h-6 w-6 animate-spin text-stone-400" /></div>}><ReviewContent /></Suspense>;
}
