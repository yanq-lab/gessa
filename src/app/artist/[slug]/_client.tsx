"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ImageIcon, Mail, Globe, Loader2 } from "lucide-react";

function InstagramIcon({ className }: { className?: string }) {
  return (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="20" height="20" x="2" y="2" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" x2="17.51" y1="6.5" y2="6.5" /></svg>);
}

interface ArtworkItem { id: string; title: string; slug: string; year: string | null; medium: string | null; dimensions: string | null; publishedImageUrl: string | null; availabilityStatus: string; }
interface Artist { id: string; displayName: string; slug: string; bio: string | null; location: string | null; avatarUrl: string | null; websiteUrl: string | null; instagramUrl: string | null; artworks: ArtworkItem[]; }

export default function ArtistPublicPage() {
  const params = useParams(); const slug = params.slug as string;
  const [artist, setArtist] = useState<Artist | null>(null); const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: profile } = await supabase.from("ArtistProfile").select("id, displayName, slug, bio, location, avatarUrl, websiteUrl, instagramUrl").eq("slug", slug).single();
      if (!profile) { setLoading(false); return; }
      const { data: artworks } = await supabase.from("Artwork").select("id, title, slug, year, medium, dimensions, publishedImageUrl, availabilityStatus").eq("artistProfileId", profile.id).eq("status", "published").order("createdAt", { ascending: false });
      setArtist({ ...profile, artworks: artworks ?? [] }); setLoading(false);
    }
    load();
  }, [slug]);

  if (loading) return <div className="mx-auto flex w-full max-w-6xl items-center justify-center px-4 py-24 sm:px-6"><Loader2 className="h-6 w-6 animate-spin text-stone-400" /></div>;
  if (!artist) return <div className="mx-auto w-full max-w-6xl px-4 py-24 text-center sm:px-6"><p className="text-stone-600">Artist not found.</p><Button asChild variant="link" className="mt-4 text-stone-900"><Link href="/">Return home</Link></Button></div>;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <div className="mb-12 flex flex-col items-start gap-6 sm:flex-row sm:items-center">
        <Avatar className="h-20 w-20 border border-stone-300">
          {artist.avatarUrl ? <img src={artist.avatarUrl} alt={artist.displayName} /> : <AvatarFallback className="bg-stone-200 font-serif text-2xl text-stone-700">{artist.displayName.charAt(0)}</AvatarFallback>}
        </Avatar>
        <div className="flex-1">
          <h1 className="font-serif text-3xl text-stone-900">{artist.displayName}</h1>
          {artist.location && <p className="mt-1 text-sm text-stone-500">{artist.location}</p>}
          {artist.bio && <p className="mt-3 max-w-xl text-sm leading-relaxed text-stone-700">{artist.bio}</p>}
          <div className="mt-4 flex flex-wrap gap-3">
            <Button variant="outline" size="sm" className="border-stone-300 text-stone-700 hover:bg-stone-100" asChild><Link href={`/artwork/inquiry?artist=${artist.id}`}><Mail className="mr-2 h-4 w-4" />Contact</Link></Button>
            {artist.websiteUrl && <Button variant="ghost" size="sm" asChild className="text-stone-600 hover:text-stone-900"><a href={artist.websiteUrl} target="_blank" rel="noopener noreferrer"><Globe className="mr-2 h-4 w-4" />Website</a></Button>}
            {artist.instagramUrl && <Button variant="ghost" size="sm" asChild className="text-stone-600 hover:text-stone-900"><a href={artist.instagramUrl} target="_blank" rel="noopener noreferrer"><InstagramIcon className="mr-2 h-4 w-4" />Instagram</a></Button>}
          </div>
        </div>
      </div>
      {artist.artworks.length === 0 ? (
        <div className="py-16 text-center"><ImageIcon className="mx-auto h-8 w-8 text-stone-400" strokeWidth={1.5} /><p className="mt-3 text-sm text-stone-600">No published artworks yet.</p></div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {artist.artworks.map((artwork) => (
            <Link key={artwork.id} href={`/work/${artwork.slug}`} className="group flex flex-col gap-2">
              <div className="relative aspect-[3/4] overflow-hidden rounded-sm border border-stone-200 bg-stone-100">
                {artwork.publishedImageUrl ? <img src={artwork.publishedImageUrl} alt={artwork.title} className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]" /> : <div className="flex h-full items-center justify-center"><ImageIcon className="h-6 w-6 text-stone-300" strokeWidth={1.5} /></div>}
              </div>
              <div>
                <p className="text-sm font-medium text-stone-900 group-hover:text-stone-700 transition-colors">{artwork.title}</p>
                <p className="text-xs text-stone-500">{artwork.year} {artwork.medium && `· ${artwork.medium}`}</p>
                {artwork.dimensions && <p className="text-xs text-stone-400">{artwork.dimensions}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
