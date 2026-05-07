"use client";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles, ShieldAlert, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ArtworkReviewSkeleton } from "@/components/loading-skeletons";
import { useRestoreProgress } from "@/hooks/use-restore-progress";
import { RestoreProgressBar } from "@/components/restore-progress-bar";
import { BeforeAfterSlider } from "@/components/before-after-slider";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://khqngwvvcoosqgtpmdan.supabase.co";

interface Artwork { id: string; title: string; year: string | null; medium: string | null; originalImageUrl: string | null; status: string; artistProfileId: string; slug: string; }
interface ImageVersion { id: string; type: string; url: string; createdAt: string; metadata: { mode?: string; model?: string; quality?: string } | null; }

function ReviewContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get("id");

  const [artwork, setArtwork] = useState<Artwork | null>(null);
  const [versions, setVersions] = useState<ImageVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [selectedVersionType, setSelectedVersionType] = useState<string | null>(null);
  const [compared, setCompared] = useState(false);
  const [suitable, setSuitable] = useState(false);
  const [toolOnly, setToolOnly] = useState(false);
  const [mode, setMode] = useState<"faithful" | "gallery">("faithful");

  const { progress, job, isPolling, error: restoreError, startPolling, setJobStatus } = useRestoreProgress();

  const latestRestored = artwork?.restoredImageUrl 
    ? { id: "restored", type: "restored", url: artwork.restoredImageUrl, createdAt: new Date().toISOString(), metadata: null }
    : versions.filter(v => v.type === "restored").sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  const fetchArtwork = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { window.location.href = "/auth/signin"; return; }
    const { data: artworkData } = await supabase.from("Artwork").select("*").eq("id", id).single();
    if (!artworkData) { window.location.href = "/dashboard"; return; }
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
    } else if (artworkData.restoredImageUrl) {
      setSelectedImage(artworkData.restoredImageUrl);
      setSelectedVersionType("restored");
    } else {
      setSelectedImage(artworkData.originalImageUrl);
    }
    setLoading(false);
  }, [id, router]);

  useEffect(() => { fetchArtwork(); }, [fetchArtwork]);

  // Auto-refresh when restore completes
  useEffect(() => {
    if (job?.status === "ready" && !isPolling) {
      toast.success("Restoration complete!");
      fetchArtwork();
    }
  }, [job, isPolling, fetchArtwork]);

  const handleRestore = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { toast.error("Please sign in"); return; }
    
    // Immediately show progress bar with "starting" state
    setJobStatus({
      id: "starting",
      status: "processing",
      mode,
      error: null,
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
    });
    
    toast.info("Restoration started. This may take 1-2 minutes.");
    
    try {
      const res = await fetch(`https://dev.gessa.art/restore`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ artworkId: id, mode }),
      });
      const data = await res.json();
      if (!data.ok) { 
        toast.error(data.error?.message || "Restore failed"); 
        setJobStatus({
          id: "failed",
          status: "failed",
          mode,
          error: data.error?.message || "Restore failed",
          createdAt: new Date().toISOString(),
          startedAt: null,
          completedAt: new Date().toISOString(),
        });
        return; 
      }
      
      // Worker processes synchronously and returns final result
      if (data.job?.status === "ready") {
        setJobStatus({
          id: "done",
          status: "ready",
          mode: data.job.mode || mode,
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
        mode,
        error: err.message || "Network error",
        createdAt: new Date().toISOString(),
        startedAt: null,
        completedAt: new Date().toISOString(),
      });
    }
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
    window.location.href = "/dashboard";
  };

  const handleSaveDraft = async () => {
    await supabase.from("Artwork").update({ status: "draft" }).eq("id", id);
    toast.success("Saved as draft");
    router.push("/dashboard");
  };

  const isRestoring = isPolling || job?.status === "queued" || job?.status === "processing";

  if (loading) {
    return <ArtworkReviewSkeleton />;
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

      {isRestoring && (
        <div className="mb-10">
          <RestoreProgressBar 
            progress={progress} 
            status={job?.status || "queued"} 
            error={restoreError} 
          />
        </div>
      )}

      {!latestRestored && !isRestoring && (
        <div className="mb-10 rounded-sm border border-stone-200 bg-stone-50 p-8 text-center">
          <Sparkles className="mx-auto h-10 w-10 text-stone-400" strokeWidth={1.5} />
          <h2 className="mt-4 font-serif text-xl text-stone-900">Review your artwork</h2>
          <p className="mt-2 text-sm text-stone-600">Choose how you want to proceed with this artwork.</p>
          
          <div className="mt-6 grid gap-4 sm:grid-cols-2 max-w-lg mx-auto">
            <div className="rounded-sm border border-stone-200 bg-white p-4 text-left">
              <h3 className="font-medium text-stone-900">Restore with AI</h3>
              <p className="mt-1 text-xs text-stone-500">Let Gessa automatically correct perspective, lighting, and color.</p>
              <div className="mt-3">
                <select value={mode} onChange={(e) => setMode(e.target.value as "faithful" | "gallery")} className="h-8 w-full rounded-md border border-stone-200 bg-white px-2 py-1 text-xs text-stone-700">
                  <option value="faithful">Faithful — preserve original</option>
                  <option value="gallery">Gallery — clean presentation</option>
                </select>
              </div>
              <Button onClick={handleRestore} disabled={isRestoring} className="mt-3 w-full bg-stone-900 text-stone-50 hover:bg-stone-800 text-xs">
                {isRestoring ? <><Loader2 className="mr-1 h-3 w-3 animate-spin" />Restoring...</> : "Restore artwork"}
              </Button>
            </div>
            
            <div className="rounded-sm border border-stone-200 bg-white p-4 text-left">
              <h3 className="font-medium text-stone-900">Publish as-is</h3>
              <p className="mt-1 text-xs text-stone-500">Skip restoration and publish the original photo directly.</p>
              <Button 
                variant="outline" 
                onClick={() => { setSelectedImage(artwork?.originalImageUrl || null); setSelectedVersionType("original"); toast.info("Scroll down to publish"); }} 
                className="mt-6 w-full border-stone-200 text-stone-700 hover:bg-stone-100 text-xs"
              >
                Use original photo
              </Button>
            </div>
          </div>
        </div>
      )}

      {latestRestored && (
        <>
          <div className="mb-10">
            <BeforeAfterSlider
              beforeImage={artwork.originalImageUrl || ""}
              afterImage={latestRestored.url}
              beforeLabel="Original Photo"
              afterLabel="Gessa Restored"
              className="aspect-[4/3] w-full max-w-3xl mx-auto"
            />
            <p className="mt-3 text-center text-xs text-stone-500">
              Drag the slider to compare before and after
            </p>
          </div>

          <div className="mb-10 flex flex-wrap items-center justify-center gap-3">
            <Button variant="outline" onClick={handleRegenerate} disabled={isRestoring} className="border-stone-200 text-stone-700 hover:bg-stone-100">Regenerate</Button>
            <Button variant="outline" onClick={handleKeepOriginal} className={`border-stone-200 hover:bg-stone-100 ${selectedVersionType === "original" ? "bg-stone-100 text-stone-900" : "text-stone-700"}`}>Keep original</Button>
            <Button variant="outline" onClick={handleUseRestored} className={`border-stone-200 hover:bg-stone-100 ${selectedVersionType === "restored" ? "bg-stone-100 text-stone-900" : "text-stone-700"}`}>Use restored version</Button>
            <Button variant="outline" onClick={handleSaveDraft} className="border-stone-200 text-stone-700 hover:bg-stone-100">Save draft</Button>
          </div>
        </>
      )}
      
      {!latestRestored && selectedImage && !isRestoring && (
        <div className="mb-10">
          <div className="relative aspect-[4/3] w-full max-w-2xl mx-auto overflow-hidden rounded-sm border border-stone-200 bg-stone-100">
            <img src={selectedImage} alt="Selected artwork" className="h-full w-full object-contain" />
          </div>
          <p className="mt-3 text-center text-xs text-stone-500">
            Original photo — no restoration applied
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <Button variant="outline" onClick={() => { setSelectedImage(null); setSelectedVersionType(null); }} className="border-stone-200 text-stone-700 hover:bg-stone-100 text-xs">
              Change selection
            </Button>
          </div>
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
  return <Suspense fallback={<ArtworkReviewSkeleton />}><ReviewContent /></Suspense>;
}
