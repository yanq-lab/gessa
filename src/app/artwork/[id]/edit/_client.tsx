"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Artwork { id: string; title: string; year: string | null; medium: string | null; dimensions: string | null; description: string | null; price: string | null; availabilityStatus: string; originalImageUrl: string | null; publishedImageUrl: string | null; }

export default function ArtworkEditPage() {
  const params = useParams(); const router = useRouter(); const id = params.id as string;
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [deleting, setDeleting] = useState(false); const [form, setForm] = useState<Partial<Artwork>>({});

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("Artwork").select("id, title, year, medium, dimensions, description, price, availabilityStatus, originalImageUrl, publishedImageUrl").eq("id", id).single();
      if (!data) { toast.error("Artwork not found"); router.push("/dashboard"); return; }
      setForm(data); setLoading(false);
    }
    load();
  }, [id, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const { error } = await supabase.from("Artwork").update({
      title: form.title, year: form.year || null, medium: form.medium || null, dimensions: form.dimensions || null,
      description: form.description || null, price: form.price || null, availabilityStatus: form.availabilityStatus,
    }).eq("id", id);
    if (error) toast.error("Failed to update"); else toast.success("Artwork updated");
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this artwork?")) return;
    setDeleting(true);
    const { error } = await supabase.from("Artwork").delete().eq("id", id);
    if (error) toast.error("Failed to delete"); else { toast.success("Artwork deleted"); router.push("/artworks"); }
    setDeleting(false);
  };

  if (loading) return <div className="mx-auto flex w-full max-w-2xl items-center justify-center px-4 py-24 sm:px-6"><Loader2 className="h-6 w-6 animate-spin text-stone-400" /></div>;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6">
      <Link href="/artworks" className="mb-6 inline-flex items-center gap-1 text-sm text-stone-600 hover:text-stone-900"><ArrowLeft className="h-4 w-4" />Back to artworks</Link>
      <h1 className="mb-8 font-serif text-3xl text-stone-900">Edit artwork</h1>
      {form.publishedImageUrl && <div className="mb-6"><img src={form.publishedImageUrl} alt={form.title || "Artwork"} className="aspect-[4/3] w-full rounded-sm border border-stone-200 object-contain bg-stone-100" /></div>}
      <form onSubmit={handleSubmit} className="space-y-5">
        <Card className="border-stone-200 shadow-none">
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2"><Label htmlFor="title">Title</Label><Input id="title" value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} required className="border-stone-200 focus-visible:ring-stone-400" /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="year">Year</Label><Input id="year" value={form.year || ""} onChange={(e) => setForm({ ...form, year: e.target.value })} className="border-stone-200 focus-visible:ring-stone-400" /></div>
              <div className="space-y-2"><Label htmlFor="medium">Medium</Label><Input id="medium" value={form.medium || ""} onChange={(e) => setForm({ ...form, medium: e.target.value })} className="border-stone-200 focus-visible:ring-stone-400" /></div>
            </div>
            <div className="space-y-2"><Label htmlFor="dimensions">Dimensions</Label><Input id="dimensions" value={form.dimensions || ""} onChange={(e) => setForm({ ...form, dimensions: e.target.value })} className="border-stone-200 focus-visible:ring-stone-400" /></div>
            <div className="space-y-2"><Label htmlFor="description">Description</Label><Textarea id="description" value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} className="border-stone-200 focus-visible:ring-stone-400 resize-none" /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="price">Price</Label><Input id="price" value={form.price || ""} onChange={(e) => setForm({ ...form, price: e.target.value })} className="border-stone-200 focus-visible:ring-stone-400" /></div>
              <div className="space-y-2"><Label htmlFor="availability">Availability</Label>
                <select id="availability" value={form.availabilityStatus || "available"} onChange={(e) => setForm({ ...form, availabilityStatus: e.target.value })} className="flex h-9 w-full rounded-md border border-stone-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-400">
                  <option value="available">Available</option><option value="sold">Sold</option><option value="not for sale">Not for sale</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" className="bg-stone-900 text-stone-50 hover:bg-stone-800" disabled={saving}>{saving ? "Saving..." : "Save changes"}</Button>
          <Button variant="outline" asChild className="border-stone-200 text-stone-700 hover:bg-stone-100"><Link href="/artworks">Cancel</Link></Button>
          <Button variant="outline" onClick={handleDelete} disabled={deleting} className="ml-auto border-red-200 text-red-600 hover:bg-red-50"><Trash2 className="mr-2 h-4 w-4" />{deleting ? "Deleting..." : "Delete"}</Button>
        </div>
      </form>
    </div>
  );
}
