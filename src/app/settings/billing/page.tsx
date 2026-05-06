"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, CreditCard, Loader2 } from "lucide-react";

interface Subscription {
  tier: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
}

export default function BillingSettingsPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const { data } = await supabase.from("Subscription").select("*").eq("userId", session.user.id).order("createdAt", { ascending: false }).limit(1).single();
      setSubscription(data);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-2xl items-center justify-center px-4 py-24">
        <Loader2 className="h-6 w-6 animate-spin text-stone-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6">
      <Link href="/settings/profile" className="mb-6 inline-flex items-center gap-1 text-sm text-stone-600 hover:text-stone-900">
        <ArrowLeft className="h-4 w-4" />Back to settings
      </Link>
      
      <h1 className="mb-8 font-serif text-3xl text-stone-900">Billing</h1>

      <Card className="border-stone-200 shadow-none mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-stone-500">Current plan</p>
              <p className="mt-1 font-serif text-2xl text-stone-900 capitalize">{subscription?.tier || "Free"}</p>
              <p className="mt-1 text-sm text-stone-600">Status: {subscription?.status || "active"}</p>
              {subscription?.currentPeriodEnd && (
                <p className="text-sm text-stone-500">
                  Renews on {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                </p>
              )}
            </div>
            <CreditCard className="h-8 w-8 text-stone-400" />
          </div>
        </CardContent>
      </Card>

      <Card className="border-stone-200 shadow-none">
        <CardContent className="pt-6">
          <h3 className="font-serif text-lg text-stone-900 mb-4">Billing history</h3>
          <p className="text-sm text-stone-500">No billing history available.</p>
          <p className="mt-2 text-xs text-stone-400">Billing history will appear here once you make your first payment.</p>
        </CardContent>
      </Card>

      <div className="mt-6">
        <Button asChild variant="outline" className="border-stone-200">
          <Link href="/pricing">View pricing plans</Link>
        </Button>
      </div>
    </div>
  );
}
