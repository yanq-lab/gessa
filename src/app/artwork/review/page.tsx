"use client";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles, ShieldAlert, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ArtworkReviewSkeleton } from "@/components/loading-skeletons";
import { useRestoreProgress } from "@/hooks/use-restore-progress";
import { RestoreProgressBar } from "@/components/restore-progress-bar";
import { BeforeAfterSlider } from "@/components/before-after-slider";

interface Artwork { 
  id: string; 
  title: string; 
  originalImageUrl: string | null; 
  restoredImageUrl: string | null; 
  status: string; 
}

function ReviewContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { getToken, userId } = useAuth();
  const id = searchParams.get("id");

  const [artwork, setArtwork] = useState<Artwork | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [compared, setCompared] = useState(false);
  const [suitable, setSuitable] = useState(false);
  const [toolOnly, setToolOnly] = useState(false);

  const { progress, job, isPolling, error: restoreError, startPolling, setJobStatus } = useRestoreProgress();

  const fetchArtwork = useCallback(async () => {
    if (!id || !userId) return;
    const { data: artworkData } = await supabase.from("Artwork").select("id,title,originalImageUrl,restoredImageUrl,status").eq("id", id).single();
    if (!artworkData) { router.push("/"); return; }
    setArtwork(artworkData);
    if (artworkData.restoredImageUrl) {
      setSelectedImage(artworkData.restoredImageUrl);
    } else {
      setSelectedImage(artworkData.originalImageUrl);
    }
    setLoading(false);
  }, [id, userId, router]);

  useEffect(() => { fetchArtwork(); }, [fetchArtwork]);

  useEffect(() => {
    if (job?.status === "ready" && !isPolling) {
      toast.success("Restoration complete!");
      fetchArtwork();
    }
  }, [job, isPolling, fetchArtwork]);

  const handleRestore = async () => {
    const token = await getToken();
    if (!token) { toast.error("Please sign in"); return; }
    
    setJobStatus({
      id: "starting",
      status: "processing",
      mode: "faithful",
      error: null,
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
    });
    
    toast.info("Restoration started. This may take 1-2 minutes.");
    
    try {
      const res = await fetch(`https://dev.gessa.art/restore`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ artworkId: id }),
      });
      const data = await res.json();
      if (!data.ok) { 
        toast.error(data.error?.message || "Restore failed"); 
        setJobStatus({
          id: "failed",
          status: "failed",
          mode: "faithful",
          error: data.error?.message || "Restore failed",
          createdAt: new Date().toISOString(),
          startedAt: null,
          completedAt: new Date().toISOString(),
        });
        return; 
      }
      
      if (data.job?.status === "ready") {
        setJobStatus({
          id: "done",
          status: "ready",
          mode: "faithful",
          error: null,
          createdAt: new Date().toISOString(),
          startedAt: null,
          completedAt: new Date().toISOString(),
        });
        toast.success("Restoration complete!");
        fetchArtwork();
      }
    } catch (err: any) { 
      toast.error("Network error. Please try again."); 
      setJobStatus({
        id: "failed",
        status: "failed",
        mode: "faithful",
        error: err.message || "Network error",
        createdAt: new Date().toISOString(),
        startedAt: null,
        completedAt: new Date().toISOString(),
      });
    }
  };

  const handleKeepOriginal = () => {
    setSelectedImage(artwork?.originalImageUrl || null);
  };

  const handleUseRestored = () => {
    if (artwork?.restoredImageUrl) {
      setSelectedImage(artwork.restoredImageUrl);
    }
  };

  const canPublish = compared && suitable && toolOnly && selectedImage;

  const handlePublish = async () => {
    if (!canPublish || !artwork) return;
    setPublishing(true);
    const { error } = await supabase.from("Artwork").update({
      status: "published",
    }).eq("id", id);
    if (error) { toast.error("Failed to publish"); setPublishing(false); return; }
    toast.success("Artwork published");
    router.push("/");
  };

  const handleSaveDraft = async () => {
    await supabase.from("Artwork").update({ status: "draft" }).eq("id", id);
    toast.success("Saved as draft");
    router.push("/");
  };

  const isRestoring = isPolling || job?.status === "queued" || job?.status === "processing";
  const hasRestored = !!artwork?.restoredImageUrl;

  if (loading) {
    return <ArtworkReviewSkeleton />;
  }
  if (!id || !artwork) {
    if (!id) router.push("/");
    return null;
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <Link href="/" className="mb-6 inline-flex items-center gap-1 text-sm text-stone-600 hover:text-stone-900"><ArrowLeft className="h-4 w-4" />Back to home</Link>
      <h1 className="mb-2 font-serif text-3xl text-stone-900">Review restoration</h1>
      <p className="mb-8 text-sm text-stone-600">Compare the restored image with your physical artwork.</p>

      {isRestoring && (
        <div className="mb-10">
          <RestoreProgressBar 
            progress={progress} 
            status={job?.status || "queued"} 
            error={restoreError}
            originalImage={artwork?.originalImageUrl}
          />
        </div>
      )}

      {!hasRestored && !isRestoring && (
        <div className="mb-10 rounded-sm border border-stone-200 bg-stone-50 p-8 text-center">
          <Sparkles className="mx-auto h-10 w-10 text-stone-400" strokeWidth={1.5} />
          <h2 className="mt-4 font-serif text-xl text-stone-900">Restore your artwork</h2>
          <p className="mt-2 text-sm text-stone-600">Let AI correct perspective, lighting, and color to create a professional digital reproduction.</p>
          <Button onClick={handleRestore} disabled={isRestoring} className="mt-6 bg-stone-900 text-stone-50 hover:bg-stone-800">
            {isRestoring ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Restoring...</> : "Restore artwork"}
          </Button>
        </div>
      )}

      {hasRestored && (
        <>
          <div className="mb-10">
            <BeforeAfterSlider
              beforeImage={artwork.originalImageUrl || ""}
              afterImage={artwork.restoredImageUrl || ""}
              beforeLabel="Original Photo"
              afterLabel="Gessa Restored"
              className="aspect-[4/3] w-full max-w-3xl mx-auto"
            />
            <p className="mt-3 text-center text-xs text-stone-500">
              Drag the slider to compare before and after
            </p>
          </div>

          <div className="mb-10 flex flex-wrap items-center justify-center gap-3">
            <Button variant="outline" onClick={handleRestore} disabled={isRestoring} className="border-stone-200 text-stone-700 hover:bg-stone-100">Regenerate</Button>
            <Button variant="outline" onClick={handleKeepOriginal} className="border-stone-200 hover:bg-stone-100 text-stone-700">Keep original</Button>
            <Button variant="outline" onClick={handleUseRestored} className="border-stone-200 hover:bg-stone-100 text-stone-700">Use restored</Button>
            <Button variant="outline" onClick={handleSaveDraft} className="border-stone-200 text-stone-700 hover:bg-stone-100">Save draft</Button>
          </div>
        </>
      )}
      
      {!hasRestored && selectedImage && !isRestoring && (
        <div className="mb-10">
          <div className="relative aspect-[4/3] w-full max-w-2xl mx-auto overflow-hidden rounded-sm border border-stone-200 bg-stone-100">
            <img src={selectedImage} alt="Selected artwork" className="h-full w-full object-contain" />
          </div>
          <p className="mt-3 text-center text-xs text-stone-500">
            Original photo — no restoration applied
          </p>
        </div>
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
          <p className="text-xs text-stone-500">Gessa provides AI-assisted image processing tools only. AI-restored results may differ from the physical artwork. You are responsible for reviewing and approving the final image.</p>
        </div>
        <Button onClick={handlePublish} disabled={!canPublish || publishing} className="mt-6 w-full bg-stone-900 text-stone-50 hover:bg-stone-800">
          {publishing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Publishing...</> : "Publish artwork"}
        </Button>
      </div>
    </div>
  );
}

export default function ArtworkReviewPage() {
  return <Suspense fallback={<ArtworkReviewSkeleton />}><ReviewContent /></Suspense>;
}
