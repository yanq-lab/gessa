"use client";
import { useState, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const refCode = searchParams.get("ref");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setLoading(true);
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
    if (signUpError) { setError(signUpError.message); setLoading(false); return; }
    if (data.user) {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const profileData: Record<string, unknown> = { userId: data.user.id, displayName: name, slug };
      if (refCode) {
        profileData.referredBy = refCode;
        const { data: referrer } = await supabase.from("ArtistProfile").select("userId").eq("referralCode", refCode).single();
        if (referrer) {
          await supabase.from("Referral").insert({ referrerId: referrer.userId, refereeId: data.user.id, status: "completed" });
        }
      }
      await supabase.from("ArtistProfile").insert(profileData);
    }
    setLoading(false);
    router.push("/settings/profile");
  };

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col justify-center px-4 py-16 sm:px-6">
      <Card className="border-stone-200 bg-white shadow-none">
        <CardHeader className="space-y-1"><CardTitle className="text-center font-serif text-2xl font-normal text-stone-900">Get started</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2"><Label htmlFor="name" className="text-stone-700">Name</Label><Input id="name" value={name} onChange={(e) => setName(e.target.value)} required className="border-stone-200 focus-visible:ring-stone-400" /></div>
            <div className="space-y-2"><Label htmlFor="email" className="text-stone-700">Email</Label><Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="border-stone-200 focus-visible:ring-stone-400" /></div>
            <div className="space-y-2"><Label htmlFor="password" className="text-stone-700">Password</Label><Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="border-stone-200 focus-visible:ring-stone-400" /></div>
            {refCode && <p className="text-sm text-stone-500">Referred by: {refCode}</p>}
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full bg-stone-900 text-stone-50 hover:bg-stone-800" disabled={loading}>{loading ? "Creating account..." : "Create account"}</Button>
          </form>
          <p className="mt-4 text-center text-sm text-stone-600">Already have an account? <Link href="/auth/signin" className="text-stone-900 underline underline-offset-4">Sign in</Link></p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function RegisterPage() {
  return <Suspense fallback={<div className="mx-auto flex w-full max-w-sm flex-col justify-center px-4 py-16 sm:px-6"><div className="h-64 animate-pulse rounded-sm bg-stone-100" /></div>}><RegisterForm /></Suspense>;
}
