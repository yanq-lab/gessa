"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { GallerySkeleton } from "@/components/loading-skeletons";

interface Artwork { id: string; title: string; year: string | null; medium: string | null; publishedImageUrl: string | null; artistProfileId: string; }

export default function GalleryPage() {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("Artwork").select("id,title,year,medium,publishedImageUrl,artistProfileId").eq("status", "published").order("createdAt", { ascending: false }).then(({ data }) => {
      setArtworks(data ?? []);
      setLoading(false);
    });
  }, []);

  if (loading) return <GallerySkeleton />;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="mb-2 font-serif text-3xl text-stone-900">Gallery</h1>
      <p className="mb-8 text-sm text-stone-600">Published artworks restored with Gessa.</p>
      {artworks.length === 0 ? (
        <div className="flex flex-col items-center py-24 text-center">
          <p className="text-sm text-stone-500">No published artworks yet.</p>
          <Link href="/artwork/upload" className="mt-4 text-sm text-stone-900 underline underline-offset-4">Upload your first artwork</Link>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {artworks.map(artwork => (
            <Link key={artwork.id} href={"/artwork/review?id=" + artwork.id} className="group flex flex-col gap-2">
              <div className="relative aspect-[3/4] overflow-hidden rounded-sm border border-stone-200 bg-stone-100">
                {artwork.publishedImageUrl ? (
                  <img src={artwork.publishedImageUrl} alt={artwork.title} className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]" />
                ) : (
                  <div className="flex h-full items-center justify-center text-stone-300 text-sm">No image</div>
                )}
              </div>
              <p className="text-sm font-medium text-stone-900">{artwork.title}</p>
              {artwork.year && <p className="text-xs text-stone-500">{artwork.year}{artwork.medium ? " · " + artwork.medium : ""}</p>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
