"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Menu, Upload, LayoutDashboard, Settings, LogOut } from "lucide-react";

export function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [artistSlug, setArtistSlug] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    setUser(data.user);
    if (data.user) {
      const { data: profile } = await supabase.from("ArtistProfile").select("slug").eq("userId", data.user.id).single();
      if (profile) setArtistSlug(profile.slug);
    }
  }, []);

  useEffect(() => { refresh(); const { data: listener } = supabase.auth.onAuthStateChange(() => refresh()); return () => listener.subscription.unsubscribe(); }, [refresh]);

  const handleSignOut = async () => { await supabase.auth.signOut(); setUser(null); router.push("/"); };
  const isAuthenticated = !!user;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-stone-200 bg-[#fafaf9]/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2"><span className="font-serif text-xl tracking-tight text-stone-900">Gessa</span></Link>
        <nav className="hidden items-center gap-6 md:flex">
          {isAuthenticated && artistSlug && <Link href={`/artist/${artistSlug}`} className="text-sm text-stone-600 hover:text-stone-900">My Gallery</Link>}
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" asChild className="text-stone-600 hover:text-stone-900"><Link href="/artwork/upload"><Upload className="mr-1.5 h-4 w-4" />Upload</Link></Button>
              <div className="relative group">
                <Button variant="ghost" size="sm" className="gap-2 text-stone-600 hover:text-stone-900">
                  <Avatar className="h-6 w-6 border border-stone-300"><AvatarFallback className="bg-stone-200 text-stone-700 text-xs">{user?.user_metadata?.name?.charAt(0) || "U"}</AvatarFallback></Avatar>
                  <span className="max-w-[120px] truncate text-sm">{user?.user_metadata?.name || user?.email}</span>
                </Button>
                <div className="absolute right-0 top-full hidden w-48 rounded-md border border-stone-200 bg-white py-1 shadow-md group-hover:block">
                  <Link href="/dashboard" className="flex items-center gap-2 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"><LayoutDashboard className="h-4 w-4" />Dashboard</Link>
                  <Link href="/settings/profile" className="flex items-center gap-2 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"><Settings className="h-4 w-4" />Settings</Link>
                  <div className="my-1 h-px bg-stone-100" />
                  <button onClick={handleSignOut} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"><LogOut className="h-4 w-4" />Sign out</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" asChild className="text-stone-600 hover:text-stone-900"><Link href="/auth/signin">Sign in</Link></Button>
              <Button size="sm" asChild className="bg-stone-900 text-stone-50 hover:bg-stone-800"><Link href="/auth/register">Get started</Link></Button>
            </div>
          )}
        </nav>
        <button className="md:hidden p-2 text-stone-600 hover:text-stone-900" onClick={() => setMobileOpen(!mobileOpen)}><Menu className="h-5 w-5" /></button>
      </div>
      {mobileOpen && (
        <div className="md:hidden border-t border-stone-200 bg-[#fafaf9] px-4 py-4">
          <nav className="flex flex-col gap-3">
            {isAuthenticated ? (
              <>
                <Link href="/dashboard" className="flex items-center gap-2 text-sm text-stone-600" onClick={() => setMobileOpen(false)}><LayoutDashboard className="h-4 w-4" />Dashboard</Link>
                <Link href="/artwork/upload" className="flex items-center gap-2 text-sm text-stone-600" onClick={() => setMobileOpen(false)}><Upload className="h-4 w-4" />Upload artwork</Link>
                <Link href="/settings/profile" className="flex items-center gap-2 text-sm text-stone-600" onClick={() => setMobileOpen(false)}><Settings className="h-4 w-4" />Settings</Link>
                <button onClick={() => { handleSignOut(); setMobileOpen(false); }} className="flex items-center gap-2 text-sm text-red-600"><LogOut className="h-4 w-4" />Sign out</button>
              </>
            ) : (
              <>
                <Link href="/auth/signin" className="text-sm text-stone-600" onClick={() => setMobileOpen(false)}>Sign in</Link>
                <Link href="/auth/register" className="text-sm text-stone-900 font-medium" onClick={() => setMobileOpen(false)}>Get started</Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
