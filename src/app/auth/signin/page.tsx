"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setDebugInfo("Starting sign in...");
    setLoading(true);
    
    try {
      // Check Supabase client is initialized
      if (!supabase) {
        setError("Supabase client not initialized");
        setDebugInfo("Error: Supabase client is null");
        setLoading(false);
        return;
      }

      setDebugInfo("Calling supabase.auth.signInWithPassword...");
      
      const { data, error: signinError } = await supabase.auth.signInWithPassword({ email, password });
      
      setDebugInfo(`Response received. Error: ${signinError?.message || 'none'}`);
      
      if (signinError) {
        setError(signinError.message);
        setLoading(false);
        return;
      }
      
      if (!data?.user) {
        setError("Login failed. No user data returned.");
        setDebugInfo("Error: No user in response data");
        setLoading(false);
        return;
      }
      
      setDebugInfo(`Success! User: ${data.user.email}. Redirecting...`);
      toast.success("Signed in successfully!");
      
      // Small delay to show success message
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 500);
    } catch (err: any) {
      console.error("Sign in error:", err);
      setError(err?.message || "Network error. Please try again.");
      setDebugInfo(`Exception: ${err?.message || 'unknown'}`);
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
            {debugInfo && (
              <div className="text-xs text-stone-400 font-mono break-all">
                {debugInfo}
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
