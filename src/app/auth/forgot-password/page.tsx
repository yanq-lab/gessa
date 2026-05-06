"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (error) {
        toast.error(error.message);
      } else {
        setSent(true);
        toast.success("Check your email for the reset link");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to send reset email");
    }
    setLoading(false);
  };

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col justify-center px-4 py-16 sm:px-6">
      <Card className="border-stone-200 bg-white shadow-none">
        <CardHeader className="space-y-1">
          <CardTitle className="text-center font-serif text-2xl font-normal text-stone-900">
            Reset password
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-stone-600">
                We&apos;ve sent a password reset link to <strong>{email}</strong>.
              </p>
              <p className="text-xs text-stone-500">
                Check your inbox and follow the instructions. The link expires in 1 hour.
              </p>
              <Button asChild variant="outline" className="w-full border-stone-200">
                <Link href="/auth/signin">Back to sign in</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-stone-700">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="border-stone-200 focus-visible:ring-stone-400"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-stone-900 text-stone-50 hover:bg-stone-800"
                disabled={loading}
              >
                {loading ? "Sending..." : "Send reset link"}
              </Button>
            </form>
          )}
          <p className="mt-4 text-center text-sm text-stone-600">
            Remember your password?{" "}
            <Link href="/auth/signin" className="text-stone-900 underline underline-offset-4">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
