"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setError(error.message); setLoading(false); return; }
      router.push("/dashboard");
    } catch (err: any) {
      setError(err?.message || "Network error. Please check your connection.");
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col justify-center px-4 py-16 sm:px-6">
      <Card className="border-stone-200 bg-white shadow-none">
        <CardHeader className="space-y-1"><CardTitle className="text-center font-serif text-2xl font-normal text-stone-900">Sign in</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2"><Label htmlFor="email" className="text-stone-700">Email</Label><Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="border-stone-200 focus-visible:ring-stone-400" /></div>
            <div className="space-y-2"><Label htmlFor="password" className="text-stone-700">Password</Label><Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="border-stone-200 focus-visible:ring-stone-400" /></div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full bg-stone-900 text-stone-50 hover:bg-stone-800" disabled={loading}>{loading ? "Signing in..." : "Sign in"}</Button>
          </form>
          <p className="mt-4 text-center text-sm text-stone-600">Don&apos;t have an account? <Link href="/auth/register" className="text-stone-900 underline underline-offset-4">Get started</Link></p>
        </CardContent>
      </Card>
    </div>
  );
}
