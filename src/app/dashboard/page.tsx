"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, ExternalLink, ImageIcon, Loader2 } from "lucide-react";

interface Artwork { id: string; title: string; year: string | null; medium: string | null; status: string; publishedImageUrl: string | null; originalImageUrl: string | null; }
interface Profile { id: string; slug: string | null; displayName: string | null; }

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { router.push("/auth/signin"); return; }
    const { data: profileData } = await supabase.from("ArtistProfile").select("id, slug, displayName").eq("userId", userData.user.id).single();
    setProfile(profileData);
    const { data: artworksData } = await supabase.from("Artwork").select("id, title, year, medium, status, publishedImageUrl, originalImageUrl").eq("artistProfileId", profileData?.id).order("createdAt", { ascending: false });
    setArtworks(artworksData ?? []); setLoading(false);
  }, [router]);

  useEffect(() => { refresh(); const { data: listener } = supabase.auth.onAuthStateChange(() => refresh()); return () => listener.subscription.unsubscribe(); }, [refresh]);

  if (loading) return <div className="mx-auto flex w-full max-w-6xl items-center justify-center px-4 py-24 sm:px-6"><Loader2 className="h-6 w-6 animate-spin text-stone-400" /></div>;

  const publishedCount = artworks.filter((a) => a.status === "published").length;
  const galleryUrl = profile?.slug ? `/artist/${profile.slug}` : null;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="font-serif text-3xl text-stone-900">Dashboard</h1><p className="mt-1 text-sm text-stone-600">Manage your artworks and gallery.</p></div>
        <Button asChild className="bg-stone-900 text-stone-50 hover:bg-stone-800"><Link href="/artwork/upload"><Upload className="mr-2 h-4 w-4" />Upload artwork</Link></Button>
      </div>
      <div className="mb-10 grid gap-4 sm:grid-cols-3">
        <Card className="border-stone-200 shadow-none"><CardContent className="pt-6"><p className="text-sm text-stone-500">Total artworks</p><p className="mt-1 font-serif text-3xl text-stone-900">{artworks.length}</p></CardContent></Card>
        <Card className="border-stone-200 shadow-none"><CardContent className="pt-6"><p className="text-sm text-stone-500">Published</p><p className="mt-1 font-serif text-3xl text-stone-900">{publishedCount}</p></CardContent></Card>
        <Card className="border-stone-200 shadow-none"><CardContent className="pt-6"><p className="text-sm text-stone-500">Profile</p><p className="mt-1 text-sm text-stone-900">{profile ? (galleryUrl ? <Link href={galleryUrl} className="inline-flex items-center gap-1 underline underline-offset-4 hover:text-stone-700">View gallery <ExternalLink className="h-3 w-3" /></Link> : "Complete") : <Link href="/settings/profile" className="underline underline-offset-4 hover:text-stone-700">Set up profile</Link>}</p></CardContent></Card>
      </div>
      <Card className="border-stone-200 shadow-none">
        <CardHeader className="flex flex-row items-center justify-between"><CardTitle className="font-serif text-lg font-normal text-stone-900">My Artworks</CardTitle><Button variant="ghost" size="sm" asChild className="text-stone-600 hover:text-stone-900"><Link href="/artworks">View all</Link></Button></CardHeader>
        <CardContent>
          {artworks.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center"><ImageIcon className="h-8 w-8 text-stone-400" strokeWidth={1.5} /><p className="mt-3 text-sm text-stone-600">No artworks yet.</p><Button asChild variant="link" className="mt-2 text-stone-900"><Link href="/artwork/upload">Upload your first artwork</Link></Button></div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {artworks.slice(0, 4).map((artwork) => (
                <Link key={artwork.id} href={`/artwork/${artwork.id}/review`} className="group flex flex-col gap-2">
                  <div className="relative aspect-[3/4] overflow-hidden rounded-sm border border-stone-200 bg-stone-100">
                    {artwork.publishedImageUrl || artwork.originalImageUrl ? (
                      <img src={artwork.publishedImageUrl || artwork.originalImageUrl || ""} alt={artwork.title} className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]" />
                    ) : (<div className="flex h-full items-center justify-center"><ImageIcon className="h-6 w-6 text-stone-300" strokeWidth={1.5} /></div>)}
                    <div className="absolute right-2 top-2"><Badge variant="secondary" className="bg-white/90 text-[10px] font-normal text-stone-700">{artwork.status}</Badge></div>
                  </div>
                  <div><p className="text-sm font-medium text-stone-900">{artwork.title}</p><p className="text-xs text-stone-500">{artwork.year} {artwork.medium && `· ${artwork.medium}`}</p></div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
