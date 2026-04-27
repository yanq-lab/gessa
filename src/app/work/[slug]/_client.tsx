"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Mail, ImageIcon, Loader2 } from "lucide-react";

interface Artwork { id: string; title: string; year: string | null; medium: string | null; dimensions: string | null; description: string | null; price: string | null; availabilityStatus: string; publishedImageUrl: string | null; status: string; artistProfileId: string; artistProfile: { displayName: string; slug: string; } | null; }

export default function ArtworkPublicPage() {
  const params = useParams(); const slug = params.slug as string;
  const [artwork, setArtwork] = useState<Artwork | null>(null); const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("Artwork").select("id, title, year, medium, dimensions, description, price, availabilityStatus, publishedImageUrl, status, artistProfileId, artistProfile:artistProfileId(displayName, slug)").eq("slug", slug).eq("status", "published").single();
      if (!data) { setLoading(false); return; }
      const normalized: Artwork = { ...data, artistProfile: Array.isArray(data.artistProfile) ? data.artistProfile[0] || null : data.artistProfile || null };
      setArtwork(normalized); setLoading(false);
    }
    load();
  }, [slug]);

  if (loading) return <div className="mx-auto flex w-full max-w-6xl items-center justify-center px-4 py-24 sm:px-6"><Loader2 className="h-6 w-6 animate-spin text-stone-400" /></div>;
  if (!artwork || artwork.status !== "published" || !artwork.artistProfile) return <div className="mx-auto w-full max-w-6xl px-4 py-24 text-center sm:px-6"><p className="text-stone-600">Artwork not found.</p><Button asChild variant="link" className="mt-4 text-stone-900"><Link href="/">Return home</Link></Button></div>;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <Link href={`/artist/${artwork.artistProfile.slug}`} className="mb-8 inline-flex items-center gap-1 text-sm text-stone-600 hover:text-stone-900"><ArrowLeft className="h-4 w-4" />Back to {artwork.artistProfile.displayName}</Link>
      <div className="grid gap-10 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-sm border border-stone-200 bg-stone-100">
            {artwork.publishedImageUrl ? <img src={artwork.publishedImageUrl} alt={artwork.title} className="h-full w-full object-contain" /> : <div className="flex h-full items-center justify-center"><ImageIcon className="h-8 w-8 text-stone-300" strokeWidth={1.5} /></div>}
          </div>
        </div>
        <div className="flex flex-col">
          <p className="text-xs uppercase tracking-widest text-stone-500">{artwork.artistProfile.displayName}</p>
          <h1 className="mt-2 font-serif text-3xl text-stone-900">{artwork.title}</h1>
          <div className="mt-6 space-y-3">
            {artwork.year && <div className="flex justify-between text-sm"><span className="text-stone-500">Year</span><span className="text-stone-900">{artwork.year}</span></div>}
            {artwork.medium && <div className="flex justify-between text-sm"><span className="text-stone-500">Medium</span><span className="text-stone-900">{artwork.medium}</span></div>}
            {artwork.dimensions && <div className="flex justify-between text-sm"><span className="text-stone-500">Dimensions</span><span className="text-stone-900">{artwork.dimensions}</span></div>}
            <div className="flex justify-between text-sm"><span className="text-stone-500">Availability</span><Badge variant="secondary" className="bg-stone-100 text-stone-700 font-normal text-xs">{artwork.availabilityStatus}</Badge></div>
            {artwork.price && <div className="flex justify-between text-sm"><span className="text-stone-500">Price</span><span className="text-stone-900">{artwork.price}</span></div>}
          </div>
          <Separator className="my-6 bg-stone-200" />
          {artwork.description && <p className="text-sm leading-relaxed text-stone-700">{artwork.description}</p>}
          <div className="mt-8">
            <Button className="bg-stone-900 text-stone-50 hover:bg-stone-800" asChild><Link href={`/artwork/inquiry?artwork=${artwork.id}&artist=${artwork.artistProfileId}`}><Mail className="mr-2 h-4 w-4" />Contact artist</Link></Button>
          </div>
        </div>
      </div>
    </div>
  );
}
