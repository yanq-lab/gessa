"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function ProfileSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [form, setForm] = useState({ displayName: "", slug: "", bio: "", location: "", websiteUrl: "", instagramUrl: "" });

  const loadProfile = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { router.push("/auth/signin"); return; }
    setUser(userData.user);
    const { data: profile } = await supabase.from("ArtistProfile").select("id, displayName, slug, bio, location, websiteUrl, instagramUrl").eq("userId", userData.user.id).single();
    if (profile) {
      setProfileId(profile.id);
      setForm({ displayName: profile.displayName || "", slug: profile.slug || "", bio: profile.bio || "", location: profile.location || "", websiteUrl: profile.websiteUrl || "", instagramUrl: profile.instagramUrl || "" });
    }
    setLoading(false);
  }, [router]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    if (!user) { toast.error("Not signed in"); setSaving(false); return; }
    const payload = { userId: user.id, displayName: form.displayName, slug: form.slug, bio: form.bio || null, location: form.location || null, websiteUrl: form.websiteUrl || null, instagramUrl: form.instagramUrl || null };
    let error;
    if (profileId) { const { error: updateError } = await supabase.from("ArtistProfile").update(payload).eq("id", profileId); error = updateError; }
    else { const { error: insertError } = await supabase.from("ArtistProfile").insert(payload); error = insertError; }
    if (error) toast.error(error.message || "Failed to save profile"); else { toast.success("Profile saved"); if (!profileId) loadProfile(); }
    setSaving(false);
  };

  if (loading) return <div className="mx-auto flex w-full max-w-2xl items-center justify-center px-4 py-24 sm:px-6"><Loader2 className="h-6 w-6 animate-spin text-stone-400" /></div>;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6">
      <Link href="/dashboard" className="mb-6 inline-flex items-center gap-1 text-sm text-stone-600 hover:text-stone-900"><ArrowLeft className="h-4 w-4" />Back to dashboard</Link>
      <h1 className="mb-8 font-serif text-3xl text-stone-900">Artist Profile</h1>
      <Card className="border-stone-200 shadow-none">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2"><Label htmlFor="displayName" className="text-stone-700">Display name *</Label><Input id="displayName" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} required className="border-stone-200 focus-visible:ring-stone-400" /></div>
            <div className="space-y-2"><Label htmlFor="slug" className="text-stone-700">Gallery URL slug *</Label>
              <div className="flex items-center gap-2"><span className="text-sm text-stone-500">gessa.com/artist/</span><Input id="slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} required className="border-stone-200 focus-visible:ring-stone-400" placeholder="your-name" /></div>
              <p className="text-xs text-stone-500">Lowercase letters, numbers, and hyphens only.</p>
            </div>
            <div className="space-y-2"><Label htmlFor="bio" className="text-stone-700">Bio</Label><Textarea id="bio" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={4} className="border-stone-200 focus-visible:ring-stone-400 resize-none" /></div>
            <div className="space-y-2"><Label htmlFor="location" className="text-stone-700">Location</Label><Input id="location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="border-stone-200 focus-visible:ring-stone-400" /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="websiteUrl" className="text-stone-700">Website</Label><Input id="websiteUrl" value={form.websiteUrl} onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })} className="border-stone-200 focus-visible:ring-stone-400" placeholder="https://..." /></div>
              <div className="space-y-2"><Label htmlFor="instagramUrl" className="text-stone-700">Instagram</Label><Input id="instagramUrl" value={form.instagramUrl} onChange={(e) => setForm({ ...form, instagramUrl: e.target.value })} className="border-stone-200 focus-visible:ring-stone-400" placeholder="https://instagram.com/..." /></div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" className="bg-stone-900 text-stone-50 hover:bg-stone-800" disabled={saving}>{saving ? "Saving..." : "Save profile"}</Button>
              <Button variant="outline" asChild className="border-stone-200 text-stone-700 hover:bg-stone-100"><Link href="/dashboard">Cancel</Link></Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
