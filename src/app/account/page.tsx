"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Loader2, ImageIcon, CreditCard } from "lucide-react";
import { toast } from "sonner";

interface Artwork {
  id: string;
  title: string;
  originalImageUrl: string | null;
  restoredImageUrl: string | null;
  status: string;
  createdAt: string;
}

export default function AccountPage() {
  const { getToken, userId } = useAuth();
  const [credits, setCredits] = useState<number | null>(null);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!userId) return;
      try {
        const token = await getToken();
        if (!token) return;

        // Fetch credits
        const creditsRes = await fetch("https://dev.gessa.art/credits", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const creditsData = await creditsRes.json();
        if (creditsData.ok) {
          setCredits(creditsData.credits);
        }

        // Fetch artworks
        const artworksRes = await fetch("https://dev.gessa.art/artworks", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const artworksData = await artworksRes.json();
        if (artworksData.ok) {
          setArtworks(artworksData.artworks || []);
        }
      } catch {
        toast.error("Failed to load account data");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [userId, getToken]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-stone-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="font-serif text-3xl text-stone-900">Account</h1>

      {/* Credits card */}
      <div className="mt-8 rounded-sm border border-stone-200 bg-stone-50 p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-stone-500">Available credits</div>
            <div className="mt-1 text-4xl font-serif text-stone-900">{credits ?? 0}</div>
          </div>
          <Button asChild className="bg-stone-900 text-stone-50 hover:bg-stone-800">
            <Link href="/pricing">
              <CreditCard className="mr-2 h-4 w-4" />Buy credits
            </Link>
          </Button>
        </div>
      </div>

      {/* Artworks */}
      <div className="mt-8">
        <h2 className="font-serif text-xl text-stone-900">Your artworks</h2>
        {artworks.length === 0 ? (
          <div className="mt-4 rounded-sm border border-stone-200 p-8 text-center">
            <ImageIcon className="mx-auto h-8 w-8 text-stone-400" />
            <p className="mt-2 text-sm text-stone-600">No artworks yet.</p>
            <Button asChild className="mt-4 bg-stone-900 text-stone-50 hover:bg-stone-800">
              <Link href="/artwork/upload">Upload your first artwork</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {artworks.map((artwork) => (
              <Link
                key={artwork.id}
                href={`/artwork/review?id=${artwork.id}`}
                className="group rounded-sm border border-stone-200 p-4 hover:border-stone-400"
              >
                <div className="aspect-[4/3] overflow-hidden rounded-sm bg-stone-100">
                  <img
                    src={artwork.originalImageUrl || ""}
                    alt={artwork.title}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="font-medium text-stone-900">{artwork.title || "Untitled"}</span>
                  <span className={`text-xs ${
                    artwork.status === "ready" ? "text-green-600" : "text-stone-500"
                  }`}>
                    {artwork.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
