"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ImageIcon, Loader2, Pencil, Eye } from "lucide-react";

interface Artwork { id: string; title: string; slug: string; year: string | null; medium: string | null; status: string; publishedImageUrl: string | null; originalImageUrl: string | null; }

export default function ArtworksPage() {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { setLoading(false); return; }
    const { data: profile } = await supabase.from("ArtistProfile").select("id").eq("userId", userData.user.id).single();
    if (!profile) { setLoading(false); return; }
    const { data } = await supabase.from("Artwork").select("id, title, slug, year, medium, status, publishedImageUrl, originalImageUrl").eq("artistProfileId", profile.id).order("createdAt", { ascending: false });
    setArtworks(data ?? []); setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="mx-auto flex w-full max-w-6xl items-center justify-center px-4 py-24 sm:px-6"><Loader2 className="h-6 w-6 animate-spin text-stone-400" /></div>;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="font-serif text-3xl text-stone-900">My Artworks</h1><p className="mt-1 text-sm text-stone-600">Manage all your uploaded artworks.</p></div>
        <Button asChild className="bg-stone-900 text-stone-50 hover:bg-stone-800"><Link href="/artwork/upload">Upload new artwork</Link></Button>
      </div>
      <Card className="border-stone-200 shadow-none">
        <CardContent className="pt-6">
          {artworks.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center"><ImageIcon className="h-8 w-8 text-stone-400" strokeWidth={1.5} /><p className="mt-3 text-sm text-stone-600">No artworks yet.</p><Button asChild variant="link" className="mt-2 text-stone-900"><Link href="/artwork/upload">Upload your first artwork</Link></Button></div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {artworks.map((artwork) => (
                <div key={artwork.id} className="group flex flex-col gap-3 rounded-sm border border-stone-200 bg-white p-3">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-sm bg-stone-100">
                    {artwork.publishedImageUrl || artwork.originalImageUrl ? (
                      <img src={artwork.publishedImageUrl || artwork.originalImageUrl || ""} alt={artwork.title} className="h-full w-full object-cover" />
                    ) : (<div className="flex h-full items-center justify-center"><ImageIcon className="h-6 w-6 text-stone-300" strokeWidth={1.5} /></div>)}
                    <div className="absolute right-2 top-2"><Badge variant="secondary" className="bg-white/90 text-[10px] font-normal text-stone-700">{artwork.status}</Badge></div>
                  </div>
                  <div className="flex items-start justify-between">
                    <div><p className="text-sm font-medium text-stone-900">{artwork.title}</p><p className="text-xs text-stone-500">{artwork.year} {artwork.medium && `· ${artwork.medium}`}</p></div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild><Link href={`/artwork/${artwork.id}/edit`}><Pencil className="h-4 w-4 text-stone-500" /></Link></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild><Link href={`/artwork/${artwork.id}/review`}><Eye className="h-4 w-4 text-stone-500" /></Link></Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
