"use client";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const SUPABASE_URL = "https://khqngwvvcoosqgtpmdan.supabase.co";
const ANON_KEY = "sb_publishable_fA9fti-EZ5v7hVvVvhm-tg_QsUzhM5E";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: {
          "apikey": ANON_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, gotrue_meta_security: {} }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error_description || data.msg || data.error || "Sign in failed");
        setLoading(false);
        return;
      }

      if (!data.access_token) {
        setError("Login failed. No token returned.");
        setLoading(false);
        return;
      }

      localStorage.setItem(
        `sb-${new URL(SUPABASE_URL).hostname.split(".")[0]}-auth-token`,
        JSON.stringify({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_at: data.expires_at,
          expires_in: data.expires_in,
          token_type: data.token_type,
          user: data.user,
        })
      );

      toast.success("Signed in successfully!");
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 300);
    } catch (err: any) {
      setError(err?.message || "Network error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col justify-center px-4 py-16 sm:px-6">
      <Card className="border-stone-200 bg-white shadow-none">
        <CardHeader className="space-y-1">
          <CardTitle className="text-center font-serif text-2xl font-normal text-stone-900">Sign in</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-stone-700">Email</Label>
              <Input 
                id="email" 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                className="border-stone-200 focus-visible:ring-stone-400" 
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-stone-700">Password</Label>
                <Link href="/auth/forgot-password" className="text-xs text-stone-500 hover:text-stone-700 underline underline-offset-2">Forgot password?</Link>
              </div>
              <Input 
                id="password" 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                className="border-stone-200 focus-visible:ring-stone-400" 
              />
            </div>
            {error && (
              <div className="rounded-sm bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}
            
            <Button 
              type="submit" 
              className="w-full bg-stone-900 text-stone-50 hover:bg-stone-800" 
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-stone-600">
            Don&apos;t have an account?{" "}
            <Link href="/auth/register" className="text-stone-900 underline underline-offset-4">Get started</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
